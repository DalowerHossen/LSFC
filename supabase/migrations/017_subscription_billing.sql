-- Phase 1 fixed-price subscription and center billing controls.

create type public.subscription_cycle as enum ('monthly', 'yearly');
create type public.subscription_status as enum ('pending', 'active', 'past_due', 'suspended', 'cancelled');
create type public.subscription_payment_method as enum ('cash', 'bank_transfer', 'mobile_financial_service', 'other');

create table public.subscription_pricing (
  singleton boolean primary key default true check (singleton),
  monthly_fee numeric(12,2) not null check (monthly_fee between 0 and 10000000),
  yearly_fee numeric(12,2) not null check (yearly_fee between 0 and 10000000),
  grace_days smallint not null default 7 check (grace_days between 0 and 90),
  effective_from date not null default current_date,
  updated_at timestamptz not null default now()
);
insert into public.subscription_pricing (monthly_fee, yearly_fee, grace_days)
values (1000, 10000, 7);

create table public.subscription_pricing_versions (
  id uuid primary key default gen_random_uuid(),
  monthly_fee numeric(12,2) not null,
  yearly_fee numeric(12,2) not null,
  grace_days smallint not null,
  reason text not null check (char_length(reason) between 10 and 500),
  changed_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
insert into public.subscription_pricing_versions (monthly_fee, yearly_fee, grace_days, reason)
values (1000, 10000, 7, 'Initial fixed subscription pricing');

create table public.center_subscriptions (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null unique references public.centers(id) on delete restrict,
  billing_cycle public.subscription_cycle not null,
  status public.subscription_status not null default 'pending',
  current_period_start date not null,
  current_period_end date not null,
  center_suspended_for_billing boolean not null default false,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (current_period_end >= current_period_start)
);
create index center_subscriptions_status_end_idx on public.center_subscriptions(status, current_period_end);
create trigger center_subscriptions_set_updated_at before update on public.center_subscriptions
for each row execute function private.set_updated_at();

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.center_subscriptions(id) on delete restrict,
  center_id uuid not null references public.centers(id) on delete restrict,
  voucher_number text not null unique,
  amount numeric(12,2) not null check (amount > 0),
  billing_cycle public.subscription_cycle not null,
  period_start date not null,
  period_end date not null,
  payment_method public.subscription_payment_method not null,
  payment_reference text not null check (char_length(payment_reference) between 3 and 120),
  paid_at timestamptz not null,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (period_end > period_start),
  unique (payment_method, payment_reference)
);
create index subscription_payments_center_paid_idx on public.subscription_payments(center_id, paid_at desc);

create or replace function private.prevent_subscription_record_mutation()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin raise exception 'Billing history is immutable'; end; $$;
create trigger subscription_pricing_versions_immutable before update or delete on public.subscription_pricing_versions
for each row execute function private.prevent_subscription_record_mutation();
create trigger subscription_payments_immutable before update or delete on public.subscription_payments
for each row execute function private.prevent_subscription_record_mutation();

alter table public.subscription_pricing enable row level security;
alter table public.subscription_pricing force row level security;
alter table public.subscription_pricing_versions enable row level security;
alter table public.subscription_pricing_versions force row level security;
alter table public.center_subscriptions enable row level security;
alter table public.center_subscriptions force row level security;
alter table public.subscription_payments enable row level security;
alter table public.subscription_payments force row level security;

create policy subscription_pricing_authenticated_read on public.subscription_pricing for select to authenticated using (true);
create policy pricing_versions_super_read on public.subscription_pricing_versions for select to authenticated using (private.is_super_admin() and private.mfa_satisfied());
create policy center_subscriptions_read on public.center_subscriptions for select to authenticated
using (private.is_super_admin() or (private.current_role() = 'owner' and center_id = private.current_center_id()));
create policy subscription_payments_read on public.subscription_payments for select to authenticated
using (private.is_super_admin() or (private.current_role() = 'owner' and center_id = private.current_center_id()));
grant select on public.subscription_pricing, public.subscription_pricing_versions, public.center_subscriptions, public.subscription_payments to authenticated;

