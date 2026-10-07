-- Live, creator-scoped Operator dashboard metrics.
create or replace function public.operator_dashboard_metrics()
returns table(today_applications bigint,today_completed bigint,active_applications bigint,today_collected numeric)
language plpgsql stable security definer set search_path=pg_catalog,public,private as $$
declare day_start timestamptz;day_end timestamptz;cid uuid;
begin
 if private.current_role()<>'operator'or not private.mfa_satisfied()then raise exception 'Active Operator authentication required';end if;
 cid:=private.current_center_id();day_start:=date_trunc('day',now()at time zone'Asia/Dhaka')at time zone'Asia/Dhaka';day_end:=day_start+interval'1 day';
 return query select count(*)filter(where a.created_at>=day_start and a.created_at<day_end),count(*)filter(where a.status='completed'and a.completed_at>=day_start and a.completed_at<day_end),count(*)filter(where a.status in('submitted','in_progress')),coalesce(sum(a.total_fee)filter(where a.created_at>=day_start and a.created_at<day_end),0)from public.applications a where a.center_id=cid and a.created_by=auth.uid();
end;$$;
revoke execute on function public.operator_dashboard_metrics()from public,anon;grant execute on function public.operator_dashboard_metrics()to authenticated;
