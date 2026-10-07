-- Phase 1 security monitoring and cryptographic audit-chain verification.
create type public.security_severity as enum ('info','warning','critical');
create table public.security_events(id uuid primary key default gen_random_uuid(),center_id uuid references public.centers(id) on delete restrict,actor_id uuid references public.profiles(id) on delete restrict,event_type text not null check(event_type in('access_denied','integration_failure','audit_integrity','mfa_change','suspicious_request')),severity public.security_severity not null,summary text not null check(char_length(summary) between 3 and 500),metadata jsonb not null default '{}'::jsonb,ip_address inet,user_agent text,created_at timestamptz not null default now());
create index security_events_severity_created_idx on public.security_events(severity,created_at desc);
create or replace function private.prevent_security_event_mutation()returns trigger language plpgsql set search_path=pg_catalog as $$begin raise exception 'Security events are immutable';end;$$;
create trigger security_events_immutable before update or delete on public.security_events for each row execute function private.prevent_security_event_mutation();
alter table public.security_events enable row level security;alter table public.security_events force row level security;create policy security_events_super_read on public.security_events for select to authenticated using(private.is_super_admin()and private.mfa_satisfied());grant select on public.security_events to authenticated;
create or replace function public.record_security_event(p_event_type text,p_severity public.security_severity,p_summary text,p_metadata jsonb default '{}'::jsonb)returns uuid language plpgsql security definer set search_path=pg_catalog,public,private as $$declare rid uuid;begin if auth.uid()is null then raise exception 'Authentication required';end if;if p_event_type not in('access_denied','integration_failure','audit_integrity','mfa_change','suspicious_request')or char_length(trim(p_summary))not between 3 and 500 or jsonb_typeof(p_metadata)<>'object'then raise exception 'Invalid security event';end if;insert into public.security_events(center_id,actor_id,event_type,severity,summary,metadata)values(private.current_center_id(),auth.uid(),p_event_type,p_severity,trim(p_summary),p_metadata)returning id into rid;return rid;end;$$;

create or replace function public.verify_audit_chains()
returns table(chain_center_id uuid,entry_count bigint,chain_valid boolean,first_invalid_sequence bigint)
language plpgsql stable security definer set search_path=pg_catalog,public,private as $$
declare chain record;item public.audit_logs%rowtype;expected_previous text;expected_hash text;valid boolean;bad bigint;total bigint;
begin
 if not private.is_super_admin()or not private.mfa_satisfied()then raise exception 'Super Admin AAL2 required';end if;
 for chain in select distinct center_id from public.audit_logs loop
  expected_previous:=null;valid:=true;bad:=null;total:=0;
  for item in select * from public.audit_logs where center_id is not distinct from chain.center_id order by sequence_number loop
   total:=total+1;
   expected_hash:=encode(digest(coalesce(expected_previous,'')||'|'||coalesce(item.actor_id::text,'system')||'|'||item.action||'|'||item.entity_type||'|'||coalesce(item.entity_id::text,'')||'|'||item.created_at::text||'|'||item.metadata::text,'sha256'),'hex');
   if valid and(item.previous_hash is distinct from expected_previous or item.entry_hash<>expected_hash)then valid:=false;bad:=item.sequence_number;end if;
   expected_previous:=item.entry_hash;
  end loop;
  chain_center_id:=chain.center_id;entry_count:=total;chain_valid:=valid;first_invalid_sequence:=bad;return next;
 end loop;
end;$$;
revoke execute on function public.record_security_event(text,public.security_severity,text,jsonb)from public,anon;grant execute on function public.record_security_event(text,public.security_severity,text,jsonb)to authenticated;revoke execute on function public.verify_audit_chains()from public,anon;grant execute on function public.verify_audit_chains()to authenticated;revoke all on function private.prevent_security_event_mutation()from public,anon,authenticated;