create or replace function public.update_subscription_pricing(p_monthly_fee numeric, p_yearly_fee numeric, p_grace_days integer, p_reason text)
returns void language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare old_price public.subscription_pricing%rowtype;
begin
  if not private.is_super_admin() or not private.mfa_satisfied() then raise exception 'Super Admin AAL2 authentication required'; end if;
  if p_monthly_fee not between 0 and 10000000 or p_yearly_fee not between 0 and 10000000 or p_grace_days not between 0 and 90 then raise exception 'Pricing is outside the accepted range'; end if;
  if char_length(trim(p_reason)) not between 10 and 500 then raise exception 'A reason of 10 to 500 characters is required'; end if;
  select * into old_price from public.subscription_pricing where singleton for update;
  if old_price.monthly_fee = p_monthly_fee and old_price.yearly_fee = p_yearly_fee and old_price.grace_days = p_grace_days then raise exception 'Pricing is unchanged'; end if;
  update public.subscription_pricing set monthly_fee=p_monthly_fee, yearly_fee=p_yearly_fee, grace_days=p_grace_days, effective_from=current_date where singleton;
  insert into public.subscription_pricing_versions(monthly_fee,yearly_fee,grace_days,reason,changed_by) values(p_monthly_fee,p_yearly_fee,p_grace_days,trim(p_reason),auth.uid());
  perform private.write_audit_log(null,'subscription.pricing_changed','subscription_pricing',null,jsonb_build_object('old_monthly',old_price.monthly_fee,'new_monthly',p_monthly_fee,'old_yearly',old_price.yearly_fee,'new_yearly',p_yearly_fee,'grace_days',p_grace_days));
end; $$;

create or replace function public.assign_center_subscription(p_center_id uuid, p_billing_cycle public.subscription_cycle, p_start_date date, p_reason text)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare result_id uuid; center_state public.center_status;
begin
  if not private.is_super_admin() or not private.mfa_satisfied() then raise exception 'Super Admin AAL2 authentication required'; end if;
  if p_start_date is null or char_length(trim(p_reason)) not between 10 and 500 then raise exception 'Valid start date and reason are required'; end if;
  select status into center_state from public.centers where id=p_center_id;
  if not found then raise exception 'Center not found'; end if;
  if center_state='blocked' then raise exception 'Blocked center cannot receive a subscription'; end if;
  if exists(select 1 from public.center_subscriptions where center_id=p_center_id) then raise exception 'Center already has a subscription'; end if;
  insert into public.center_subscriptions(center_id,billing_cycle,status,current_period_start,current_period_end,assigned_by)
  values(p_center_id,p_billing_cycle,'pending',p_start_date,p_start_date,auth.uid())
  returning id into result_id;
  perform private.write_audit_log(p_center_id,'subscription.assigned','center_subscription',result_id,jsonb_build_object('billing_cycle',p_billing_cycle,'start_date',p_start_date,'reason',trim(p_reason)));
  return result_id;
end; $$;

