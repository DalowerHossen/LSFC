-- Phase 1 Super Admin center approval and lifecycle management.
-- Centers are never deleted; every status transition is retained permanently.

create table public.center_status_history (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete restrict,
  previous_status public.center_status,
  new_status public.center_status not null,
  reason text not null check (char_length(reason) between 5 and 1000),
  changed_by uuid not null references public.profiles(id) on delete restrict,
  changed_at timestamptz not null default now()
);

create index center_status_history_center_changed_idx
  on public.center_status_history(center_id, changed_at desc);

alter table public.center_status_history enable row level security;
alter table public.center_status_history force row level security;

create policy center_status_history_read on public.center_status_history
for select to authenticated
using (center_id = private.current_center_id() or private.is_super_admin());

create policy center_status_history_mfa_gate on public.center_status_history
as restrictive for select to authenticated
using (private.mfa_satisfied());

grant select on public.center_status_history to authenticated;
revoke insert, update, delete on public.center_status_history from anon, authenticated;

create or replace function private.prevent_center_history_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Center status history is immutable';
end;
$$;

create trigger center_status_history_is_immutable
before update or delete on public.center_status_history
for each row execute function private.prevent_center_history_mutation();

create or replace function public.create_center(
  p_code text,
  p_name text,
  p_location_type public.location_type,
  p_division text,
  p_district text,
  p_upazila text,
  p_union_or_ward text,
  p_address text,
  p_phone text,
  p_email text default null,
  p_license_number text default null,
  p_license_expires_at date default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  new_center_id uuid;
begin
  if not private.is_super_admin() or not private.mfa_satisfied() then
    raise exception 'Super Admin AAL2 authentication required';
  end if;

  if upper(trim(p_code)) !~ '^LSFC-[A-Z0-9-]{3,24}$'
     or char_length(trim(p_name)) not between 3 and 160
     or char_length(trim(p_division)) not between 2 and 80
     or char_length(trim(p_district)) not between 2 and 80
     or char_length(trim(p_upazila)) not between 2 and 80
     or char_length(trim(p_address)) not between 5 and 500
     or p_phone !~ '^01[3-9][0-9]{8}$'
     or (p_email is not null and p_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+[.][A-Z]{2,}$') then
    raise exception 'Center information is invalid';
  end if;

  insert into public.centers (
    code, name, location_type, division, district, upazila,
    union_or_ward, address, phone, email, license_number,
    license_expires_at, status
  ) values (
    upper(trim(p_code)), trim(p_name), p_location_type, trim(p_division),
    trim(p_district), trim(p_upazila), nullif(trim(p_union_or_ward), ''),
    trim(p_address), p_phone, nullif(lower(trim(p_email)), ''),
    nullif(trim(p_license_number), ''), p_license_expires_at, 'pending'
  )
  returning id into new_center_id;

  insert into public.center_status_history (
    center_id, previous_status, new_status, reason, changed_by
  ) values (
    new_center_id, null, 'pending', 'Super Admin created center record', auth.uid()
  );

  perform private.write_audit_log(
    new_center_id,
    'center.created',
    'center',
    new_center_id,
    jsonb_build_object('code', upper(trim(p_code)), 'status', 'pending')
  );

  return new_center_id;
end;
$$;

create or replace function public.transition_center_status(
  p_center_id uuid,
  p_target_status public.center_status,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  current_status public.center_status;
begin
  if not private.is_super_admin() or not private.mfa_satisfied() then
    raise exception 'Super Admin AAL2 authentication required';
  end if;

  if char_length(trim(p_reason)) not between 5 and 1000 then
    raise exception 'A reason of 5 to 1000 characters is required';
  end if;

  select status into current_status
  from public.centers
  where id = p_center_id
  for update;

  if not found then
    raise exception 'Center not found';
  end if;

  if current_status = p_target_status then
    raise exception 'Center already has this status';
  end if;

  if not (
    (current_status = 'pending' and p_target_status in ('active', 'blocked'))
    or (current_status = 'active' and p_target_status in ('suspended', 'blocked'))
    or (current_status = 'suspended' and p_target_status in ('active', 'blocked'))
    or (current_status = 'blocked' and p_target_status = 'active')
  ) then
    raise exception 'Invalid center status transition';
  end if;

  update public.centers
  set status = p_target_status
  where id = p_center_id;

  insert into public.center_status_history (
    center_id, previous_status, new_status, reason, changed_by
  ) values (
    p_center_id, current_status, p_target_status, trim(p_reason), auth.uid()
  );

  perform private.write_audit_log(
    p_center_id,
    'center.status_changed',
    'center',
    p_center_id,
    jsonb_build_object(
      'previous_status', current_status,
      'new_status', p_target_status
    )
  );
end;
$$;

revoke execute on function public.create_center(
  text, text, public.location_type, text, text, text, text,
  text, text, text, text, date
) from public, anon;
revoke execute on function public.transition_center_status(uuid, public.center_status, text)
  from public, anon;
grant execute on function public.create_center(
  text, text, public.location_type, text, text, text, text,
  text, text, text, text, date
) to authenticated;
grant execute on function public.transition_center_status(uuid, public.center_status, text)
  to authenticated;

revoke all on function private.prevent_center_history_mutation()
  from public, anon, authenticated;

comment on table public.center_status_history is
  'Append-only center lifecycle history. Centers are never deleted.';
