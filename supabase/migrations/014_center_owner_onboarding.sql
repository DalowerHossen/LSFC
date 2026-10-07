-- Phase 1 privileged Center Owner assignment.
-- Owner roles can only be assigned by an AAL2-authenticated Super Admin.

-- Inactive centers fail the same database security gate used by all operational
-- tables and privileged RPCs. Profile and center identity reads remain available
-- so the app can display the correct Pending/Suspended/Blocked status page.
create or replace function private.mfa_satisfied()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select case
    when private.current_role() = 'super_admin'
      then coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    when private.current_role() = 'owner'
      then coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
        and coalesce((
          select center.status = 'active'
          from public.centers as center
          where center.id = private.current_center_id()
        ), false)
    when private.current_role() = 'operator' then
      coalesce((
        select center.status = 'active'
        from public.centers as center
        where center.id = private.current_center_id()
      ), false)
      and case
        when coalesce((
          select center.operator_2fa_required
          from public.centers as center
          where center.id = private.current_center_id()
        ), false)
          then coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
        else true
      end
    else false
  end;
$$;

create table public.center_owner_assignments (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete restrict,
  owner_profile_id uuid not null references public.profiles(id) on delete restrict,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  ended_at timestamptz,
  end_reason text,
  check (
    (ended_at is null and end_reason is null)
    or (ended_at is not null and char_length(end_reason) between 5 and 1000)
  )
);

create unique index one_current_owner_assignment_per_center
  on public.center_owner_assignments(center_id)
  where ended_at is null;
create index center_owner_assignments_owner_idx
  on public.center_owner_assignments(owner_profile_id, assigned_at desc);

alter table public.center_owner_assignments enable row level security;
alter table public.center_owner_assignments force row level security;

create policy center_owner_assignments_read on public.center_owner_assignments
for select to authenticated
using (center_id = private.current_center_id() or private.is_super_admin());

create policy center_owner_assignments_mfa_gate on public.center_owner_assignments
as restrictive for select to authenticated
using (private.mfa_satisfied());

grant select on public.center_owner_assignments to authenticated;
revoke insert, update, delete on public.center_owner_assignments from anon, authenticated;

create or replace function public.assign_invited_center_owner(
  p_user_id uuid,
  p_center_id uuid,
  p_full_name text,
  p_phone text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_profile public.profiles%rowtype;
  target_center_status public.center_status;
begin
  if not private.is_super_admin() or not private.mfa_satisfied() then
    raise exception 'Super Admin AAL2 authentication required';
  end if;

  if char_length(trim(p_full_name)) not between 2 and 120
     or p_phone !~ '^01[3-9][0-9]{8}$' then
    raise exception 'Owner information is invalid';
  end if;

  select status into target_center_status
  from public.centers
  where id = p_center_id
  for update;

  if not found or target_center_status = 'blocked' then
    raise exception 'Center is unavailable for Owner assignment';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_center_id::text || ':owner', 0));

  if exists (
    select 1 from public.center_owner_assignments
    where center_id = p_center_id and ended_at is null
  ) or exists (
    select 1 from public.profiles
    where center_id = p_center_id and role = 'owner' and is_active = true
  ) then
    raise exception 'Center already has an active Owner';
  end if;

  select * into target_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found
     or target_profile.role <> 'operator'
     or target_profile.center_id is not null then
    raise exception 'Invited account is already assigned or privileged';
  end if;

  update public.profiles
  set center_id = p_center_id,
      role = 'owner',
      full_name = trim(p_full_name),
      phone = p_phone,
      designation = 'কেন্দ্র পরিচালক',
      staff_code = 'OWNER-' || upper(encode(gen_random_bytes(4), 'hex')),
      joined_on = current_date,
      is_active = true
  where id = p_user_id;

  insert into public.center_owner_assignments (
    center_id, owner_profile_id, assigned_by
  ) values (
    p_center_id, p_user_id, auth.uid()
  );

  perform private.write_audit_log(
    p_center_id,
    'center.owner_assigned',
    'profile',
    p_user_id,
    jsonb_build_object('center_id', p_center_id)
  );
end;
$$;

create or replace function private.prevent_owner_assignment_delete()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Owner assignment history cannot be deleted';
end;
$$;

create trigger center_owner_assignments_prevent_delete
before delete on public.center_owner_assignments
for each row execute function private.prevent_owner_assignment_delete();

revoke execute on function public.assign_invited_center_owner(uuid, uuid, text, text)
  from public, anon;
grant execute on function public.assign_invited_center_owner(uuid, uuid, text, text)
  to authenticated;

revoke all on function private.prevent_owner_assignment_delete()
  from public, anon, authenticated;

comment on table public.center_owner_assignments is
  'Versioned Center Owner assignment history. Initial assignment is Super Admin only.';
