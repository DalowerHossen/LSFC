-- Phase 1 immutable customer receipts and privacy-safe public verification.

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete restrict,
  center_id uuid not null references public.centers(id) on delete restrict,
  receipt_number text not null unique,
  verification_token text not null unique default encode(gen_random_bytes(32), 'hex')
    check (verification_token ~ '^[a-f0-9]{64}$'),
  center_name text not null,
  center_address text not null,
  center_phone text not null,
  service_name text not null,
  citizen_name text not null,
  citizen_mobile text not null,
  government_fee numeric(12, 2) not null check (government_fee >= 0),
  assistance_fee numeric(12, 2) not null check (assistance_fee >= 0),
  additional_fee numeric(12, 2) not null check (additional_fee >= 0),
  total_fee numeric(12, 2) not null check (total_fee >= 0),
  issued_at timestamptz not null default now()
);

create index receipts_center_issued_idx
  on public.receipts(center_id, issued_at desc);

create or replace function private.create_application_receipt()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  generated_receipt_number text;
begin
  generated_receipt_number := coalesce(
    new.receipt_number,
    'R-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' ||
      upper(encode(gen_random_bytes(8), 'hex'))
  );

  insert into public.receipts (
    application_id,
    center_id,
    receipt_number,
    center_name,
    center_address,
    center_phone,
    service_name,
    citizen_name,
    citizen_mobile,
    government_fee,
    assistance_fee,
    additional_fee,
    total_fee,
    issued_at
  )
  select
    new.id,
    new.center_id,
    generated_receipt_number,
    center.name,
    center.address,
    center.phone,
    service.name_bn,
    new.citizen_name,
    new.citizen_mobile,
    new.government_fee,
    new.assistance_fee,
    new.additional_fee,
    new.total_fee,
    coalesce(new.submitted_at, new.created_at)
  from public.centers as center
  join public.services as service on service.code = new.service_code
  where center.id = new.center_id;

  perform private.write_audit_log(
    new.center_id,
    'receipt.issued',
    'application',
    new.id,
    jsonb_build_object('receipt_number', generated_receipt_number)
  );

  return new;
end;
$$;

create trigger applications_create_immutable_receipt
after insert on public.applications
for each row execute function private.create_application_receipt();

-- Backfill a receipt snapshot for applications created before this migration.
insert into public.receipts (
  application_id,
  center_id,
  receipt_number,
  center_name,
  center_address,
  center_phone,
  service_name,
  citizen_name,
  citizen_mobile,
  government_fee,
  assistance_fee,
  additional_fee,
  total_fee,
  issued_at
)
select
  app.id,
  app.center_id,
  coalesce(
    app.receipt_number,
    'R-' || to_char(app.created_at, 'YYYYMMDD') || '-' ||
      upper(encode(gen_random_bytes(8), 'hex'))
  ),
  center.name,
  center.address,
  center.phone,
  service.name_bn,
  app.citizen_name,
  app.citizen_mobile,
  app.government_fee,
  app.assistance_fee,
  app.additional_fee,
  app.total_fee,
  coalesce(app.submitted_at, app.created_at)
from public.applications as app
join public.centers as center on center.id = app.center_id
join public.services as service on service.code = app.service_code
on conflict (application_id) do nothing;

create or replace function private.prevent_receipt_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Receipt snapshots are immutable';
end;
$$;

create trigger receipts_are_immutable
before update or delete on public.receipts
for each row execute function private.prevent_receipt_mutation();

alter table public.receipts enable row level security;
alter table public.receipts force row level security;

create policy receipts_tenant_read on public.receipts
for select to authenticated
using (center_id = private.current_center_id() or private.is_super_admin());

create policy receipts_mfa_gate on public.receipts
as restrictive for select to authenticated
using (private.mfa_satisfied());

grant select on public.receipts to authenticated;
revoke insert, update, delete on public.receipts from anon, authenticated;

-- Returns only non-personal fields required to establish receipt authenticity.
create or replace function public.verify_receipt(p_verification_token text)
returns table (
  is_valid boolean,
  receipt_number text,
  center_name text,
  service_name text,
  total_fee numeric,
  application_status public.application_status,
  issued_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_verification_token !~ '^[a-f0-9]{64}$' then
    return;
  end if;

  return query
  select
    true,
    receipt.receipt_number,
    receipt.center_name,
    receipt.service_name,
    receipt.total_fee,
    application.status,
    receipt.issued_at
  from public.receipts as receipt
  join public.applications as application on application.id = receipt.application_id
  where receipt.verification_token = p_verification_token;
end;
$$;

revoke execute on function public.verify_receipt(text) from public;
grant execute on function public.verify_receipt(text) to anon, authenticated;

revoke all on function private.create_application_receipt() from public, anon, authenticated;
revoke all on function private.prevent_receipt_mutation() from public, anon, authenticated;

comment on table public.receipts is
  'Immutable receipt snapshots. Personal fields are tenant-only and never returned by public verification.';
