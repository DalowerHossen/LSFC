-- Phase 1 controlled application status workflow.
-- Direct status updates are removed; transitions happen through this audited RPC.

revoke update (status, submitted_at, completed_at)
  on public.applications from authenticated;

create or replace function public.transition_application_status(
  p_application_id uuid,
  p_target_status public.application_status
)
returns table (
  application_id uuid,
  previous_status public.application_status,
  current_status public.application_status,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_center_id uuid;
  v_previous_status public.application_status;
  v_completed_at timestamptz;
begin
  if private.current_role() not in ('owner', 'operator') then
    raise exception 'Not authorized to update application workflow';
  end if;

  if not private.mfa_satisfied() then
    raise exception 'Required authentication assurance is not satisfied';
  end if;

  select app.center_id, app.status
  into v_center_id, v_previous_status
  from public.applications as app
  where app.id = p_application_id
  for update;

  if not found then
    raise exception 'Application not found';
  end if;

  if v_center_id <> private.current_center_id() then
    raise exception 'Application does not belong to the current center';
  end if;

  if not (
    (v_previous_status = 'submitted' and p_target_status = 'in_progress')
    or (v_previous_status = 'in_progress' and p_target_status = 'completed')
  ) then
    raise exception 'Invalid application status transition';
  end if;

  v_completed_at := case
    when p_target_status = 'completed' then now()
    else null
  end;

  update public.applications
  set status = p_target_status,
      completed_at = v_completed_at
  where id = p_application_id;

  return query
  select p_application_id, v_previous_status, p_target_status, v_completed_at;
end;
$$;

revoke execute on function public.transition_application_status(uuid, public.application_status)
  from public, anon;
grant execute on function public.transition_application_status(uuid, public.application_status)
  to authenticated;

comment on function public.transition_application_status(uuid, public.application_status) is
  'Allows only submitted → in_progress → completed. Cancellation requires the separate approval workflow.';
