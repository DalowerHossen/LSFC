-- Phase 1 immutable monthly government reporting.
-- Final reports snapshot operational aggregates; browser print provides PDF export.

create table public.monthly_government_reports (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete restrict,
  report_month date not null check (report_month = date_trunc('month', report_month)::date),
  report_number text not null unique,
  center_snapshot jsonb not null check (jsonb_typeof(center_snapshot)='object'),
  summary_snapshot jsonb not null check (jsonb_typeof(summary_snapshot)='object'),
  service_snapshot jsonb not null check (jsonb_typeof(service_snapshot)='array'),
  expense_snapshot jsonb not null check (jsonb_typeof(expense_snapshot)='array'),
  content_hash text not null unique check (content_hash ~ '^[a-f0-9]{64}$'),
  generated_by uuid not null references public.profiles(id) on delete restrict,
  generated_at timestamptz not null default now(),
  unique (center_id, report_month)
);
create index monthly_government_reports_center_month_idx
  on public.monthly_government_reports(center_id, report_month desc);

create or replace function private.prevent_monthly_report_mutation()
returns trigger language plpgsql set search_path=pg_catalog as $$
begin raise exception 'Monthly government reports are immutable'; end; $$;
create trigger monthly_government_reports_immutable
before update or delete on public.monthly_government_reports
for each row execute function private.prevent_monthly_report_mutation();

alter table public.monthly_government_reports enable row level security;
alter table public.monthly_government_reports force row level security;
create policy monthly_reports_manager_read on public.monthly_government_reports
for select to authenticated
using (private.is_super_admin() or (private.current_role()='owner' and center_id=private.current_center_id()));
create policy monthly_reports_active_gate on public.monthly_government_reports
as restrictive for select to authenticated using (private.mfa_satisfied());
grant select on public.monthly_government_reports to authenticated;

create or replace function public.generate_monthly_government_report(p_report_month date)
returns uuid language plpgsql security definer
set search_path=pg_catalog,public,private as $$
declare
  v_center_id uuid; v_month date; v_next_month date; v_center jsonb;
  v_summary jsonb; v_services jsonb; v_expenses jsonb;
  v_report_number text; v_hash text; v_result uuid; v_unclosed bigint;
