-- Phase 1 global government-service availability controls.
-- Disabled services disappear from all non-Super-Admin catalogues immediately,
-- while existing applications remain available for normal completion.

create table public.service_availability_history (
  id uuid primary key default gen_random_uuid(),
  service_code text not null references public.services(code) on delete restrict,
  previous_state boolean not null,
  new_state boolean not null,
  reason text not null check (char_length(reason) between 10 and 500),
  changed_by uuid not null references public.profiles(id) on delete restrict,
  changed_at timestamptz not null default now(),
  check (previous_state <> new_state)
);
create index service_availability_history_service_changed_idx
  on public.service_availability_history(service_code, changed_at desc);

alter table public.service_availability_history enable row level security;
alter table public.service_availability_history force row level security;
create policy service_availability_history_super_read
on public.service_availability_history for select to authenticated
using (private.is_super_admin() and private.mfa_satisfied());
grant select on public.service_availability_history to authenticated;

create or replace function private.prevent_service_history_mutation()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin raise exception 'Service availability history is immutable'; end; $$;
create trigger service_availability_history_immutable
before update or delete on public.service_availability_history
for each row execute function private.prevent_service_history_mutation();

create or replace function public.set_service_availability(
  p_service_code text,
  p_is_active boolean,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  previous_state boolean;
begin
  if not private.is_super_admin() or not private.mfa_satisfied() then
    raise exception 'Super Admin AAL2 authentication required';
  end if;
  if p_is_active is null or char_length(trim(p_reason)) not between 10 and 500 then
    raise exception 'Target state and a reason of 10 to 500 characters are required';
  end if;

  select is_active into previous_state
  from public.services where code = p_service_code for update;
  if not found then raise exception 'Service not found'; end if;
  if previous_state = p_is_active then raise exception 'Service already has the requested state'; end if;

  update public.services set is_active = p_is_active where code = p_service_code;
  insert into public.service_availability_history
    (service_code, previous_state, new_state, reason, changed_by)
  values (p_service_code, previous_state, p_is_active, trim(p_reason), auth.uid());

  perform private.write_audit_log(
    null,
    case when p_is_active then 'service.globally_enabled' else 'service.globally_disabled' end,
    'service',
    null,
    jsonb_build_object(
      'service_code', p_service_code,
      'previous_state', previous_state,
      'new_state', p_is_active,
      'reason', trim(p_reason)
    )
  );
end;
$$;

revoke execute on function public.set_service_availability(text, boolean, text)
from public, anon;
grant execute on function public.set_service_availability(text, boolean, text)
to authenticated;
revoke all on function private.prevent_service_history_mutation()
from public, anon, authenticated;

comment on table public.service_availability_history is
  'Append-only global rollout history for the 14 government services.';
comment on function public.set_service_availability(text, boolean, text) is
  'AAL2 Super Admin-only global ON/OFF control. Existing applications are unaffected.';
