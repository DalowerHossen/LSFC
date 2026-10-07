-- Phase 1 privacy-safe public application tracking.
-- A result is returned only when both tracking ID and mobile number match.

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
    application.receipt_number,
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
  where application.tracking_id = upper(trim(p_tracking_id))
    and application.citizen_mobile = p_citizen_mobile
  limit 1;
end;
$$;

revoke execute on function public.track_application(text, text) from public;
grant execute on function public.track_application(text, text) to anon, authenticated;

comment on function public.track_application(text, text) is
  'Returns non-document application status only after exact tracking ID and mobile match.';
