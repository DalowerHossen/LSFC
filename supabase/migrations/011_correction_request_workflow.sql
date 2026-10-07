-- Phase 1 application correction requests.
-- Operators cannot modify records directly; they submit a validated request to the Owner.

revoke insert on public.edit_requests from authenticated;

create or replace function public.request_application_correction(
  p_application_id uuid,
  p_field_name text,
  p_proposed_value text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_center uuid;
  application_record public.applications%rowtype;
  current_value text;
  request_id uuid;
begin
  if private.current_role() not in ('owner', 'operator')
     or not private.mfa_satisfied() then
    raise exception 'Authorized AAL2 session required';
  end if;

  target_center := private.current_center_id();

  select * into application_record
  from public.applications
  where id = p_application_id;

  if not found or application_record.center_id <> target_center then
    raise exception 'Application not found in this center';
  end if;

  if p_field_name not in ('citizen_name', 'citizen_mobile', 'government_fee') then
    raise exception 'Field cannot be corrected through this workflow';
  end if;

  if char_length(trim(p_reason)) not between 10 and 1000 then
    raise exception 'Correction reason must contain 10 to 1000 characters';
  end if;

  if p_field_name = 'citizen_name' then
    if char_length(trim(p_proposed_value)) not between 2 and 120 then
      raise exception 'Proposed citizen name is invalid';
    end if;
    current_value := application_record.citizen_name;
  elsif p_field_name = 'citizen_mobile' then
    if p_proposed_value !~ '^01[3-9][0-9]{8}$' then
      raise exception 'Proposed mobile number is invalid';
    end if;
    current_value := application_record.citizen_mobile;
  else
    if p_proposed_value !~ '^[0-9]{1,7}([.][0-9]{1,2})?$'
       or p_proposed_value::numeric > 1000000 then
      raise exception 'Proposed government fee is invalid';
    end if;
    current_value := application_record.government_fee::text;
  end if;

  if (
    p_field_name = 'government_fee'
    and p_proposed_value::numeric = application_record.government_fee
  ) or (
    p_field_name <> 'government_fee'
    and trim(p_proposed_value) = trim(current_value)
  ) then
    raise exception 'Proposed value is unchanged';
  end if;

  if exists (
    select 1 from public.edit_requests
    where entity_type = 'application'
      and entity_id = p_application_id
      and requested_by = auth.uid()
      and status in ('pending_owner', 'pending_super_admin')
  ) then
    raise exception 'A pending correction request already exists';
  end if;

  insert into public.edit_requests (
    center_id,
    entity_type,
    entity_id,
    reason,
    requested_changes,
    status,
    requested_by
  ) values (
    target_center,
    'application',
    p_application_id,
    trim(p_reason),
    jsonb_build_object(
      'field', p_field_name,
      'current_value', current_value,
      'proposed_value', trim(p_proposed_value)
    ),
    case
      when private.current_role() = 'owner' then 'pending_super_admin'
      else 'pending_owner'
    end,
    auth.uid()
  )
  returning id into request_id;

  perform private.write_audit_log(
    target_center,
    'correction.requested',
    'edit_request',
    request_id,
    jsonb_build_object('application_id', p_application_id, 'field', p_field_name)
  );

  return request_id;
end;
$$;

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
  next_status public.edit_request_status;
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

  next_status := case
    when forward_to_super_admin then 'pending_super_admin'
    else 'rejected'
  end;

  update public.edit_requests
  set status = next_status,
      owner_reviewed_by = auth.uid(),
      owner_reviewed_at = now(),
      review_note = nullif(trim(note), '')
  where id = request_id;

  perform private.write_audit_log(
    target_request.center_id,
    case
      when forward_to_super_admin then 'correction.forwarded_by_owner'
      else 'correction.rejected_by_owner'
    end,
    'edit_request',
    request_id,
    jsonb_build_object('next_status', next_status, 'application_id', target_request.entity_id)
  );
end;
$$;

revoke execute on function public.request_application_correction(uuid, text, text, text)
  from public, anon;
grant execute on function public.request_application_correction(uuid, text, text, text)
  to authenticated;

comment on function public.request_application_correction(uuid, text, text, text) is
  'Creates a validated correction request without modifying the application or immutable receipt.';
