-- Phase 1 center profile, license renewal, and compliance controls.
create type public.license_renewal_status as enum ('pending','approved','rejected');
create type public.compliance_requirement as enum ('dc_approval','valid_license','rate_chart','signboard','citizen_consent','complaint_box','secure_records','inspection_register');

create table public.license_renewal_requests (
 id uuid primary key default gen_random_uuid(), center_id uuid not null references public.centers(id) on delete restrict,
 current_license_number text, current_expires_at date, requested_license_number text,
 requested_expires_at date not null, owner_note text not null check(char_length(owner_note) between 10 and 1000),
 status public.license_renewal_status not null default 'pending', requested_by uuid not null references public.profiles(id) on delete restrict,
 reviewed_by uuid references public.profiles(id) on delete restrict, review_note text, requested_at timestamptz not null default now(), reviewed_at timestamptz,
 check(requested_expires_at>coalesce(current_expires_at,'1900-01-01'::date))
);
create unique index one_pending_license_renewal_per_center on public.license_renewal_requests(center_id) where status='pending';
create index license_renewals_status_created_idx on public.license_renewal_requests(status,requested_at desc);

create table public.license_renewal_events (
 id uuid primary key default gen_random_uuid(), request_id uuid not null references public.license_renewal_requests(id) on delete restrict,
 center_id uuid not null references public.centers(id) on delete restrict, event_status public.license_renewal_status not null,
 note text not null, actor_id uuid not null references public.profiles(id) on delete restrict, created_at timestamptz not null default now()
);
create table public.center_compliance_checks (
 center_id uuid not null references public.centers(id) on delete restrict, requirement public.compliance_requirement not null,
 is_compliant boolean not null default false, note text, attested_by uuid not null references public.profiles(id) on delete restrict,
 attested_at timestamptz not null default now(), primary key(center_id,requirement)
);
create table public.center_compliance_history (
 id uuid primary key default gen_random_uuid(), center_id uuid not null references public.centers(id) on delete restrict,
 requirement public.compliance_requirement not null, previous_state boolean, new_state boolean not null,
 note text, changed_by uuid not null references public.profiles(id) on delete restrict, changed_at timestamptz not null default now()
);

create or replace function private.prevent_compliance_history_mutation() returns trigger language plpgsql set search_path=pg_catalog as $$ begin raise exception 'Compliance history is immutable'; end; $$;
create trigger license_renewal_events_immutable before update or delete on public.license_renewal_events for each row execute function private.prevent_compliance_history_mutation();
create trigger center_compliance_history_immutable before update or delete on public.center_compliance_history for each row execute function private.prevent_compliance_history_mutation();

alter table public.license_renewal_requests enable row level security; alter table public.license_renewal_requests force row level security;
alter table public.license_renewal_events enable row level security; alter table public.license_renewal_events force row level security;
alter table public.center_compliance_checks enable row level security; alter table public.center_compliance_checks force row level security;
alter table public.center_compliance_history enable row level security; alter table public.center_compliance_history force row level security;
create policy renewal_request_read on public.license_renewal_requests for select to authenticated using(private.is_super_admin() or (private.current_role()='owner' and center_id=private.current_center_id()));
create policy renewal_events_read on public.license_renewal_events for select to authenticated using(private.is_super_admin() or (private.current_role()='owner' and center_id=private.current_center_id()));
create policy compliance_check_read on public.center_compliance_checks for select to authenticated using(private.is_super_admin() or (private.current_role()='owner' and center_id=private.current_center_id()));
create policy compliance_history_read on public.center_compliance_history for select to authenticated using(private.is_super_admin() or (private.current_role()='owner' and center_id=private.current_center_id()));
create policy renewal_request_mfa on public.license_renewal_requests as restrictive for select to authenticated using(private.mfa_satisfied());
create policy renewal_events_mfa on public.license_renewal_events as restrictive for select to authenticated using(private.mfa_satisfied());
create policy compliance_check_mfa on public.center_compliance_checks as restrictive for select to authenticated using(private.mfa_satisfied());
create policy compliance_history_mfa on public.center_compliance_history as restrictive for select to authenticated using(private.mfa_satisfied());
grant select on public.license_renewal_requests,public.license_renewal_events,public.center_compliance_checks,public.center_compliance_history to authenticated;

