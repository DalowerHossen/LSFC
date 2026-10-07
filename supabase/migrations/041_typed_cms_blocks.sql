-- Typed, versioned CMS blocks avoid arbitrary HTML while allowing element-level public-page editing.
alter table public.cms_pages add column blocks jsonb not null default '[]'::jsonb check(jsonb_typeof(blocks)='array' and jsonb_array_length(blocks)<=30);
alter table public.cms_page_versions add column blocks jsonb not null default '[]'::jsonb check(jsonb_typeof(blocks)='array' and jsonb_array_length(blocks)<=30);

create or replace function public.save_structured_cms_page(p_slug text,p_title text,p_blocks jsonb,p_publish boolean)returns uuid language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare page public.cms_pages%rowtype;rid uuid;new_status public.publication_status;plain_content text;
begin
 if not private.is_super_admin()or not private.mfa_satisfied()then raise exception'Super Admin AAL2 required';end if;
 if trim(p_slug)!~'^[a-z0-9-]{2,60}$'or char_length(trim(p_title))not between 2 and 160 or jsonb_typeof(p_blocks)<>'array'or jsonb_array_length(p_blocks)not between 1 and 30 then raise exception'Invalid structured page';end if;
 if exists(select 1 from jsonb_array_elements(p_blocks)b where b->>'type'not in('heading','paragraph','callout','link')or
  case b->>'type'
   when'heading'then(b-'type'-'level'-'text'<>'{}'::jsonb or(b->>'level')not in('2','3')or char_length(trim(b->>'text'))not between 2 and 200)
   when'paragraph'then(b-'type'-'text'<>'{}'::jsonb or char_length(trim(b->>'text'))not between 2 and 3000)
   when'callout'then(b-'type'-'tone'-'text'<>'{}'::jsonb or(b->>'tone')not in('info','warning','success')or char_length(trim(b->>'text'))not between 2 and 1000)
   when'link'then(b-'type'-'label'-'href'<>'{}'::jsonb or char_length(trim(b->>'label'))not between 2 and 120 or char_length(b->>'href')>500 or(b->>'href')!~'^(\/|https:\/\/)[^[:space:]]+$')
   else true end)then raise exception'Invalid CMS block';end if;
 select string_agg(trim(coalesce(b->>'text',b->>'label')),'\n\n')into plain_content from jsonb_array_elements(p_blocks)b;
 if char_length(plain_content)not between 10 and 50000 then raise exception'Invalid page content';end if;
 new_status:=case when p_publish then'published'::public.publication_status else'draft'::public.publication_status end;
 select * into page from public.cms_pages where slug=trim(p_slug)for update;
 if found then
  update public.cms_pages set title=trim(p_title),content=plain_content,blocks=p_blocks,status=new_status,version=page.version+1,updated_by=auth.uid(),published_at=case when p_publish then now()else page.published_at end where id=page.id returning id into rid;
  insert into public.cms_page_versions(page_id,version,title,content,blocks,status,changed_by)values(page.id,page.version+1,trim(p_title),plain_content,p_blocks,new_status,auth.uid());
 else
  insert into public.cms_pages(slug,title,content,blocks,status,created_by,updated_by,published_at)values(trim(p_slug),trim(p_title),plain_content,p_blocks,new_status,auth.uid(),auth.uid(),case when p_publish then now()end)returning id into rid;
  insert into public.cms_page_versions(page_id,version,title,content,blocks,status,changed_by)values(rid,1,trim(p_title),plain_content,p_blocks,new_status,auth.uid());
 end if;
 perform private.write_audit_log(null,'cms.structured_page_saved','cms_page',rid,jsonb_build_object('slug',trim(p_slug),'status',new_status,'block_count',jsonb_array_length(p_blocks)));
 return rid;
end;$$;
revoke execute on function public.save_structured_cms_page(text,text,jsonb,boolean)from public,anon;
grant execute on function public.save_structured_cms_page(text,text,jsonb,boolean)to authenticated;
comment on column public.cms_pages.blocks is'Allowlisted heading, paragraph, callout, and link blocks; rendered without raw HTML.';
