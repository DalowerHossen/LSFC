-- Role-scoped dashboard time series for accessible operational charts.
create or replace function public.dashboard_application_trend(p_days integer default 14)
returns table(day date,application_count bigint,completed_count bigint,service_value numeric)
language plpgsql stable security definer set search_path=pg_catalog,public,private as $$
declare actor_role public.user_role;cid uuid;actor_id uuid;
begin
 actor_role:=private.current_role();cid:=private.current_center_id();actor_id:=auth.uid();
 if actor_role not in('super_admin','owner','operator') or not private.mfa_satisfied() then raise exception 'Authenticated AAL2 role required';end if;
 if p_days not between 7 and 31 then raise exception 'Trend range must be between 7 and 31 days';end if;
 if actor_role in('owner','operator') and cid is null then raise exception 'No center is assigned';end if;
 return query
 with days as(select generate_series((now()at time zone'Asia/Dhaka')::date-(p_days-1),(now()at time zone'Asia/Dhaka')::date,'1 day'::interval)::date as chart_day),
 created as(select (a.created_at at time zone'Asia/Dhaka')::date as chart_day,count(*)::bigint as total,coalesce(sum(a.total_fee),0)::numeric as value from public.applications a where a.created_at>=(((now()at time zone'Asia/Dhaka')::date-(p_days-1))::timestamp at time zone'Asia/Dhaka') and(actor_role='super_admin'or(a.center_id=cid and(actor_role='owner'or a.created_by=actor_id)))group by 1),
 completed as(select (a.completed_at at time zone'Asia/Dhaka')::date as chart_day,count(*)::bigint as total from public.applications a where a.completed_at>=(((now()at time zone'Asia/Dhaka')::date-(p_days-1))::timestamp at time zone'Asia/Dhaka') and(actor_role='super_admin'or(a.center_id=cid and(actor_role='owner'or a.created_by=actor_id)))group by 1)
 select d.chart_day,coalesce(c.total,0),coalesce(x.total,0),coalesce(c.value,0) from days d left join created c using(chart_day)left join completed x using(chart_day)order by d.chart_day;
end;$$;
revoke execute on function public.dashboard_application_trend(integer)from public,anon;
grant execute on function public.dashboard_application_trend(integer)to authenticated;
comment on function public.dashboard_application_trend(integer)is'Last 7–31 Dhaka-calendar days, scoped nationally for Super Admin, by Center for Owner, and by creator for Operator.';