create or replace function public.submit_license_renewal(p_requested_license_number text,p_requested_expires_at date,p_owner_note text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare c public.centers%rowtype; result uuid;
begin
 if private.current_role()<>'owner' or not private.mfa_satisfied() then raise exception 'Active Center Owner AAL2 authentication required'; end if;
 select * into c from public.centers where id=private.current_center_id();
 if p_requested_expires_at<=coalesce(c.license_expires_at,current_date) or p_requested_expires_at>current_date+interval '3 years' or char_length(trim(p_owner_note)) not between 10 and 1000 or char_length(coalesce(p_requested_license_number,''))>120 then raise exception 'Renewal information is invalid'; end if;
 insert into public.license_renewal_requests(center_id,current_license_number,current_expires_at,requested_license_number,requested_expires_at,owner_note,requested_by)
 values(c.id,c.license_number,c.license_expires_at,nullif(trim(p_requested_license_number),''),p_requested_expires_at,trim(p_owner_note),auth.uid()) returning id into result;
 insert into public.license_renewal_events(request_id,center_id,event_status,note,actor_id) values(result,c.id,'pending',trim(p_owner_note),auth.uid());
 perform private.write_audit_log(c.id,'license.renewal_submitted','license_renewal',result,jsonb_build_object('requested_expires_at',p_requested_expires_at)); return result;
exception when unique_violation then raise exception 'A renewal request is already pending'; end; $$;

create or replace function public.review_license_renewal(p_request_id uuid,p_approve boolean,p_review_note text)
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare r public.license_renewal_requests%rowtype; result_status public.license_renewal_status;
begin
 if not private.is_super_admin() or not private.mfa_satisfied() then raise exception 'Super Admin AAL2 authentication required'; end if;
 if char_length(trim(p_review_note)) not between 10 and 1000 then raise exception 'Review note is required'; end if;
 select * into r from public.license_renewal_requests where id=p_request_id for update; if not found or r.status<>'pending' then raise exception 'Pending renewal not found'; end if;
 result_status:=case when p_approve then 'approved'::public.license_renewal_status else 'rejected'::public.license_renewal_status end;
 update public.license_renewal_requests set status=result_status,reviewed_by=auth.uid(),review_note=trim(p_review_note),reviewed_at=now() where id=r.id;
 if p_approve then update public.centers set license_number=coalesce(r.requested_license_number,license_number),license_expires_at=r.requested_expires_at where id=r.center_id; end if;
 insert into public.license_renewal_events(request_id,center_id,event_status,note,actor_id) values(r.id,r.center_id,result_status,trim(p_review_note),auth.uid());
 perform private.write_audit_log(r.center_id,case when p_approve then 'license.renewal_approved' else 'license.renewal_rejected' end,'license_renewal',r.id,jsonb_build_object('requested_expires_at',r.requested_expires_at));
end; $$;

create or replace function public.attest_center_compliance(p_requirement public.compliance_requirement,p_is_compliant boolean,p_note text default null)
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare cid uuid; old_state boolean;
begin
 if private.current_role()<>'owner' or not private.mfa_satisfied() then raise exception 'Active Center Owner AAL2 authentication required'; end if;
 if p_is_compliant is null or char_length(coalesce(p_note,''))>500 then raise exception 'Compliance information is invalid'; end if; cid:=private.current_center_id();
 select is_compliant into old_state from public.center_compliance_checks where center_id=cid and requirement=p_requirement for update;
 insert into public.center_compliance_checks(center_id,requirement,is_compliant,note,attested_by,attested_at) values(cid,p_requirement,p_is_compliant,nullif(trim(p_note),''),auth.uid(),now()) on conflict(center_id,requirement) do update set is_compliant=excluded.is_compliant,note=excluded.note,attested_by=excluded.attested_by,attested_at=excluded.attested_at;
 insert into public.center_compliance_history(center_id,requirement,previous_state,new_state,note,changed_by) values(cid,p_requirement,old_state,p_is_compliant,nullif(trim(p_note),''),auth.uid());
 perform private.write_audit_log(cid,'compliance.attested','center_compliance',null,jsonb_build_object('requirement',p_requirement,'previous_state',old_state,'new_state',p_is_compliant));
end; $$;

revoke execute on function public.submit_license_renewal(text,date,text),public.review_license_renewal(uuid,boolean,text),public.attest_center_compliance(public.compliance_requirement,boolean,text) from public,anon;
grant execute on function public.submit_license_renewal(text,date,text),public.review_license_renewal(uuid,boolean,text),public.attest_center_compliance(public.compliance_requirement,boolean,text) to authenticated;
revoke all on function private.prevent_compliance_history_mutation() from public,anon,authenticated;
