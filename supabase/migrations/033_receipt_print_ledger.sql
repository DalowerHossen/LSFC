-- Appendix-7 note: preserve an immutable ledger for original and duplicate receipt copies.
create table public.receipt_print_events(
 id uuid primary key default gen_random_uuid(),receipt_id uuid not null references public.receipts(id),center_id uuid not null references public.centers(id),copy_number integer not null check(copy_number>0),fee numeric(12,2)not null check(fee>=0),printed_by uuid not null references public.profiles(id),printed_at timestamptz not null default now(),unique(receipt_id,copy_number)
);
alter table public.receipt_print_events enable row level security;alter table public.receipt_print_events force row level security;
create index receipt_print_events_center_time_idx on public.receipt_print_events(center_id,printed_at desc);
create policy receipt_print_events_tenant_read on public.receipt_print_events for select to authenticated using(private.is_center_manager(center_id)or(center_id=private.current_center_id()and private.current_role()='operator'and private.mfa_satisfied()));
revoke all on public.receipt_print_events from anon,authenticated;grant select on public.receipt_print_events to authenticated;
create trigger receipt_print_events_immutable before update or delete on public.receipt_print_events for each row execute function private.prevent_receipt_mutation();
create or replace function public.register_receipt_print(p_receipt_id uuid)returns table(event_id uuid,copy_number integer,copy_fee numeric)language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_center uuid;v_copy integer;v_fee numeric(12,2);v_event uuid;
begin
 if private.current_role()<>'operator'or not private.mfa_satisfied()then raise exception'Operator access with required MFA is required';end if;
 select r.center_id into v_center from public.receipts r join public.centers c on c.id=r.center_id where r.id=p_receipt_id and r.center_id=private.current_center_id()and c.status='active' for update of r;
 if v_center is null then raise exception'Receipt not found';end if;
 select count(*)::integer+1 into v_copy from public.receipt_print_events e where e.receipt_id=p_receipt_id;
 v_fee:=case when v_copy=1 then 0 else 20 end;
 insert into public.receipt_print_events(receipt_id,center_id,copy_number,fee,printed_by)values(p_receipt_id,v_center,v_copy,v_fee,auth.uid())returning id into v_event;
 perform private.write_audit_log(v_center,'receipt.copy_registered','receipt',p_receipt_id,jsonb_build_object('copy_number',v_copy,'fee',v_fee,'print_event_id',v_event));
 return query select v_event,v_copy,v_fee;
end;$$;
revoke execute on function public.register_receipt_print(uuid)from public,anon;grant execute on function public.register_receipt_print(uuid)to authenticated;
comment on table public.receipt_print_events is 'Immutable original/reprint issue ledger. First copy is free; every later copy is charged BDT 20.';
