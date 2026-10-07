-- Owner-managed least-privilege controls for each Operator.
create table public.operator_permissions(
 profile_id uuid primary key references public.profiles(id),center_id uuid not null references public.centers(id),can_create_application boolean not null default true,can_update_status boolean not null default true,can_print_receipt boolean not null default true,can_request_correction boolean not null default true,updated_by uuid not null references public.profiles(id),updated_at timestamptz not null default now()
);
create index operator_permissions_center_idx on public.operator_permissions(center_id);
create trigger operator_permissions_set_updated_at before update on public.operator_permissions for each row execute function private.set_updated_at();
alter table public.operator_permissions enable row level security;alter table public.operator_permissions force row level security;
create policy operator_permissions_owner_read on public.operator_permissions for select to authenticated using(private.is_center_manager(center_id));
create policy operator_permissions_self_read on public.operator_permissions for select to authenticated using(profile_id=auth.uid()and center_id=private.current_center_id()and private.current_role()='operator');
revoke all on public.operator_permissions from anon,authenticated;grant select on public.operator_permissions to authenticated;

create or replace function private.operator_has_permission(permission_name text)returns boolean language sql stable security definer set search_path=pg_catalog,public,private as $$
 select case when private.current_role()<>'operator'then true else coalesce((select case permission_name when'application.create'then p.can_create_application when'application.status'then p.can_update_status when'receipt.print'then p.can_print_receipt when'correction.request'then p.can_request_correction else false end from public.operator_permissions p where p.profile_id=auth.uid()and p.center_id=private.current_center_id()),true)end;
$$;
create or replace function private.enforce_operator_permission()returns trigger language plpgsql security definer set search_path=pg_catalog,public,private as $$begin
 if private.current_role()<>'operator'then return new;end if;
 if tg_table_name='applications'and tg_op='INSERT'and not private.operator_has_permission('application.create')then raise exception'Application creation permission denied';end if;
 if tg_table_name='applications'and tg_op='UPDATE'and new.status is distinct from old.status and not private.operator_has_permission('application.status')then raise exception'Status update permission denied';end if;
 if tg_table_name='receipt_print_events'and not private.operator_has_permission('receipt.print')then raise exception'Receipt print permission denied';end if;
 if tg_table_name='edit_requests'and not private.operator_has_permission('correction.request')then raise exception'Correction request permission denied';end if;
 return new;
end;$$;
create trigger applications_operator_permission before insert or update on public.applications for each row execute function private.enforce_operator_permission();
create trigger receipt_print_operator_permission before insert on public.receipt_print_events for each row execute function private.enforce_operator_permission();
create trigger edit_request_operator_permission before insert on public.edit_requests for each row execute function private.enforce_operator_permission();

create or replace function public.set_operator_permissions(p_profile_id uuid,p_can_create_application boolean,p_can_update_status boolean,p_can_print_receipt boolean,p_can_request_correction boolean)returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$declare cid uuid;begin
 if private.current_role()<>'owner'or not private.mfa_satisfied()then raise exception'Owner AAL2 required';end if;cid:=private.current_center_id();if not exists(select 1 from public.profiles where id=p_profile_id and center_id=cid and role='operator')then raise exception'Operator not found';end if;
 insert into public.operator_permissions(profile_id,center_id,can_create_application,can_update_status,can_print_receipt,can_request_correction,updated_by)values(p_profile_id,cid,p_can_create_application,p_can_update_status,p_can_print_receipt,p_can_request_correction,auth.uid())on conflict(profile_id)do update set can_create_application=excluded.can_create_application,can_update_status=excluded.can_update_status,can_print_receipt=excluded.can_print_receipt,can_request_correction=excluded.can_request_correction,updated_by=auth.uid();
 perform private.write_audit_log(cid,'operator.permissions_updated','profile',p_profile_id,jsonb_build_object('create_application',p_can_create_application,'update_status',p_can_update_status,'print_receipt',p_can_print_receipt,'request_correction',p_can_request_correction));
end;$$;
revoke all on function private.operator_has_permission(text),private.enforce_operator_permission()from public,anon,authenticated;revoke execute on function public.set_operator_permissions(uuid,boolean,boolean,boolean,boolean)from public,anon;grant execute on function public.set_operator_permissions(uuid,boolean,boolean,boolean,boolean)to authenticated;
comment on table public.operator_permissions is 'Owner-managed per-Operator permissions; missing rows retain backwards-compatible operational defaults.';
