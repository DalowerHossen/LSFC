-- LSFC-MS Phase 1: tenant-safe core schema
-- All destructive actions are intentionally omitted. Corrections must use edit_requests.

create extension if not exists pgcrypto;
create schema if not exists private;

create type public.user_role as enum ('super_admin', 'owner', 'operator');
create type public.center_status as enum ('pending', 'active', 'suspended', 'blocked');
create type public.location_type as enum ('union_upazila', 'pourashava', 'city_corporation_savar');
create type public.application_status as enum ('draft', 'submitted', 'in_progress', 'completed', 'cancelled_by_approval');
create type public.edit_request_status as enum ('pending_owner', 'pending_super_admin', 'approved', 'rejected');

create table public.centers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^LSFC-[A-Z0-9-]{3,24}$'),
  name text not null check (char_length(name) between 3 and 160),
  location_type public.location_type not null,
  division text not null,
  district text not null,
  upazila text not null,
  union_or_ward text,
  address text not null,
  phone text not null check (phone ~ '^01[3-9][0-9]{8}$'),
  email text,
  license_number text unique,
  license_expires_at date,
  status public.center_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete restrict,
  center_id uuid references public.centers(id) on delete restrict,
  role public.user_role not null default 'operator',
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text check (phone is null or phone ~ '^01[3-9][0-9]{8}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint super_admin_has_no_center check (
    (role = 'super_admin' and center_id is null)
    or (role <> 'super_admin')
  )
);

create unique index one_owner_per_center
  on public.profiles(center_id)
  where role = 'owner' and is_active = true;
create index profiles_center_id_idx on public.profiles(center_id);

