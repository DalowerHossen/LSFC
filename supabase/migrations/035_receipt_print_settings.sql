-- Tenant-scoped receipt preferences. Branding remains bounded to safe plain text.
create table public.center_receipt_settings(
 center_id uuid primary key references public.centers(id),default_format text not null default'80mm'check(default_format in('58mm','80mm','a4-half')),header_text text check(header_text is null or char_length(header_text)between 2 and 120),footer_message text check(footer_message is null or char_length(footer_message)between 2 and 300),show_center_phone boolean not null default true,updated_by uuid not null references public.profiles(id),updated_at timestamptz not null default now()
);
create trigger center_receipt_settings_set_updated_at before update on public.center_receipt_settings for each row execute function private.set_updated_at();
alter table public.center_receipt_settings enable row level security;alter table public.center_receipt_settings force row level security;
create policy center_receipt_settings_tenant_read on public.center_receipt_settings for select to authenticated using(private.is_center_manager(center_id)or(center_id=private.current_center_id()and private.current_role()='operator'and private.mfa_satisfied()));
revoke all on public.center_receipt_settings from anon,authenticated;grant select on public.center_receipt_settings to authenticated;
create or replace function public.save_receipt_settings(p_default_format text,p_header_text text,p_footer_message text,p_show_center_phone boolean)returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$declare cid uuid;begin
 if private.current_role()<>'owner'or not private.mfa_satisfied()then raise exception'Owner AAL2 required';end if;cid:=private.current_center_id();if cid is null or not exists(select 1 from public.centers where id=cid and status='active')then raise exception'Active center required';end if;
 if p_default_format not in('58mm','80mm','a4-half')or(p_header_text is not null and char_length(trim(p_header_text))not between 2 and 120)or(p_footer_message is not null and char_length(trim(p_footer_message))not between 2 and 300)then raise exception'Invalid receipt settings';end if;
 insert into public.center_receipt_settings(center_id,default_format,header_text,footer_message,show_center_phone,updated_by)values(cid,p_default_format,nullif(trim(p_header_text),''),nullif(trim(p_footer_message),''),p_show_center_phone,auth.uid())on conflict(center_id)do update set default_format=excluded.default_format,header_text=excluded.header_text,footer_message=excluded.footer_message,show_center_phone=excluded.show_center_phone,updated_by=auth.uid();
 perform private.write_audit_log(cid,'receipt.settings_updated','center',cid,jsonb_build_object('default_format',p_default_format,'show_center_phone',p_show_center_phone));
end;$$;
revoke execute on function public.save_receipt_settings(text,text,text,boolean)from public,anon;grant execute on function public.save_receipt_settings(text,text,text,boolean)to authenticated;
comment on table public.center_receipt_settings is 'Audited tenant receipt format and safe text preferences; no HTML is accepted.';
