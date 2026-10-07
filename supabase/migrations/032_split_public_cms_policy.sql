-- Keep anonymous CMS reads independent from private role helpers.
drop policy cms_public_read on public.cms_pages;
create policy cms_published_read on public.cms_pages
for select to anon,authenticated using(status='published');
create policy cms_super_admin_read on public.cms_pages
for select to authenticated using(private.is_super_admin()and private.mfa_satisfied());
