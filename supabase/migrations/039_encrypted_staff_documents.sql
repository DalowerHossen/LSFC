-- Encrypted staff identity/photo/signature metadata; encrypted bytes remain private in Google Drive.
create table public.staff_documents(
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references public.profiles(id),
 center_id uuid not null references public.centers(id),
 document_type text not null check(document_type in('nid','photo','signature')),
 drive_file_id text not null unique check(char_length(drive_file_id) between 10 and 255),
 encrypted_file_name text not null check(encrypted_file_name ~ '^enc_[a-f0-9]{24}\.bin$'),
 file_hash text not null check(file_hash ~ '^[a-f0-9]{64}$'),
 mime_type text not null check(mime_type in('application/pdf','image/png','image/jpeg','image/webp')),
 plain_size integer not null check(plain_size between 1 and 5242880),
 encrypted_size integer not null check(encrypted_size > plain_size and encrypted_size <= 5242944),
 drive_path_key text not null check(char_length(drive_path_key) between 10 and 500),
 created_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
create index staff_documents_profile_idx on public.staff_documents(profile_id,created_at desc);
create index staff_documents_center_idx on public.staff_documents(center_id,created_at desc);
alter table public.staff_documents enable row level security;
alter table public.staff_documents force row level security;
create policy staff_documents_manager_read on public.staff_documents for select to authenticated using(private.is_center_manager(center_id));
revoke all on public.staff_documents from anon,authenticated;
grant select on public.staff_documents to authenticated;
create trigger staff_documents_immutable before update or delete on public.staff_documents for each row execute function private.prevent_receipt_mutation();

create or replace function public.register_staff_document(p_profile_id uuid,p_document_type text,p_drive_file_id text,p_encrypted_file_name text,p_file_hash text,p_mime_type text,p_plain_size integer,p_encrypted_size integer,p_drive_path_key text) returns uuid language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare staff public.profiles%rowtype;rid uuid;
begin
 if private.current_role()<>'owner' or not private.mfa_satisfied() then raise exception 'Owner MFA required'; end if;
 select p.* into staff from public.profiles p join public.centers c on c.id=p.center_id where p.id=p_profile_id and p.center_id=private.current_center_id() and p.role='operator' and c.status='active';
 if not found then raise exception 'Staff profile not found'; end if;
 if p_document_type not in('nid','photo','signature') or char_length(p_drive_file_id) not between 10 and 255 or p_encrypted_file_name !~ '^enc_[a-f0-9]{24}\.bin$' or p_file_hash !~ '^[a-f0-9]{64}$' or p_mime_type not in('application/pdf','image/png','image/jpeg','image/webp') or p_plain_size not between 1 and 5242880 or p_encrypted_size<=p_plain_size or p_encrypted_size>5242944 or char_length(p_drive_path_key) not between 10 and 500 then raise exception 'Invalid staff document metadata'; end if;
 if p_document_type in('photo','signature') and p_mime_type='application/pdf' then raise exception 'Image required'; end if;
 insert into public.staff_documents(profile_id,center_id,document_type,drive_file_id,encrypted_file_name,file_hash,mime_type,plain_size,encrypted_size,drive_path_key,created_by) values(staff.id,staff.center_id,p_document_type,p_drive_file_id,p_encrypted_file_name,p_file_hash,p_mime_type,p_plain_size,p_encrypted_size,p_drive_path_key,auth.uid()) returning id into rid;
 perform private.write_audit_log(staff.center_id,'staff.document_registered','staff_document',rid,jsonb_build_object('profile_id',staff.id,'document_type',p_document_type,'file_hash',p_file_hash,'plain_size',p_plain_size));
 return rid;
end;$$;
revoke execute on function public.register_staff_document(uuid,text,text,text,text,text,integer,integer,text) from public,anon;
grant execute on function public.register_staff_document(uuid,text,text,text,text,text,integer,integer,text) to authenticated;
comment on table public.staff_documents is 'Immutable metadata for AES-256-GCM staff NID, photo, and signature files.';
