-- Phase 1 Appendix-6 and Appendix-7 fee management.
-- Current fee tables remain the fast read model; every change is preserved here.

create table public.service_fee_versions (
  id uuid primary key default gen_random_uuid(),
  service_code text not null references public.services(code) on delete restrict,
  location_type public.location_type not null,
  assistance_fee numeric(10, 2) check (assistance_fee is null or assistance_fee between 0 and 1000000),
  extra_page_fee numeric(10, 2) not null check (extra_page_fee between 0 and 1000000),
  reason text not null check (char_length(reason) between 10 and 500),
  changed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index service_fee_versions_lookup_idx
  on public.service_fee_versions(service_code, location_type, created_at desc);

create table public.license_fee_versions (
  id uuid primary key default gen_random_uuid(),
  location_type public.location_type not null,
  fee numeric(10, 2) not null check (fee between 0 and 1000000),
  reason text not null check (char_length(reason) between 10 and 500),
  changed_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index license_fee_versions_lookup_idx
  on public.license_fee_versions(location_type, created_at desc);

-- Establish the seeded catalogue as version one without inventing an actor.
alter table public.service_fee_versions alter column changed_by drop not null;
alter table public.license_fee_versions alter column changed_by drop not null;
insert into public.service_fee_versions (
  service_code, location_type, assistance_fee, extra_page_fee, reason, changed_by, created_at
)
select service_code, location_type, assistance_fee, extra_page_fee,
  'Initial Appendix-7 fee catalogue', null, updated_at
from public.service_fees;
insert into public.license_fee_versions (
  location_type, fee, reason, changed_by, created_at
)
select location_type, fee, 'Initial Appendix-6 license fee catalogue', null, updated_at
from public.license_fees;

create or replace function private.prevent_fee_history_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Fee history is append-only';
end;
$$;
create trigger service_fee_versions_are_immutable
before update or delete on public.service_fee_versions
for each row execute function private.prevent_fee_history_mutation();
create trigger license_fee_versions_are_immutable
before update or delete on public.license_fee_versions
for each row execute function private.prevent_fee_history_mutation();

alter table public.service_fee_versions enable row level security;
alter table public.service_fee_versions force row level security;
alter table public.license_fee_versions enable row level security;
alter table public.license_fee_versions force row level security;
create policy service_fee_versions_super_read on public.service_fee_versions
for select to authenticated using (private.is_super_admin() and private.mfa_satisfied());
create policy license_fee_versions_super_read on public.license_fee_versions
for select to authenticated using (private.is_super_admin() and private.mfa_satisfied());
grant select on public.service_fee_versions, public.license_fee_versions to authenticated;

create or replace function public.update_service_fee(
  p_service_code text,
  p_location_type public.location_type,
  p_assistance_fee numeric,
  p_extra_page_fee numeric,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  old_fee public.service_fees%rowtype;
begin
  if not private.is_super_admin() or not private.mfa_satisfied() then
    raise exception 'Super Admin AAL2 authentication required';
  end if;
  if p_assistance_fee is null or p_assistance_fee not between 0 and 1000000
     or p_extra_page_fee is null or p_extra_page_fee not between 0 and 1000000 then
    raise exception 'Fees must be between 0 and 1000000';
  end if;
  if char_length(trim(p_reason)) not between 10 and 500 then
    raise exception 'A reason of 10 to 500 characters is required';
  end if;

  select * into old_fee from public.service_fees
  where service_code = p_service_code and location_type = p_location_type
  for update;
  if not found then raise exception 'Service fee not found'; end if;
  if old_fee.assistance_fee is not distinct from p_assistance_fee
     and old_fee.extra_page_fee = p_extra_page_fee then
    raise exception 'Fee values are unchanged';
  end if;

  update public.service_fees set assistance_fee = p_assistance_fee,
    extra_page_fee = p_extra_page_fee, effective_from = current_date
  where service_code = p_service_code and location_type = p_location_type;
  insert into public.service_fee_versions
    (service_code, location_type, assistance_fee, extra_page_fee, reason, changed_by)
  values (p_service_code, p_location_type, p_assistance_fee, p_extra_page_fee, trim(p_reason), auth.uid());
  perform private.write_audit_log(null, 'fee.appendix7_changed', 'service_fee', null,
    jsonb_build_object('service_code', p_service_code, 'location_type', p_location_type,
      'old_assistance_fee', old_fee.assistance_fee, 'new_assistance_fee', p_assistance_fee,
      'old_extra_page_fee', old_fee.extra_page_fee, 'new_extra_page_fee', p_extra_page_fee));
end;
$$;

create or replace function public.update_license_fee(
  p_location_type public.location_type,
  p_fee numeric,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  old_fee public.license_fees%rowtype;
begin
  if not private.is_super_admin() or not private.mfa_satisfied() then
    raise exception 'Super Admin AAL2 authentication required';
  end if;
  if p_fee is null or p_fee not between 0 and 1000000 then
    raise exception 'Fee must be between 0 and 1000000';
  end if;
  if char_length(trim(p_reason)) not between 10 and 500 then
    raise exception 'A reason of 10 to 500 characters is required';
  end if;

  select * into old_fee from public.license_fees
  where location_type = p_location_type for update;
  if not found then raise exception 'License fee not found'; end if;
  if old_fee.fee = p_fee then raise exception 'Fee value is unchanged'; end if;

  update public.license_fees set fee = p_fee, effective_from = current_date
  where location_type = p_location_type;
  insert into public.license_fee_versions (location_type, fee, reason, changed_by)
  values (p_location_type, p_fee, trim(p_reason), auth.uid());
  perform private.write_audit_log(null, 'fee.appendix6_changed', 'license_fee', null,
    jsonb_build_object('location_type', p_location_type, 'old_fee', old_fee.fee, 'new_fee', p_fee));
end;
$$;

revoke execute on function public.update_service_fee(text, public.location_type, numeric, numeric, text) from public, anon;
revoke execute on function public.update_license_fee(public.location_type, numeric, text) from public, anon;
grant execute on function public.update_service_fee(text, public.location_type, numeric, numeric, text) to authenticated;
grant execute on function public.update_license_fee(public.location_type, numeric, text) to authenticated;
revoke all on function private.prevent_fee_history_mutation() from public, anon, authenticated;

comment on table public.service_fee_versions is 'Immutable Appendix-7 assistance fee revision history.';
comment on table public.license_fee_versions is 'Immutable Appendix-6 license fee revision history.';
