-- Capture trusted request context supplied to PostgREST without changing the hash formula.
create or replace function private.write_audit_log(target_center uuid,action_name text,target_type text,target_id uuid,safe_metadata jsonb default'{}'::jsonb)
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare prior_hash text;created_time timestamptz:=clock_timestamp();calculated_hash text;request_headers jsonb:='{}'::jsonb;client_ip inet;agent text;
begin
 perform pg_advisory_xact_lock(hashtextextended(coalesce(target_center::text,'global'),0));
 begin request_headers:=coalesce(nullif(current_setting('request.headers',true),'')::jsonb,'{}'::jsonb);exception when others then request_headers:='{}'::jsonb;end;
 begin client_ip:=nullif(split_part(coalesce(request_headers->>'x-forwarded-for',request_headers->>'x-real-ip',''),',',1),'')::inet;exception when others then client_ip:=null;end;
 agent:=left(nullif(request_headers->>'user-agent',''),500);
 safe_metadata:=safe_metadata||jsonb_strip_nulls(jsonb_build_object('_request_ip',client_ip::text,'_user_agent',agent));
 select entry_hash into prior_hash from public.audit_logs where center_id is not distinct from target_center order by sequence_number desc limit 1;
 calculated_hash:=encode(digest(coalesce(prior_hash,'')||'|'||coalesce(auth.uid()::text,'system')||'|'||action_name||'|'||target_type||'|'||coalesce(target_id::text,'')||'|'||created_time::text||'|'||safe_metadata::text,'sha256'),'hex');
 insert into public.audit_logs(center_id,actor_id,action,entity_type,entity_id,metadata,previous_hash,entry_hash,ip_address,user_agent,created_at)values(target_center,auth.uid(),action_name,target_type,target_id,safe_metadata,prior_hash,calculated_hash,client_ip,agent,created_time);
end;$$;
revoke execute on function private.write_audit_log(uuid,text,text,uuid,jsonb)from public,anon,authenticated;
