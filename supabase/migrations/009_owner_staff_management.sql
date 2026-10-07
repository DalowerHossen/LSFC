-- Phase 1 Owner staff management.
-- Staff accounts are never deleted; access is activated/deactivated with an audit trail.

alter table public.profiles
  add column email text,
  add column staff_code text,
  add column designation text,
  add column joined_on date;

update public.profiles as profile
set email = auth_user.email
from auth.users as auth_user
where auth_user.id = profile.id;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, email, full_name, phone, role, center_id)
  values (
    new.id,
    new.email,
    case
      when char_length(trim(new.raw_user_meta_data ->> 'full_name')) >= 2
        then left(trim(new.raw_user_meta_data ->> 'full_name'), 120)
      else 'নতুন ব্যবহারকারী'
    end,
    case
      when trim(new.raw_user_meta_data ->> 'phone') ~ '^01[3-9][0-9]{8}$'
        then trim(new.raw_user_meta_data ->> 'phone')
      else null
    end,
    'operator',
    null
  );
  return new;
end;
$$;

create unique index profiles_center_staff_code_unique
  on public.profiles(center_id, staff_code)
  where staff_code is not null;

create or replace function public.assign_invited_staff(
  p_user_id uuid,
  p_full_name text,
  p_phone text,
  p_designation text default 'কম্পিউটার অপারেটর'
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_center uuid;
  generated_staff_code text;
  target_role public.user_role;
  target_existing_center uuid;
begin
  if private.current_role() <> 'owner' or not private.mfa_satisfied() then
    raise exception 'Owner AAL2 authentication required';
  end if;

  target_center := private.current_center_id();
  if target_center is null then
    raise exception 'No center is assigned';
  end if;

  if char_length(trim(p_full_name)) not between 2 and 120
     or p_phone !~ '^01[3-9][0-9]{8}$'
     or char_length(trim(p_designation)) not between 2 and 80 then
    raise exception 'Invalid staff information';
  end if;

  select role, center_id
  into target_role, target_existing_center
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Invited profile was not created';
  end if;

  if target_role <> 'operator' or target_existing_center is not null then
    raise exception 'Account is already assigned or has a privileged role';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_center::text || ':staff-code', 0));

  loop
    generated_staff_code := 'OP-' || upper(encode(gen_random_bytes(4), 'hex'));
    exit when not exists (
      select 1 from public.profiles
      where center_id = target_center and staff_code = generated_staff_code
    );
  end loop;

  update public.profiles
  set center_id = target_center,
      full_name = trim(p_full_name),
      phone = p_phone,
      designation = trim(p_designation),
      staff_code = generated_staff_code,
      joined_on = current_date,
      is_active = true
  where id = p_user_id;

  perform private.write_audit_log(
    target_center,
    'staff.assigned',
    'profile',
    p_user_id,
    jsonb_build_object('staff_code', generated_staff_code, 'designation', trim(p_designation))
  );

  return generated_staff_code;
end;
$$;

create or replace function public.set_staff_access(
  p_profile_id uuid,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_center uuid;
  staff_center uuid;
  staff_role public.user_role;
begin
  if private.current_role() <> 'owner' or not private.mfa_satisfied() then
    raise exception 'Owner AAL2 authentication required';
  end if;

  target_center := private.current_center_id();

  select center_id, role
  into staff_center, staff_role
  from public.profiles
  where id = p_profile_id
  for update;

  if not found or staff_center <> target_center or staff_role <> 'operator' then
    raise exception 'Staff account not found in this center';
  end if;

  update public.profiles
  set is_active = p_is_active
  where id = p_profile_id;

  perform private.write_audit_log(
    target_center,
    case when p_is_active then 'staff.activated' else 'staff.deactivated' end,
    'profile',
    p_profile_id,
    jsonb_build_object('is_active', p_is_active)
  );
end;
$$;

revoke execute on function public.assign_invited_staff(uuid, text, text, text)
  from public, anon;
revoke execute on function public.set_staff_access(uuid, boolean)
  from public, anon;
grant execute on function public.assign_invited_staff(uuid, text, text, text)
  to authenticated;
grant execute on function public.set_staff_access(uuid, boolean)
  to authenticated;

comment on function public.set_staff_access(uuid, boolean) is
  'Activates or deactivates an Operator without deleting account or history.';
