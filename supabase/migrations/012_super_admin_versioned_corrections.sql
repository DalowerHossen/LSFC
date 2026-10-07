-- Phase 1 Super Admin final correction approval.
-- Approved corrections create append-only application revisions and a new receipt version.

alter table public.receipts
  drop constraint receipts_application_id_key;

alter table public.receipts
  add column version smallint not null default 1 check (version > 0);

alter table public.receipts
  add constraint receipts_application_version_unique
  unique (application_id, version);

create table public.application_revisions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete restrict,
  center_id uuid not null references public.centers(id) on delete restrict,
  edit_request_id uuid not null unique references public.edit_requests(id) on delete restrict,
  version smallint not null check (version > 0),
  field_name text not null check (field_name in ('citizen_name', 'citizen_mobile', 'government_fee')),
  previous_value text not null,
  corrected_value text not null,
  approved_by uuid not null references public.profiles(id) on delete restrict,
  approved_at timestamptz not null default now(),
  unique (application_id, version)
);

create index application_revisions_center_created_idx
  on public.application_revisions(center_id, approved_at desc);

alter table public.application_revisions enable row level security;
alter table public.application_revisions force row level security;

create policy application_revisions_tenant_read on public.application_revisions
for select to authenticated
using (center_id = private.current_center_id() or private.is_super_admin());

create policy application_revisions_mfa_gate on public.application_revisions
as restrictive for select to authenticated
using (private.mfa_satisfied());

grant select on public.application_revisions to authenticated;
revoke insert, update, delete on public.application_revisions from anon, authenticated;

create or replace function private.prevent_revision_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Application revisions are immutable';
end;
$$;

create trigger application_revisions_are_immutable
before update or delete on public.application_revisions
for each row execute function private.prevent_revision_mutation();

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
  target_request public.edit_requests%rowtype;
  target_application public.applications%rowtype;
  previous_receipt public.receipts%rowtype;
  change_field text;
  recorded_current text;
  proposed_value text;
  current_value text;
  next_application_version smallint;
  next_receipt_version smallint;
begin
  if not private.is_super_admin() or not private.mfa_satisfied() then
    raise exception 'Super Admin AAL2 authentication required';
  end if;

  select * into target_request
  from public.edit_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Edit request not found';
  end if;

  if target_request.status <> 'pending_super_admin' then
    raise exception 'Invalid request state';
  end if;

  if not approve then
    update public.edit_requests
    set status = 'rejected',
        super_admin_reviewed_by = auth.uid(),
        super_admin_reviewed_at = now(),
        review_note = coalesce(nullif(trim(note), ''), review_note)
    where id = request_id;

    perform private.write_audit_log(
      target_request.center_id,
      'correction.rejected_by_super_admin',
      'edit_request',
      request_id,
      jsonb_build_object('application_id', target_request.entity_id)
    );
    return;
  end if;

  change_field := target_request.requested_changes ->> 'field';
  recorded_current := target_request.requested_changes ->> 'current_value';
  proposed_value := target_request.requested_changes ->> 'proposed_value';

  if change_field not in ('citizen_name', 'citizen_mobile', 'government_fee')
     or recorded_current is null
     or proposed_value is null then
    raise exception 'Correction payload is invalid';
  end if;

  if (change_field = 'citizen_name' and char_length(trim(proposed_value)) not between 2 and 120)
     or (change_field = 'citizen_mobile' and proposed_value !~ '^01[3-9][0-9]{8}$')
     or (
       change_field = 'government_fee'
       and (
         proposed_value !~ '^[0-9]{1,7}([.][0-9]{1,2})?$'
         or recorded_current !~ '^[0-9]{1,7}([.][0-9]{1,2})?$'
         or proposed_value::numeric > 1000000
       )
     ) then
    raise exception 'Proposed correction value is invalid';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(target_request.entity_id::text || ':correction', 0)
  );

  select * into target_application
  from public.applications
  where id = target_request.entity_id
    and center_id = target_request.center_id
  for update;

  if not found then
    raise exception 'Application not found';
  end if;

  if change_field = 'citizen_name' then
    current_value := target_application.citizen_name;
  elsif change_field = 'citizen_mobile' then
    current_value := target_application.citizen_mobile;
  else
    current_value := target_application.government_fee::text;
  end if;

  if (
    change_field = 'government_fee'
    and recorded_current::numeric <> target_application.government_fee
  ) or (
    change_field <> 'government_fee'
    and recorded_current <> current_value
  ) then
    raise exception 'Application changed after this request was created';
  end if;

  select coalesce(max(version), 0) + 1
  into next_application_version
  from public.application_revisions
  where application_id = target_application.id;

  if change_field = 'citizen_name' then
    update public.applications
    set citizen_name = proposed_value
    where id = target_application.id;
  elsif change_field = 'citizen_mobile' then
    update public.applications
    set citizen_mobile = proposed_value
    where id = target_application.id;
  else
    update public.applications
    set government_fee = proposed_value::numeric
    where id = target_application.id;
  end if;

  insert into public.application_revisions (
    application_id,
    center_id,
    edit_request_id,
    version,
    field_name,
    previous_value,
    corrected_value,
    approved_by
  ) values (
    target_application.id,
    target_request.center_id,
    request_id,
    next_application_version,
    change_field,
    current_value,
    proposed_value,
    auth.uid()
  );

  select * into previous_receipt
  from public.receipts
  where application_id = target_application.id
  order by version desc
  limit 1;

  if found then
    next_receipt_version := previous_receipt.version + 1;

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
      issued_at,
      signature_id,
      version
    )
    select
      application.id,
      application.center_id,
      application.receipt_number || '-C' || next_receipt_version::text,
      previous_receipt.center_name,
      previous_receipt.center_address,
      previous_receipt.center_phone,
      previous_receipt.service_name,
      application.citizen_name,
      application.citizen_mobile,
      application.government_fee,
      application.assistance_fee,
      application.additional_fee,
      application.total_fee,
      now(),
      previous_receipt.signature_id,
      next_receipt_version
    from public.applications as application
    where application.id = target_application.id;
  end if;

  update public.edit_requests
  set status = 'approved',
      super_admin_reviewed_by = auth.uid(),
      super_admin_reviewed_at = now(),
      review_note = coalesce(nullif(trim(note), ''), review_note)
  where id = request_id;

  perform private.write_audit_log(
    target_request.center_id,
    'correction.approved_and_applied',
    'edit_request',
    request_id,
    jsonb_build_object(
      'application_id', target_application.id,
      'field', change_field,
      'application_revision', next_application_version,
      'receipt_version', next_receipt_version
    )
  );
