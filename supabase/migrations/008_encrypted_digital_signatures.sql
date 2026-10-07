-- Phase 1 encrypted Owner digital signatures.
-- Signature bytes remain AES-256-GCM encrypted in Google Drive; PostgreSQL stores metadata only.

create table public.center_signatures (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete restrict,
  drive_file_id text not null unique check (char_length(drive_file_id) between 10 and 255),
  file_hash text not null check (file_hash ~ '^[a-f0-9]{64}$'),
  mime_type text not null check (mime_type in ('image/png', 'image/webp')),
  encrypted_size integer not null check (encrypted_size between 1 and 1048576),
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  superseded_at timestamptz
);

create unique index one_active_signature_per_center
  on public.center_signatures(center_id)
  where is_active = true;
create index center_signatures_center_created_idx
  on public.center_signatures(center_id, created_at desc);

alter table public.receipts
  add column signature_id uuid references public.center_signatures(id) on delete restrict;

create or replace function private.assign_current_signature_to_receipt()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.signature_id is null then
    select signature.id into new.signature_id
    from public.center_signatures as signature
    where signature.center_id = new.center_id
      and signature.is_active = true
    order by signature.created_at desc
    limit 1;
  end if;
  return new;
end;
$$;

create trigger receipts_assign_current_signature
before insert on public.receipts
for each row execute function private.assign_current_signature_to_receipt();

alter table public.center_signatures enable row level security;
alter table public.center_signatures force row level security;

create policy center_signatures_tenant_read on public.center_signatures
for select to authenticated
using (center_id = private.current_center_id() or private.is_super_admin());

create policy center_signatures_mfa_gate on public.center_signatures
as restrictive for select to authenticated
using (private.mfa_satisfied());

grant select on public.center_signatures to authenticated;
revoke insert, update, delete on public.center_signatures from anon, authenticated;

create or replace function public.register_center_signature(
  p_drive_file_id text,
  p_file_hash text,
  p_mime_type text,
  p_encrypted_size integer
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_center uuid;
  new_signature_id uuid;
begin
  if private.current_role() <> 'owner' then
    raise exception 'Only the Center Owner can update the digital signature';
  end if;

  if not private.mfa_satisfied() then
    raise exception 'AAL2 authentication required';
  end if;

  target_center := private.current_center_id();
  if target_center is null then
    raise exception 'No center is assigned';
  end if;

  if char_length(p_drive_file_id) not between 10 and 255
     or p_file_hash !~ '^[a-f0-9]{64}$'
     or p_mime_type not in ('image/png', 'image/webp')
     or p_encrypted_size not between 1 and 1048576 then
    raise exception 'Invalid signature metadata';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_center::text || ':signature', 0));

  update public.center_signatures
  set is_active = false,
      superseded_at = now()
  where center_id = target_center
    and is_active = true;

  insert into public.center_signatures (
    center_id,
    drive_file_id,
    file_hash,
    mime_type,
    encrypted_size,
    created_by
  ) values (
    target_center,
    p_drive_file_id,
    p_file_hash,
    p_mime_type,
    p_encrypted_size,
    auth.uid()
  )
  returning id into new_signature_id;

  perform private.write_audit_log(
    target_center,
    'signature.activated',
    'center_signature',
    new_signature_id,
    jsonb_build_object('file_hash', p_file_hash, 'mime_type', p_mime_type)
  );

  return new_signature_id;
end;
$$;

create or replace function private.prevent_signature_delete()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Digital signature history cannot be deleted';
end;
$$;

create trigger center_signatures_prevent_delete
before delete on public.center_signatures
for each row execute function private.prevent_signature_delete();

revoke execute on function public.register_center_signature(text, text, text, integer)
  from public, anon;
grant execute on function public.register_center_signature(text, text, text, integer)
  to authenticated;

revoke all on function private.assign_current_signature_to_receipt()
  from public, anon, authenticated;
revoke all on function private.prevent_signature_delete()
  from public, anon, authenticated;

comment on table public.center_signatures is
  'Versioned signature metadata. Encrypted bytes are stored privately in Google Drive.';
comment on column public.receipts.signature_id is
  'Signature version captured when the immutable receipt snapshot is created.';