create or replace function public.record_subscription_payment(p_subscription_id uuid, p_payment_method public.subscription_payment_method, p_payment_reference text, p_paid_at timestamptz default now())
returns text language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare sub public.center_subscriptions%rowtype; price public.subscription_pricing%rowtype; amount_due numeric; period_start date; period_end date; voucher text; center_state public.center_status;
begin
  if not private.is_super_admin() or not private.mfa_satisfied() then raise exception 'Super Admin AAL2 authentication required'; end if;
  if char_length(trim(p_payment_reference)) not between 3 and 120 or p_paid_at > now() + interval '5 minutes' then raise exception 'Payment information is invalid'; end if;
  select * into sub from public.center_subscriptions where id=p_subscription_id for update;
  if not found or sub.status='cancelled' then raise exception 'Active subscription not found'; end if;
  select * into price from public.subscription_pricing where singleton;
  amount_due := case when sub.billing_cycle='monthly' then price.monthly_fee else price.yearly_fee end;
  period_start := greatest(sub.current_period_end, (p_paid_at at time zone 'Asia/Dhaka')::date);
  period_end := case when sub.billing_cycle='monthly' then period_start + interval '1 month' else period_start + interval '1 year' end;
  voucher := 'SUB-'||to_char(clock_timestamp() at time zone 'Asia/Dhaka','YYYYMMDD')||'-'||upper(encode(gen_random_bytes(6),'hex'));
  insert into public.subscription_payments(subscription_id,center_id,voucher_number,amount,billing_cycle,period_start,period_end,payment_method,payment_reference,paid_at,recorded_by)
  values(sub.id,sub.center_id,voucher,amount_due,sub.billing_cycle,period_start,period_end,p_payment_method,trim(p_payment_reference),p_paid_at,auth.uid());
  update public.center_subscriptions set status='active',current_period_start=period_start,current_period_end=period_end where id=sub.id;
  if sub.center_suspended_for_billing then
    select status into center_state from public.centers where id=sub.center_id for update;
    if center_state='suspended' then
      update public.centers set status='active' where id=sub.center_id;
      insert into public.center_status_history(center_id,previous_status,new_status,reason,changed_by) values(sub.center_id,'suspended','active','Subscription payment received',auth.uid());
    end if;
    update public.center_subscriptions set center_suspended_for_billing=false where id=sub.id;
  end if;
  perform private.write_audit_log(sub.center_id,'subscription.payment_recorded','subscription_payment',null,jsonb_build_object('voucher_number',voucher,'amount',amount_due,'billing_cycle',sub.billing_cycle,'payment_method',p_payment_method));
  return voucher;
end; $$;

create or replace function public.enforce_overdue_subscriptions()
returns integer language plpgsql security definer set search_path = pg_catalog, public, private as $$
declare price public.subscription_pricing%rowtype; item record; affected integer:=0;
begin
  if not private.is_super_admin() or not private.mfa_satisfied() then raise exception 'Super Admin AAL2 authentication required'; end if;
  select * into price from public.subscription_pricing where singleton;
  update public.center_subscriptions set status='past_due' where status='active' and current_period_end < current_date and current_period_end + price.grace_days >= current_date;
  for item in select cs.id,cs.center_id,c.status as center_status from public.center_subscriptions cs join public.centers c on c.id=cs.center_id where cs.status in ('active','past_due','pending') and cs.current_period_end + price.grace_days < current_date for update of cs loop
    update public.center_subscriptions set status='suspended',center_suspended_for_billing=(item.center_status='active') where id=item.id;
    if item.center_status='active' then
      update public.centers set status='suspended' where id=item.center_id;
      insert into public.center_status_history(center_id,previous_status,new_status,reason,changed_by) values(item.center_id,'active','suspended','Subscription payment overdue beyond grace period',auth.uid());
    end if;
    perform private.write_audit_log(item.center_id,'subscription.overdue_enforced','center_subscription',item.id,jsonb_build_object('center_suspended',item.center_status='active'));
    affected:=affected+1;
  end loop;
  return affected;
end; $$;

revoke execute on function public.update_subscription_pricing(numeric,numeric,integer,text), public.assign_center_subscription(uuid,public.subscription_cycle,date,text), public.record_subscription_payment(uuid,public.subscription_payment_method,text,timestamptz), public.enforce_overdue_subscriptions() from public,anon;
grant execute on function public.update_subscription_pricing(numeric,numeric,integer,text), public.assign_center_subscription(uuid,public.subscription_cycle,date,text), public.record_subscription_payment(uuid,public.subscription_payment_method,text,timestamptz), public.enforce_overdue_subscriptions() to authenticated;
revoke all on function private.prevent_subscription_record_mutation() from public,anon,authenticated;
