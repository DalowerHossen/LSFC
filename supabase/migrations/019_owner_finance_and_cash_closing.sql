-- Phase 1 Owner income-expense ledger and daily cash settlement.
-- Financial records are append-only; mistakes are corrected by reversal entries.

create type public.expense_category as enum (
  'rent', 'electricity', 'internet', 'salary', 'supplies', 'maintenance', 'other'
);
create type public.finance_entry_type as enum ('expense', 'reversal');

create table public.center_expense_entries (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete restrict,
  entry_type public.finance_entry_type not null default 'expense',
  category public.expense_category not null,
  amount numeric(12,2) not null check (amount > 0 and amount <= 10000000),
  expense_date date not null,
  description text not null check (char_length(description) between 3 and 500),
  reference text,
  reversed_entry_id uuid unique references public.center_expense_entries(id) on delete restrict,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (
    (entry_type = 'expense' and reversed_entry_id is null)
    or (entry_type = 'reversal' and reversed_entry_id is not null)
  )
);
create index center_expense_entries_date_idx
  on public.center_expense_entries(center_id, expense_date desc, created_at desc);

create table public.daily_cash_closings (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete restrict,
  closing_date date not null,
  system_collection numeric(12,2) not null check (system_collection >= 0),
  system_expense numeric(12,2) not null check (system_expense >= 0),
  reported_cash numeric(12,2) not null check (reported_cash >= 0),
  reported_bkash numeric(12,2) not null check (reported_bkash >= 0),
  reported_nagad numeric(12,2) not null check (reported_nagad >= 0),
  reported_bank numeric(12,2) not null check (reported_bank >= 0),
  reported_total numeric(12,2) generated always as
    (reported_cash + reported_bkash + reported_nagad + reported_bank) stored,
  variance numeric(12,2) not null,
  note text,
  closed_by uuid not null references public.profiles(id) on delete restrict,
  closed_at timestamptz not null default now(),
  unique (center_id, closing_date)
);
create index daily_cash_closings_center_date_idx
  on public.daily_cash_closings(center_id, closing_date desc);

-- Once an Owner closes a day, later application inserts cannot silently change
-- that day's system collection snapshot.
create or replace function private.prevent_application_after_cash_close()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,private as $$
begin
  if exists(
    select 1 from public.daily_cash_closings as closing
    where closing.center_id=new.center_id
      and closing.closing_date=(new.created_at at time zone 'Asia/Dhaka')::date
  ) then
    raise exception 'Cash has already been closed for this date';
  end if;
  return new;
end; $$;
create trigger applications_respect_cash_closing
before insert on public.applications
for each row execute function private.prevent_application_after_cash_close();

create or replace function private.prevent_closed_day_fee_change()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,private as $$
begin
  if (new.government_fee,new.assistance_fee,new.additional_fee)
     is distinct from (old.government_fee,old.assistance_fee,old.additional_fee)
     and exists(
       select 1 from public.daily_cash_closings as closing
       where closing.center_id=old.center_id
         and closing.closing_date=(old.created_at at time zone 'Asia/Dhaka')::date
     ) then
    raise exception 'Fees for a cash-closed day cannot be changed';
  end if;
  return new;
end; $$;
create trigger application_fees_respect_cash_closing
before update on public.applications
for each row execute function private.prevent_closed_day_fee_change();

create or replace function private.prevent_finance_mutation()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin raise exception 'Financial ledger records are immutable'; end; $$;
create trigger center_expense_entries_immutable before update or delete on public.center_expense_entries
for each row execute function private.prevent_finance_mutation();
create trigger daily_cash_closings_immutable before update or delete on public.daily_cash_closings
for each row execute function private.prevent_finance_mutation();