end;
$$;

-- Extend privacy-safe verification with receipt version information.
drop function public.verify_receipt(text);

create function public.verify_receipt(p_verification_token text)
returns table (
  is_valid boolean,
  receipt_number text,
  center_name text,
  service_name text,
  total_fee numeric,
  application_status public.application_status,
  issued_at timestamptz,
  receipt_version smallint,
  is_current_version boolean
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
    receipt.issued_at,
    receipt.version,
    receipt.version = (
      select max(latest.version)
      from public.receipts as latest
      where latest.application_id = receipt.application_id
    )
  from public.receipts as receipt
  join public.applications as application on application.id = receipt.application_id
  where receipt.verification_token = p_verification_token;
end;
$$;

revoke execute on function public.verify_receipt(text) from public;
grant execute on function public.verify_receipt(text) to anon, authenticated;

-- Public tracking always presents the latest receipt version number.
create or replace function public.track_application(
  p_tracking_id text,
  p_citizen_mobile text
)
returns table (
  tracking_id text,
  receipt_number text,
  center_name text,
  service_name text,
  application_status public.application_status,
  total_fee numeric,
  submitted_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_tracking_id !~ '^LS-[A-F0-9]{12}$'
     or p_citizen_mobile !~ '^01[3-9][0-9]{8}$' then
    return;
  end if;

  return query
  select
    application.tracking_id,
    latest_receipt.receipt_number,
    center.name,
    service.name_bn,
    application.status,
    application.total_fee,
    application.submitted_at,
    application.completed_at,
    application.updated_at
  from public.applications as application
  join public.centers as center on center.id = application.center_id
  join public.services as service on service.code = application.service_code
  left join lateral (
    select receipt.receipt_number
    from public.receipts as receipt
    where receipt.application_id = application.id
    order by receipt.version desc
    limit 1
  ) as latest_receipt on true
  where application.tracking_id = upper(trim(p_tracking_id))
    and application.citizen_mobile = p_citizen_mobile
  limit 1;
end;
$$;

revoke all on function private.prevent_revision_mutation()
  from public, anon, authenticated;

comment on table public.application_revisions is
  'Append-only history of corrections approved and applied by Super Admin.';