create table public.services (
  code text primary key,
  name_bn text not null,
  description_bn text,
  sort_order smallint not null unique check (sort_order between 1 and 14),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_fees (
  service_code text not null references public.services(code) on delete restrict,
  location_type public.location_type not null,
  assistance_fee numeric(10, 2) check (assistance_fee is null or assistance_fee >= 0),
  extra_page_fee numeric(10, 2) not null default 0 check (extra_page_fee >= 0),
  effective_from date not null default current_date,
  updated_at timestamptz not null default now(),
  primary key (service_code, location_type)
);

create table public.license_fees (
  location_type public.location_type primary key,
  fee numeric(10, 2) not null check (fee >= 0),
  effective_from date not null default current_date,
  updated_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete restrict,
  service_code text not null references public.services(code) on delete restrict,
  tracking_id text not null unique default ('LS-' || upper(encode(gen_random_bytes(6), 'hex'))),
  receipt_number text unique,
  citizen_name text not null check (char_length(citizen_name) between 2 and 120),
  citizen_mobile text not null check (citizen_mobile ~ '^01[3-9][0-9]{8}$'),
  consent_received boolean not null default false,
  status public.application_status not null default 'draft',
  government_fee numeric(12, 2) not null default 0 check (government_fee >= 0),
  assistance_fee numeric(12, 2) not null default 0 check (assistance_fee >= 0),
  additional_fee numeric(12, 2) not null default 0 check (additional_fee >= 0),
  total_fee numeric(12, 2) generated always as (government_fee + assistance_fee + additional_fee) stored,
  created_by uuid not null references public.profiles(id) on delete restrict,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint completion_time_required check (
    (status = 'completed' and completed_at is not null)
    or status <> 'completed'
  )
);

create index applications_center_created_idx on public.applications(center_id, created_at desc);
create index applications_center_status_idx on public.applications(center_id, status);
create index applications_tracking_mobile_idx on public.applications(tracking_id, citizen_mobile);

create table public.edit_requests (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete restrict,
  entity_type text not null check (entity_type in ('application', 'profile', 'center', 'transaction')),
  entity_id uuid not null,
  reason text not null check (char_length(reason) between 10 and 1000),
  requested_changes jsonb not null check (jsonb_typeof(requested_changes) = 'object'),
  status public.edit_request_status not null default 'pending_owner',
  requested_by uuid not null references public.profiles(id) on delete restrict,
  owner_reviewed_by uuid references public.profiles(id) on delete restrict,
  owner_reviewed_at timestamptz,
  super_admin_reviewed_by uuid references public.profiles(id) on delete restrict,
  super_admin_reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index edit_requests_center_status_idx on public.edit_requests(center_id, status, created_at desc);

create table public.audit_logs (
  sequence_number bigint generated always as identity primary key,
  id uuid not null unique default gen_random_uuid(),
  center_id uuid references public.centers(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  previous_hash text,
  entry_hash text not null unique,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_center_created_idx on public.audit_logs(center_id, created_at desc);

-- Shared timestamp trigger
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger centers_set_updated_at before update on public.centers
for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger services_set_updated_at before update on public.services
for each row execute function private.set_updated_at();
create trigger service_fees_set_updated_at before update on public.service_fees
for each row execute function private.set_updated_at();
create trigger license_fees_set_updated_at before update on public.license_fees
for each row execute function private.set_updated_at();
create trigger applications_set_updated_at before update on public.applications
for each row execute function private.set_updated_at();
create trigger edit_requests_set_updated_at before update on public.edit_requests
for each row execute function private.set_updated_at();

-- A new Auth account starts as an unassigned operator. Privileged roles are assigned only by trusted server workflows.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, full_name, phone, role, center_id)
  values (
    new.id,
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

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- Security-definer helpers avoid recursive profile RLS checks.
create or replace function private.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select role from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function private.current_center_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select center_id from public.profiles where id = auth.uid() and is_active = true;
$$;

create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(private.current_role() = 'super_admin', false);
$$;

create or replace function private.is_center_manager(target_center uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    private.is_super_admin()
    or (
      private.current_role() = 'owner'
      and private.current_center_id() = target_center
    ),
    false
  );
$$;

-- Hash-chained audit entries. Writes are serialized per center to prevent chain forks.
create or replace function private.write_audit_log(
  target_center uuid,
  action_name text,
  target_type text,
  target_id uuid,
  safe_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  prior_hash text;
  created_time timestamptz := clock_timestamp();
  calculated_hash text;
begin
  perform pg_advisory_xact_lock(hashtextextended(coalesce(target_center::text, 'global'), 0));

  select entry_hash into prior_hash
  from public.audit_logs
  where center_id is not distinct from target_center
  order by sequence_number desc
  limit 1;

  calculated_hash := encode(
    digest(
      coalesce(prior_hash, '') || '|' ||
      coalesce(auth.uid()::text, 'system') || '|' ||
      action_name || '|' || target_type || '|' ||
      coalesce(target_id::text, '') || '|' ||
      created_time::text || '|' || safe_metadata::text,
      'sha256'
    ),
    'hex'
  );

  insert into public.audit_logs (
    center_id, actor_id, action, entity_type, entity_id,
    metadata, previous_hash, entry_hash, created_at
  ) values (
    target_center, auth.uid(), action_name, target_type, target_id,
    safe_metadata, prior_hash, calculated_hash, created_time
  );
end;
$$;

create or replace function private.audit_application_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if tg_op = 'INSERT' then
    perform private.write_audit_log(
      new.center_id, 'application.created', 'application', new.id,
      jsonb_build_object('service_code', new.service_code, 'status', new.status)
    );
  elsif tg_op = 'UPDATE' then
    perform private.write_audit_log(
      new.center_id, 'application.updated', 'application', new.id,
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger applications_write_audit
after insert or update on public.applications
for each row execute function private.audit_application_change();

create or replace function private.prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Audit records are immutable';
end;
$$;

create trigger audit_logs_are_immutable
before update or delete on public.audit_logs
for each row execute function private.prevent_audit_mutation();

-- Row Level Security is enabled and forced on all application tables.
alter table public.centers enable row level security;
alter table public.centers force row level security;
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.services enable row level security;
alter table public.services force row level security;
alter table public.service_fees enable row level security;
alter table public.service_fees force row level security;
alter table public.license_fees enable row level security;
alter table public.license_fees force row level security;
alter table public.applications enable row level security;
alter table public.applications force row level security;
alter table public.edit_requests enable row level security;
alter table public.edit_requests force row level security;
alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

-- Public service catalogue and fee chart
create policy services_public_read on public.services
for select to anon, authenticated
using (is_active = true);

create policy services_super_admin_read on public.services
for select to authenticated
using (private.is_super_admin());

create policy service_fees_public_read on public.service_fees
for select to anon, authenticated
using (true);

create policy license_fees_public_read on public.license_fees
for select to anon, authenticated
using (true);

-- Tenant policies
create policy centers_tenant_read on public.centers
for select to authenticated
using (id = private.current_center_id() or private.is_super_admin());

create policy centers_super_insert on public.centers
for insert to authenticated
with check (private.is_super_admin());

create policy centers_safe_update on public.centers
for update to authenticated
using (private.is_center_manager(id))
with check (private.is_center_manager(id));

create policy profiles_tenant_read on public.profiles
for select to authenticated
using (
  id = auth.uid()
  or (center_id is not null and center_id = private.current_center_id())
  or private.is_super_admin()
);

create policy profiles_self_update on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy applications_tenant_read on public.applications
for select to authenticated
using (center_id = private.current_center_id() or private.is_super_admin());

create policy applications_tenant_insert on public.applications
for insert to authenticated
with check (
  center_id = private.current_center_id()
  and created_by = auth.uid()
  and private.current_role() in ('owner', 'operator')
);

create policy applications_workflow_update on public.applications
for update to authenticated
using (center_id = private.current_center_id() or private.is_super_admin())
with check (center_id = private.current_center_id() or private.is_super_admin());

create policy edit_requests_tenant_read on public.edit_requests
for select to authenticated
using (
  requested_by = auth.uid()
  or private.is_center_manager(center_id)
);

create policy edit_requests_tenant_insert on public.edit_requests
for insert to authenticated
with check (
  center_id = private.current_center_id()
  and requested_by = auth.uid()
);

create policy audit_logs_manager_read on public.audit_logs
for select to authenticated
using (private.is_center_manager(center_id) or private.is_super_admin());

-- Approval transitions are exposed as narrow RPCs; direct edit-request updates stay blocked.
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

-- Least-privilege grants. There are intentionally no DELETE grants.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.services, public.service_fees, public.license_fees to anon, authenticated;
grant select on public.centers, public.profiles, public.applications, public.edit_requests, public.audit_logs to authenticated;
grant insert on public.centers, public.applications, public.edit_requests to authenticated;
grant update (name, address, phone, email) on public.centers to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant update (status, submitted_at, completed_at) on public.applications to authenticated;
grant usage, select on all sequences in schema public to authenticated;

grant usage on schema private to authenticated;
revoke execute on function private.current_role() from public, anon;
revoke execute on function private.current_center_id() from public, anon;
revoke execute on function private.is_super_admin() from public, anon;
revoke execute on function private.is_center_manager(uuid) from public, anon;
grant execute on function private.current_role() to authenticated;
grant execute on function private.current_center_id() to authenticated;
grant execute on function private.is_super_admin() to authenticated;
grant execute on function private.is_center_manager(uuid) to authenticated;
revoke execute on function private.write_audit_log(uuid, text, text, uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.owner_review_edit_request(uuid, boolean, text) from public, anon;
revoke execute on function public.super_admin_review_edit_request(uuid, boolean, text) from public, anon;
grant execute on function public.owner_review_edit_request(uuid, boolean, text) to authenticated;
grant execute on function public.super_admin_review_edit_request(uuid, boolean, text) to authenticated;

-- The public API must not directly invoke internal trigger helpers.
revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;
revoke all on function private.audit_application_change() from public, anon, authenticated;
revoke all on function private.prevent_audit_mutation() from public, anon, authenticated;

comment on table public.audit_logs is 'Append-only, hash-chained audit records. No role receives UPDATE or DELETE.';
comment on table public.edit_requests is 'All correction requests follow Operator → Owner → Super Admin approval.';
