-- Phase 1 Owner dashboard aggregates.
-- All calculations are tenant-scoped and use Bangladesh local time.

create or replace function public.owner_dashboard_metrics()
returns table (
  today_applications bigint,
  today_completed bigint,
  active_applications bigint,
  today_collected numeric,
  active_staff bigint,
  pending_edit_requests bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_center uuid;
  dhaka_day_start timestamptz;
  dhaka_next_day timestamptz;
begin
  if private.current_role() <> 'owner' or not private.mfa_satisfied() then
    raise exception 'Owner AAL2 authentication required';
  end if;

  target_center := private.current_center_id();
  if target_center is null then
    raise exception 'No center is assigned';
  end if;

  dhaka_day_start := date_trunc('day', now() at time zone 'Asia/Dhaka') at time zone 'Asia/Dhaka';
  dhaka_next_day := dhaka_day_start + interval '1 day';

  return query
  select
    count(*) filter (
      where application.created_at >= dhaka_day_start
        and application.created_at < dhaka_next_day
    ),
    count(*) filter (
      where application.status = 'completed'
        and application.completed_at >= dhaka_day_start
        and application.completed_at < dhaka_next_day
    ),
    count(*) filter (
      where application.status in ('submitted', 'in_progress')
    ),
    coalesce(sum(application.total_fee) filter (
      where application.created_at >= dhaka_day_start
        and application.created_at < dhaka_next_day
    ), 0),
    (
      select count(*)
      from public.profiles as profile
      where profile.center_id = target_center
        and profile.role = 'operator'
        and profile.is_active = true
    ),
    (
      select count(*)
      from public.edit_requests as edit_request
      where edit_request.center_id = target_center
        and edit_request.status = 'pending_owner'
    )
  from public.applications as application
  where application.center_id = target_center;
end;
$$;

revoke execute on function public.owner_dashboard_metrics() from public, anon;
grant execute on function public.owner_dashboard_metrics() to authenticated;

comment on function public.owner_dashboard_metrics() is
  'Tenant-scoped Owner dashboard metrics calculated for the Asia/Dhaka day.';
