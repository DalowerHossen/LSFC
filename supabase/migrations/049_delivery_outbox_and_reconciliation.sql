-- Provider-neutral notification outbox, license-reminder scheduling, and complete PDF cleanup reconciliation.
-- This migration does not send messages or invent provider templates. Delivery workers must render only approved templates.

create type public.message_delivery_status as enum ('pending','processing','retry_wait','delivered','dead_letter');
create type public.message_channel as enum ('whatsapp','sms');

create table public.message_outbox (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete restrict,
  message_kind text not null check (message_kind in ('application_submitted','application_in_progress','application_completed','license_expiry_reminder')),
  entity_type text not null check (entity_type in ('application','center_license')),
  entity_id uuid not null,
  recipient_phone text not null check (recipient_phone ~ '^01[3-9][0-9]{8}$'),
  template_key text not null check (template_key ~ '^[a-z0-9_]{3,80}$'),
  template_facts jsonb not null check (jsonb_typeof(template_facts)='object'),
  idempotency_key text not null unique check (char_length(idempotency_key) between 10 and 255),
  status public.message_delivery_status not null default 'pending',
  attempt_count integer not null default 0 check (attempt_count between 0 and 20),
  next_attempt_at timestamptz not null default now(),
  processing_started_at timestamptz,
  delivered_at timestamptz,
  provider_message_id text,
  last_error_code text,
  last_error_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status='delivered' and delivered_at is not null) or status<>'delivered'),
  check (provider_message_id is null or char_length(provider_message_id) between 1 and 255),
  check (last_error_code is null or last_error_code ~ '^[A-Z0-9_:-]{2,80}$')
);
create index message_outbox_due_idx on public.message_outbox(status,next_attempt_at,created_at) where status in ('pending','retry_wait');
create index message_outbox_center_created_idx on public.message_outbox(center_id,created_at desc);
create trigger message_outbox_set_updated_at before update on public.message_outbox for each row execute function private.set_updated_at();

create table public.message_delivery_attempts (
  id bigint generated always as identity primary key,
  outbox_id uuid not null references public.message_outbox(id) on delete restrict,
  center_id uuid not null references public.centers(id) on delete restrict,
  attempt_number integer not null check (attempt_number between 1 and 20),
  channel public.message_channel not null,
  succeeded boolean not null,
  provider_message_id text,
  error_code text,
  attempted_at timestamptz not null default now(),
  check ((succeeded and provider_message_id is not null and error_code is null) or (not succeeded and error_code is not null)),
  check (provider_message_id is null or char_length(provider_message_id) between 1 and 255),
  check (error_code is null or error_code ~ '^[A-Z0-9_:-]{2,80}$'),
  unique(outbox_id,attempt_number)
);
create index message_attempts_center_created_idx on public.message_delivery_attempts(center_id,attempted_at desc);
create trigger message_attempts_immutable before update or delete on public.message_delivery_attempts for each row execute function private.prevent_receipt_mutation();

alter table public.message_outbox enable row level security;
alter table public.message_outbox force row level security;
alter table public.message_delivery_attempts enable row level security;
alter table public.message_delivery_attempts force row level security;
create policy message_outbox_authorized_read on public.message_outbox for select to authenticated using (
  private.mfa_satisfied() and (private.is_super_admin() or (private.current_role()='owner' and center_id=private.current_center_id()))
);
create policy message_attempts_authorized_read on public.message_delivery_attempts for select to authenticated using (
  private.mfa_satisfied() and (private.is_super_admin() or (private.current_role()='owner' and center_id=private.current_center_id()))
);
revoke all on public.message_outbox,public.message_delivery_attempts from anon,authenticated;
grant select on public.message_outbox,public.message_delivery_attempts to authenticated;

create or replace function private.enqueue_application_notification() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare kind text; template text;
begin
  if tg_op='INSERT' then
    if new.status<>'submitted' then return new; end if;
    kind:='application_submitted'; template:='application_submitted';
  elsif new.status is distinct from old.status then
    if new.status='in_progress' then kind:='application_in_progress'; template:='application_in_progress';
    elsif new.status='completed' then kind:='application_completed'; template:='application_completed';
    else return new;
    end if;
  else return new;
  end if;
  insert into public.message_outbox(center_id,message_kind,entity_type,entity_id,recipient_phone,template_key,template_facts,idempotency_key)
  values(new.center_id,kind,'application',new.id,new.citizen_mobile,template,jsonb_build_object('tracking_id',new.tracking_id,'status',new.status),format('application:%s:%s',new.id,new.status))
  on conflict(idempotency_key) do nothing;
  return new;
end;$$;
create trigger applications_notification_outbox after insert or update of status on public.applications for each row execute function private.enqueue_application_notification();

create or replace function public.schedule_license_reminders(p_as_of date,p_days_before integer[])
returns integer language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare queued integer;
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'Service role required'; end if;
  if p_as_of is null or p_days_before is null or cardinality(p_days_before) not between 1 and 12
     or exists(select 1 from unnest(p_days_before) d where d not between 1 and 365) then
    raise exception 'Approved reminder schedule required';
  end if;
  insert into public.message_outbox(center_id,message_kind,entity_type,entity_id,recipient_phone,template_key,template_facts,idempotency_key)
  select c.id,'license_expiry_reminder','center_license',c.id,c.phone,'license_expiry_reminder',
    jsonb_build_object('center_code',c.code,'license_expires_at',c.license_expires_at,'days_before',d.days),
    format('license:%s:%s:%s',c.id,c.license_expires_at,d.days)
  from public.centers c
  cross join unnest(p_days_before) as d(days)
  where c.status in ('active','suspended') and c.license_expires_at=p_as_of+d.days
  on conflict(idempotency_key) do nothing;
  get diagnostics queued=row_count;
  return queued;
