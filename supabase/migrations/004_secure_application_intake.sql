-- Phase 1 secure application intake.
-- Fee calculation happens inside PostgreSQL so clients cannot alter assistance fees.

revoke insert on public.applications from authenticated;

alter table public.applications
  add column client_request_id uuid not null default gen_random_uuid();

alter table public.applications
  add constraint applications_idempotency_unique
  unique (center_id, created_by, client_request_id);

create or replace function public.create_application(
  p_client_request_id uuid,
  p_service_code text,
  p_citizen_name text,
  p_citizen_mobile text,
  p_government_fee numeric default 0,
  p_scan_page_count integer default 0,
  p_consent_received boolean default false
)
returns table (
  application_id uuid,
  tracking_id text,
  receipt_number text,
  total_fee numeric
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_center_id uuid;
  v_location_type public.location_type;
  v_center_status public.center_status;
  v_assistance_fee numeric(12, 2);
  v_extra_page_fee numeric(12, 2);
  v_additional_fee numeric(12, 2) := 0;
  v_application_id uuid;
  v_tracking_id text;
  v_receipt_number text;
  v_total_fee numeric(12, 2);
begin
  if private.current_role() not in ('owner', 'operator') then
    raise exception 'Not authorized to create applications';
  end if;

  if not private.mfa_satisfied() then
    raise exception 'Required authentication assurance is not satisfied';
  end if;

  v_center_id := private.current_center_id();
  if v_center_id is null then
    raise exception 'No center is assigned';
  end if;

  select location_type, status
  into v_location_type, v_center_status
  from public.centers
  where id = v_center_id;

  if v_center_status <> 'active' then
    raise exception 'Center is not active';
  end if;

  if char_length(trim(p_citizen_name)) not between 2 and 120 then
    raise exception 'Citizen name is invalid';
  end if;

  if p_citizen_mobile !~ '^01[3-9][0-9]{8}$' then
    raise exception 'Citizen mobile number is invalid';
  end if;

  if not p_consent_received then
    raise exception 'Citizen consent is required';
  end if;

  if p_government_fee < 0 or p_government_fee > 1000000 then
    raise exception 'Government fee is outside the accepted range';
  end if;

  if p_scan_page_count < 0 or p_scan_page_count > 500 then
    raise exception 'Scan page count is outside the accepted range';
  end if;

  -- Return the original result when a browser retries the same submission.
  select
    existing_application.id,
    existing_application.tracking_id,
    existing_application.receipt_number,
    existing_application.total_fee
  into v_application_id, v_tracking_id, v_receipt_number, v_total_fee
  from public.applications as existing_application
  where existing_application.center_id = v_center_id
    and existing_application.created_by = auth.uid()
    and existing_application.client_request_id = p_client_request_id;

  if found then
    return query
    select v_application_id, v_tracking_id, v_receipt_number, v_total_fee;
    return;
  end if;

  select sf.assistance_fee, sf.extra_page_fee
  into v_assistance_fee, v_extra_page_fee
  from public.service_fees sf
  join public.services s on s.code = sf.service_code
  where sf.service_code = p_service_code
    and sf.location_type = v_location_type
    and s.is_active = true;

  if not found or v_assistance_fee is null then
    raise exception 'Service fee is not configured';
  end if;

  if p_service_code = 'e-mutation-application' and p_scan_page_count > 20 then
    v_additional_fee := (p_scan_page_count - 20) * v_extra_page_fee;
  end if;

  v_receipt_number :=
    'R-' || to_char(clock_timestamp(), 'YYYYMMDD') || '-' ||
    upper(encode(gen_random_bytes(8), 'hex'));

  insert into public.applications as new_application (
    center_id,
    client_request_id,
    service_code,
    receipt_number,
    citizen_name,
    citizen_mobile,
    consent_received,
    status,
    government_fee,
    assistance_fee,
    additional_fee,
    created_by,
    submitted_at
  ) values (
    v_center_id,
    p_client_request_id,
    p_service_code,
    v_receipt_number,
    trim(p_citizen_name),
    p_citizen_mobile,
    true,
    'submitted',
    p_government_fee,
    v_assistance_fee,
    v_additional_fee,
    auth.uid(),
    now()
  )
  on conflict (center_id, created_by, client_request_id) do nothing
  returning
    new_application.id,
    new_application.tracking_id,
    new_application.receipt_number,
    new_application.total_fee
  into v_application_id, v_tracking_id, v_receipt_number, v_total_fee;

  if v_application_id is null then
    select
      existing_application.id,
      existing_application.tracking_id,
      existing_application.receipt_number,
      existing_application.total_fee
    into v_application_id, v_tracking_id, v_receipt_number, v_total_fee
    from public.applications as existing_application
    where existing_application.center_id = v_center_id
      and existing_application.created_by = auth.uid()
      and existing_application.client_request_id = p_client_request_id;
  end if;

  return query
  select v_application_id, v_tracking_id, v_receipt_number, v_total_fee;
end;
$$;

revoke execute on function public.create_application(uuid, text, text, text, numeric, integer, boolean)
  from public, anon;
grant execute on function public.create_application(uuid, text, text, text, numeric, integer, boolean)
  to authenticated;

comment on function public.create_application(uuid, text, text, text, numeric, integer, boolean) is
  'Creates a tenant-scoped application and calculates Appendix-7 assistance fees on the server.';