begin
  if private.current_role()<>'owner' or not private.mfa_satisfied() then
    raise exception 'Active Center Owner AAL2 authentication required';
  end if;
  v_center_id:=private.current_center_id();
  v_month:=date_trunc('month',p_report_month)::date;
  v_next_month:=(v_month+interval '1 month')::date;
  if p_report_month is null or p_report_month<>v_month or v_month>=date_trunc('month',now() at time zone 'Asia/Dhaka')::date then
    raise exception 'Only a completed calendar month can be finalized';
  end if;

  select count(*) into v_unclosed from (
    select distinct (a.created_at at time zone 'Asia/Dhaka')::date activity_date
    from public.applications a where a.center_id=v_center_id
      and a.created_at>=v_month::timestamp at time zone 'Asia/Dhaka'
      and a.created_at<v_next_month::timestamp at time zone 'Asia/Dhaka'
      and a.status<>'cancelled_by_approval'
    union
    select distinct e.expense_date from public.center_expense_entries e
    where e.center_id=v_center_id and e.expense_date>=v_month and e.expense_date<v_next_month
  ) activity where not exists (
    select 1 from public.daily_cash_closings c
    where c.center_id=v_center_id and c.closing_date=activity.activity_date
  );
  if v_unclosed>0 then raise exception 'Every activity day must be cash-closed before report generation'; end if;

  select jsonb_build_object('code',c.code,'name',c.name,'division',c.division,'district',c.district,'upazila',c.upazila,'address',c.address,'license_number',c.license_number,'location_type',c.location_type)
  into v_center from public.centers c where c.id=v_center_id;

  select jsonb_build_object(
    'application_count',count(*),
    'completed_count',count(*) filter(where a.status='completed'),
    'pending_count',count(*) filter(where a.status in ('submitted','in_progress')),
    'gross_collection',coalesce(sum(a.total_fee),0),
    'government_fee',coalesce(sum(a.government_fee),0),
    'assistance_fee',coalesce(sum(a.assistance_fee),0),
    'additional_fee',coalesce(sum(a.additional_fee),0)
  ) into v_summary from public.applications a where a.center_id=v_center_id
    and a.created_at>=v_month::timestamp at time zone 'Asia/Dhaka'
    and a.created_at<v_next_month::timestamp at time zone 'Asia/Dhaka'
    and a.status<>'cancelled_by_approval';

  select coalesce(jsonb_agg(row_data order by sort_order),'[]'::jsonb) into v_services from (
    select s.sort_order,jsonb_build_object('service_code',s.code,'service_name',s.name_bn,'application_count',count(a.id),'completed_count',count(a.id) filter(where a.status='completed'),'gross_collection',coalesce(sum(a.total_fee),0),'government_fee',coalesce(sum(a.government_fee),0),'assistance_fee',coalesce(sum(a.assistance_fee),0),'additional_fee',coalesce(sum(a.additional_fee),0)) row_data
    from public.services s left join public.applications a on a.service_code=s.code and a.center_id=v_center_id
      and a.created_at>=v_month::timestamp at time zone 'Asia/Dhaka'
      and a.created_at<v_next_month::timestamp at time zone 'Asia/Dhaka'
      and a.status<>'cancelled_by_approval'
    group by s.code,s.name_bn,s.sort_order
  ) breakdown;

  select coalesce(jsonb_agg(row_data order by category),'[]'::jsonb) into v_expenses from (
    select e.category::text category,jsonb_build_object('category',e.category,'amount',sum(case when e.entry_type='expense' then e.amount else -e.amount end)) row_data
    from public.center_expense_entries e where e.center_id=v_center_id and e.expense_date>=v_month and e.expense_date<v_next_month group by e.category
  ) breakdown;

  v_summary:=v_summary||jsonb_build_object(
    'expense_total',coalesce((select sum((item->>'amount')::numeric) from jsonb_array_elements(v_expenses) item),0),
    'cash_closing_days',(select count(*) from public.daily_cash_closings c where c.center_id=v_center_id and c.closing_date>=v_month and c.closing_date<v_next_month),
    'total_variance',coalesce((select sum(c.variance) from public.daily_cash_closings c where c.center_id=v_center_id and c.closing_date>=v_month and c.closing_date<v_next_month),0)
  );
  v_report_number:='GMR-'||to_char(v_month,'YYYYMM')||'-'||upper(encode(gen_random_bytes(6),'hex'));
  v_hash:=encode(digest(convert_to(v_center_id::text||v_month::text||v_center::text||v_summary::text||v_services::text||v_expenses::text,'UTF8'),'sha256'),'hex');
  insert into public.monthly_government_reports(center_id,report_month,report_number,center_snapshot,summary_snapshot,service_snapshot,expense_snapshot,content_hash,generated_by)
  values(v_center_id,v_month,v_report_number,v_center,v_summary,v_services,v_expenses,v_hash,auth.uid()) returning id into v_result;
  perform private.write_audit_log(v_center_id,'report.monthly_government_generated','monthly_government_report',v_result,jsonb_build_object('report_month',v_month,'report_number',v_report_number,'content_hash',v_hash));
  return v_result;
exception when unique_violation then raise exception 'Report for this month already exists';
end; $$;

revoke execute on function public.generate_monthly_government_report(date) from public,anon;
grant execute on function public.generate_monthly_government_report(date) to authenticated;
revoke all on function private.prevent_monthly_report_mutation() from public,anon,authenticated;
comment on table public.monthly_government_reports is 'Immutable official monthly center report snapshots with SHA-256 integrity hashes.';