end;$$;

create or replace function public.claim_message_deliveries(p_limit integer default 25)
returns setof public.message_outbox language plpgsql security definer set search_path=pg_catalog,public,private as $$
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'Service role required'; end if;
  if p_limit not between 1 and 100 then raise exception 'Invalid claim limit'; end if;
  return query
  with due as (
    select id from public.message_outbox
    where (status in ('pending','retry_wait') and next_attempt_at<=now())
       or (status='processing' and processing_started_at<now()-interval '15 minutes')
    order by next_attempt_at,created_at for update skip locked limit p_limit
  ), claimed as (
    update public.message_outbox o set status='processing',processing_started_at=now()
    from due where o.id=due.id returning o.*
  ) select * from claimed;
end;$$;

create or replace function public.record_message_delivery(
  p_outbox_id uuid,p_channel public.message_channel,p_succeeded boolean,p_provider_message_id text default null,p_error_code text default null
) returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare item public.message_outbox%rowtype; n integer; terminal boolean;
begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'Service role required'; end if;
  select * into item from public.message_outbox where id=p_outbox_id for update;
  if not found or item.status<>'processing' then raise exception 'Claimed delivery not found'; end if;
  if (p_succeeded and (char_length(coalesce(p_provider_message_id,'')) not between 1 and 255 or p_error_code is not null))
     or (not p_succeeded and coalesce(p_error_code,'')!~'^[A-Z0-9_:-]{2,80}$') then raise exception 'Invalid delivery result'; end if;
  n:=item.attempt_count+1; terminal:=not p_succeeded and n>=5;
  insert into public.message_delivery_attempts(outbox_id,center_id,attempt_number,channel,succeeded,provider_message_id,error_code)
  values(item.id,item.center_id,n,p_channel,p_succeeded,p_provider_message_id,p_error_code);
  update public.message_outbox set attempt_count=n,
    status=case when p_succeeded then 'delivered'::public.message_delivery_status when terminal then 'dead_letter'::public.message_delivery_status else 'retry_wait'::public.message_delivery_status end,
    delivered_at=case when p_succeeded then now() else null end,
    provider_message_id=case when p_succeeded then p_provider_message_id else null end,
    last_error_code=case when p_succeeded then null else p_error_code end,
    last_error_at=case when p_succeeded then null else now() end,
    next_attempt_at=case when p_succeeded or terminal then next_attempt_at else now()+make_interval(mins=>least(360,power(2,n)::integer*5)) end,
    processing_started_at=null where id=item.id;
end;$$;

create or replace function public.retry_dead_letter_message(p_outbox_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare item public.message_outbox%rowtype;
begin
  if not private.is_super_admin() or not private.mfa_satisfied() then raise exception 'Super Admin AAL2 required'; end if;
  select * into item from public.message_outbox where id=p_outbox_id for update;
  if not found or item.status<>'dead_letter' or item.attempt_count>=20 then raise exception 'Retryable dead-letter message not found'; end if;
  update public.message_outbox set status='pending',next_attempt_at=now(),processing_started_at=null,last_error_code=null,last_error_at=null where id=item.id;
  perform private.write_audit_log(item.center_id,'message.dead_letter_requeued','message_outbox',item.id,jsonb_build_object('previous_attempt_count',item.attempt_count));
end;$$;

-- Migration 048 widened the table constraint; widen the enqueue RPC validation as well.
create or replace function public.queue_drive_cleanup(p_center_id uuid,p_drive_file_id text,p_drive_path_key text,p_source_type text,p_reason text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare rid uuid;actor_role public.user_role;
begin
 actor_role:=private.current_role();if actor_role not in('owner','operator')or not private.mfa_satisfied()then raise exception'Operational MFA required';end if;if p_center_id<>private.current_center_id()then raise exception'Center mismatch';end if;if char_length(p_drive_file_id)not between 10 and 255 or char_length(p_drive_path_key)not between 5 and 500 or p_source_type not in('application_document','staff_document','center_logo','license_evidence','pdf_archive')or char_length(trim(p_reason))not between 5 and 500 then raise exception'Invalid cleanup record';end if;
 insert into public.drive_cleanup_queue(center_id,drive_file_id,drive_path_key,source_type,reason,created_by)values(p_center_id,p_drive_file_id,p_drive_path_key,p_source_type,trim(p_reason),auth.uid())on conflict(drive_file_id)do update set reason=excluded.reason,status=case when drive_cleanup_queue.status='resolved'then drive_cleanup_queue.status else'pending'end returning id into rid;
 perform private.write_audit_log(p_center_id,'drive.cleanup_queued','drive_cleanup',rid,jsonb_build_object('source_type',p_source_type,'drive_path_key',p_drive_path_key));return rid;
end;$$;

revoke execute on function public.schedule_license_reminders(date,integer[]),public.claim_message_deliveries(integer),public.record_message_delivery(uuid,public.message_channel,boolean,text,text) from public,anon,authenticated;
grant execute on function public.schedule_license_reminders(date,integer[]),public.claim_message_deliveries(integer),public.record_message_delivery(uuid,public.message_channel,boolean,text,text) to service_role;
revoke execute on function public.retry_dead_letter_message(uuid) from public,anon;
grant execute on function public.retry_dead_letter_message(uuid) to authenticated;
revoke all on function private.enqueue_application_notification() from public,anon,authenticated;
comment on table public.message_outbox is 'Provider-neutral event facts waiting for an approved-template delivery worker; rows are not proof of delivery.';
comment on function public.schedule_license_reminders(date,integer[]) is 'Idempotently schedules reminders only for the externally approved day offsets supplied by trusted infrastructure.';