alter table public.center_expense_entries enable row level security;
alter table public.center_expense_entries force row level security;
alter table public.daily_cash_closings enable row level security;
alter table public.daily_cash_closings force row level security;
create policy center_expense_entries_manager_read on public.center_expense_entries for select to authenticated
using (private.is_super_admin() or (private.current_role()='owner' and center_id=private.current_center_id()));
create policy daily_cash_closings_manager_read on public.daily_cash_closings for select to authenticated
using (private.is_super_admin() or (private.current_role()='owner' and center_id=private.current_center_id()));
create policy center_expense_entries_active_gate on public.center_expense_entries as restrictive for select to authenticated using (private.mfa_satisfied());
create policy daily_cash_closings_active_gate on public.daily_cash_closings as restrictive for select to authenticated using (private.mfa_satisfied());
grant select on public.center_expense_entries, public.daily_cash_closings to authenticated;

create or replace function public.record_center_expense(
  p_category public.expense_category, p_amount numeric, p_expense_date date,
  p_description text, p_reference text default null
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare result_id uuid; v_center_id uuid;
begin
  if private.current_role()<>'owner' or not private.mfa_satisfied() then raise exception 'Active Center Owner AAL2 authentication required'; end if;
  v_center_id:=private.current_center_id();
  if p_amount not between 0.01 and 10000000 or p_expense_date is null or p_expense_date > (now() at time zone 'Asia/Dhaka')::date or char_length(trim(p_description)) not between 3 and 500 or char_length(coalesce(p_reference,'')) > 120 then raise exception 'Expense information is invalid'; end if;
  if exists(select 1 from public.daily_cash_closings as closing where closing.center_id=v_center_id and closing.closing_date=p_expense_date) then raise exception 'A closed day cannot be changed'; end if;
  insert into public.center_expense_entries(center_id,entry_type,category,amount,expense_date,description,reference,recorded_by)
  values(v_center_id,'expense',p_category,p_amount,p_expense_date,trim(p_description),nullif(trim(p_reference),''),auth.uid()) returning id into result_id;
  perform private.write_audit_log(v_center_id,'finance.expense_recorded','center_expense',result_id,jsonb_build_object('category',p_category,'amount',p_amount,'expense_date',p_expense_date));
  return result_id;
end; $$;

create or replace function public.reverse_center_expense(p_expense_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare original public.center_expense_entries%rowtype; result_id uuid;
begin
  if private.current_role()<>'owner' or not private.mfa_satisfied() then raise exception 'Active Center Owner AAL2 authentication required'; end if;
  if char_length(trim(p_reason)) not between 10 and 500 then raise exception 'A reason of 10 to 500 characters is required'; end if;
  select * into original from public.center_expense_entries where id=p_expense_id and center_id=private.current_center_id() and entry_type='expense' for update;
  if not found then raise exception 'Expense not found'; end if;
  if exists(select 1 from public.center_expense_entries where reversed_entry_id=original.id) then raise exception 'Expense is already reversed'; end if;
  if exists(select 1 from public.daily_cash_closings where center_id=original.center_id and closing_date=original.expense_date) then raise exception 'A closed day cannot be changed'; end if;
  insert into public.center_expense_entries(center_id,entry_type,category,amount,expense_date,description,reversed_entry_id,recorded_by)
  values(original.center_id,'reversal',original.category,original.amount,original.expense_date,trim(p_reason),original.id,auth.uid()) returning id into result_id;
  perform private.write_audit_log(original.center_id,'finance.expense_reversed','center_expense',result_id,jsonb_build_object('original_entry_id',original.id,'amount',original.amount));
  return result_id;
end; $$;

create or replace function public.close_daily_cash(
  p_closing_date date, p_reported_cash numeric, p_reported_bkash numeric,
  p_reported_nagad numeric, p_reported_bank numeric, p_note text default null
)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_center_id uuid; day_start timestamptz; day_end timestamptz; expected numeric; expenses numeric; actual numeric; result_id uuid;
begin
  if private.current_role()<>'owner' or not private.mfa_satisfied() then raise exception 'Active Center Owner AAL2 authentication required'; end if;
  v_center_id:=private.current_center_id();
  if p_closing_date is null or p_closing_date > (now() at time zone 'Asia/Dhaka')::date or p_reported_cash<0 or p_reported_bkash<0 or p_reported_nagad<0 or p_reported_bank<0 or char_length(coalesce(p_note,''))>500 then raise exception 'Cash closing information is invalid'; end if;
  day_start:=p_closing_date::timestamp at time zone 'Asia/Dhaka'; day_end:=day_start+interval '1 day';
  select coalesce(sum(total_fee),0) into expected from public.applications where applications.center_id=v_center_id and created_at>=day_start and created_at<day_end and status<>'cancelled_by_approval';
  select coalesce(sum(case when entry_type='expense' then amount else -amount end),0) into expenses from public.center_expense_entries where center_expense_entries.center_id=v_center_id and expense_date=p_closing_date;
  actual:=p_reported_cash+p_reported_bkash+p_reported_nagad+p_reported_bank;
  insert into public.daily_cash_closings(center_id,closing_date,system_collection,system_expense,reported_cash,reported_bkash,reported_nagad,reported_bank,variance,note,closed_by)
  values(v_center_id,p_closing_date,expected,expenses,p_reported_cash,p_reported_bkash,p_reported_nagad,p_reported_bank,actual-expected,nullif(trim(p_note),''),auth.uid()) returning id into result_id;
  perform private.write_audit_log(v_center_id,'finance.day_closed','daily_cash_closing',result_id,jsonb_build_object('closing_date',p_closing_date,'system_collection',expected,'reported_total',actual,'variance',actual-expected));
  return result_id;
exception when unique_violation then raise exception 'This day is already closed';
end; $$;

create or replace function public.owner_finance_summary(p_month date default current_date)
returns table(gross_collection numeric,government_fee numeric,assistance_income numeric,additional_income numeric,expense_total numeric,net_center_income numeric,application_count bigint)
language plpgsql stable security definer set search_path=pg_catalog,public,private as $$
declare v_center_id uuid; month_start date; month_end date;
begin
  if private.current_role()<>'owner' or not private.mfa_satisfied() then raise exception 'Active Center Owner AAL2 authentication required'; end if;
  v_center_id:=private.current_center_id(); month_start:=date_trunc('month',p_month)::date; month_end:=(month_start+interval '1 month')::date;
  return query with app as (select coalesce(sum(a.total_fee),0) gross,coalesce(sum(a.government_fee),0) govt,coalesce(sum(a.assistance_fee),0) assist,coalesce(sum(a.additional_fee),0) additional,count(*) count from public.applications a where a.center_id=v_center_id and a.created_at>=month_start::timestamp at time zone 'Asia/Dhaka' and a.created_at<month_end::timestamp at time zone 'Asia/Dhaka' and a.status<>'cancelled_by_approval'), exp as (select coalesce(sum(case when e.entry_type='expense' then e.amount else -e.amount end),0) total from public.center_expense_entries e where e.center_id=v_center_id and e.expense_date>=month_start and e.expense_date<month_end) select app.gross,app.govt,app.assist,app.additional,exp.total,app.assist+app.additional-exp.total,app.count from app cross join exp;
end; $$;

revoke execute on function public.record_center_expense(public.expense_category,numeric,date,text,text),public.reverse_center_expense(uuid,text),public.close_daily_cash(date,numeric,numeric,numeric,numeric,text),public.owner_finance_summary(date) from public,anon;
grant execute on function public.record_center_expense(public.expense_category,numeric,date,text,text),public.reverse_center_expense(uuid,text),public.close_daily_cash(date,numeric,numeric,numeric,numeric,text),public.owner_finance_summary(date) to authenticated;
revoke all on function private.prevent_finance_mutation() from public,anon,authenticated;
revoke all on function private.prevent_application_after_cash_close() from public,anon,authenticated;
revoke all on function private.prevent_closed_day_fee_change() from public,anon,authenticated;
