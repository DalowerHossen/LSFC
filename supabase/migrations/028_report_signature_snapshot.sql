-- Bind the active encrypted Owner signature to each finalized monthly report.
alter table public.monthly_government_reports
add column signature_id uuid references public.center_signatures(id) on delete restrict;
create or replace function private.assign_current_signature_to_monthly_report()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if new.signature_id is null then
  select id into new.signature_id from public.center_signatures
  where center_id=new.center_id and is_active=true order by created_at desc limit 1;
 end if;
 return new;
end;$$;
create trigger monthly_reports_assign_signature before insert on public.monthly_government_reports
for each row execute function private.assign_current_signature_to_monthly_report();
revoke all on function private.assign_current_signature_to_monthly_report()from public,anon,authenticated;
