-- Phase 1 nationwide Super Admin analytics foundation.
-- Aggregates contain no citizen-level personal information.

create index if not exists applications_created_at_idx
  on public.applications(created_at desc);
create index if not exists applications_completed_at_idx
  on public.applications(completed_at desc)
  where completed_at is not null;
create index if not exists centers_status_district_idx
  on public.centers(status, district);

create or replace function public.super_admin_dashboard_metrics()
returns table (
  total_centers bigint,
  active_centers bigint,
  pending_centers bigint,
  suspended_centers bigint,
  blocked_centers bigint,
  today_applications bigint,
  today_completed bigint,
  today_service_value numeric,
  active_users bigint,
  pending_corrections bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  dhaka_day_start timestamptz;
  dhaka_next_day timestamptz;
begin
  if not private.is_super_admin() or not private.mfa_satisfied() then
    raise exception 'Super Admin AAL2 authentication required';
  end if;

  dhaka_day_start := date_trunc('day', now() at time zone 'Asia/Dhaka') at time zone 'Asia/Dhaka';
  dhaka_next_day := dhaka_day_start + interval '1 day';

  return query
  select
    (select count(*) from public.centers),
    (select count(*) from public.centers where status = 'active'),
    (select count(*) from public.centers where status = 'pending'),
    (select count(*) from public.centers where status = 'suspended'),
    (select count(*) from public.centers where status = 'blocked'),
    (select count(*) from public.applications
      where created_at >= dhaka_day_start and created_at < dhaka_next_day),
    (select count(*) from public.applications
      where status = 'completed'
        and completed_at >= dhaka_day_start and completed_at < dhaka_next_day),
    (select coalesce(sum(total_fee), 0) from public.applications
      where created_at >= dhaka_day_start and created_at < dhaka_next_day),
    (select count(*) from public.profiles where is_active = true),
    (select count(*) from public.edit_requests where status = 'pending_super_admin');
end;
$$;

create or replace function public.super_admin_district_analytics(p_limit integer default 10)
returns table (
  district text,
  center_count bigint,
  active_center_count bigint,
  application_count bigint,
  completed_count bigint,
  service_value numeric
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not private.is_super_admin() or not private.mfa_satisfied() then
    raise exception 'Super Admin AAL2 authentication required';
  end if;

  if p_limit not between 1 and 64 then
    raise exception 'Limit must be between 1 and 64';
  end if;

  return query
  select
    center.district,
    count(distinct center.id),
    count(distinct center.id) filter (where center.status = 'active'),
    count(application.id),
    count(application.id) filter (where application.status = 'completed'),
    coalesce(sum(application.total_fee), 0)
  from public.centers as center
  left join public.applications as application on application.center_id = center.id
  group by center.district
  order by count(application.id) desc, center.district
  limit p_limit;
end;
$$;

create or replace function public.super_admin_service_analytics(p_limit integer default 14)
returns table (
  service_code text,
  service_name text,
  application_count bigint,
  completed_count bigint,
  service_value numeric
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not private.is_super_admin() or not private.mfa_satisfied() then
    raise exception 'Super Admin AAL2 authentication required';
  end if;

  if p_limit not between 1 and 14 then
    raise exception 'Limit must be between 1 and 14';
  end if;

  return query
  select
    service.code,
    service.name_bn,
    count(application.id),
    count(application.id) filter (where application.status = 'completed'),
    coalesce(sum(application.total_fee), 0)
  from public.services as service
  left join public.applications as application on application.service_code = service.code
  group by service.code, service.name_bn, service.sort_order
  order by count(application.id) desc, service.sort_order
  limit p_limit;
end;
$$;

revoke execute on function public.super_admin_dashboard_metrics() from public, anon;
revoke execute on function public.super_admin_district_analytics(integer) from public, anon;
revoke execute on function public.super_admin_service_analytics(integer) from public, anon;
grant execute on function public.super_admin_dashboard_metrics() to authenticated;
grant execute on function public.super_admin_district_analytics(integer) to authenticated;
grant execute on function public.super_admin_service_analytics(integer) to authenticated;

comment on function public.super_admin_dashboard_metrics() is
  'Nationwide non-PII operational metrics for the Super Admin dashboard.';
