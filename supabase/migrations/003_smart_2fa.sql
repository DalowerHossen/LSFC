-- Phase 1 Smart 2FA policy foundation.
-- TOTP is handled by Supabase Auth. This migration stores only center policy,
-- never TOTP secrets or one-time codes.

alter table public.centers
  add column operator_2fa_required boolean not null default false;

-- Enforce MFA at the database boundary, not only in the web interface.
create or replace function private.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select case
    when private.current_role() in ('super_admin', 'owner')
      then coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    when private.current_role() = 'operator' then
      case
        when coalesce(
          (
            select operator_2fa_required
            from public.centers
            where id = private.current_center_id()
          ),
          false
        )
          then coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
        else true
      end
    else false
  end;
$$;

revoke execute on function private.mfa_satisfied() from public, anon;
grant execute on function private.mfa_satisfied() to authenticated;

-- Restrictive policies are combined with existing tenant policies using AND.
-- Profile and center SELECT remain available at AAL1 so the app can determine
-- which MFA step is required, but operational data remains locked.
create policy centers_insert_mfa_gate on public.centers
as restrictive for insert to authenticated
with check (private.mfa_satisfied());

create policy centers_update_mfa_gate on public.centers
as restrictive for update to authenticated
using (private.mfa_satisfied())
with check (private.mfa_satisfied());

create policy profiles_update_mfa_gate on public.profiles
as restrictive for update to authenticated
using (private.mfa_satisfied())
with check (private.mfa_satisfied());

create policy applications_mfa_gate on public.applications
as restrictive for all to authenticated
using (private.mfa_satisfied())
with check (private.mfa_satisfied());

create policy edit_requests_mfa_gate on public.edit_requests
as restrictive for all to authenticated
using (private.mfa_satisfied())
with check (private.mfa_satisfied());

create policy audit_logs_mfa_gate on public.audit_logs
as restrictive for select to authenticated
using (private.mfa_satisfied());

-- Security-definer approval RPCs must also verify AAL2 explicitly.
create or replace function public.owner_review_edit_request(
  request_id uuid,
  forward_to_super_admin boolean,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_request public.edit_requests%rowtype;
begin
  if not private.mfa_satisfied() then
    raise exception 'AAL2 authentication required';
  end if;

  select * into target_request
  from public.edit_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Edit request not found';
  end if;

  if private.current_role() <> 'owner'
     or private.current_center_id() <> target_request.center_id then
    raise exception 'Not authorized';
  end if;

  if target_request.status <> 'pending_owner' then
    raise exception 'Invalid request state';
  end if;

  update public.edit_requests
  set status = case when forward_to_super_admin then 'pending_super_admin' else 'rejected' end,
      owner_reviewed_by = auth.uid(),
      owner_reviewed_at = now(),
      review_note = nullif(trim(note), '')
  where id = request_id;
end;
$$;

create or replace function public.super_admin_review_edit_request(
  request_id uuid,
  approve boolean,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  current_status public.edit_request_status;
begin
  if not private.is_super_admin() then
    raise exception 'Not authorized';
  end if;

  if not private.mfa_satisfied() then
    raise exception 'AAL2 authentication required';
  end if;

  select status into current_status
  from public.edit_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Edit request not found';
  end if;

  if current_status <> 'pending_super_admin' then
    raise exception 'Invalid request state';
  end if;

  update public.edit_requests
  set status = case when approve then 'approved' else 'rejected' end,
      super_admin_reviewed_by = auth.uid(),
      super_admin_reviewed_at = now(),
      review_note = coalesce(nullif(trim(note), ''), review_note)
  where id = request_id;
end;
$$;

create or replace function public.set_operator_2fa_requirement(required boolean)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_center uuid;
begin
  if not private.mfa_satisfied() then
    raise exception 'AAL2 authentication required';
  end if;

  if private.current_role() = 'owner' then
    target_center := private.current_center_id();
  elsif private.is_super_admin() then
    raise exception 'Super Admin must manage center policy through the audited administration workflow';
  else
    raise exception 'Not authorized';
  end if;

  if target_center is null then
    raise exception 'No center is assigned';
  end if;

  update public.centers
  set operator_2fa_required = required
  where id = target_center;

  perform private.write_audit_log(
    target_center,
    'security.operator_2fa_policy_changed',
    'center',
    target_center,
    jsonb_build_object('required', required)
  );
end;
$$;

revoke execute on function public.set_operator_2fa_requirement(boolean) from public, anon;
grant execute on function public.set_operator_2fa_requirement(boolean) to authenticated;

comment on column public.centers.operator_2fa_required is
  'Owner-controlled policy. Super Admin and Owner always require MFA regardless of this value.';
