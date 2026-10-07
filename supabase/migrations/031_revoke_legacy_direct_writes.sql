-- Remove legacy column grants that bypass audited RPC workflows.
-- Existing RLS policies remain defense-in-depth but no authenticated role can directly mutate these records.
revoke insert on public.centers from authenticated;
revoke update(name,address,phone,email)on public.centers from authenticated;
revoke update(full_name,phone)on public.profiles from authenticated;
comment on table public.centers is 'Center creation and lifecycle/profile changes must use audited privileged workflows.';
comment on table public.profiles is 'Role, Center assignment, activation, and profile changes must use audited workflows.';
