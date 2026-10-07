-- This migration must run after 026 commits the new enum value.
insert into public.service_fees(service_code,location_type,assistance_fee,extra_page_fee,effective_from)
select service_code,'upazila_sadar'::public.location_type,assistance_fee,extra_page_fee,effective_from
from public.service_fees where location_type='union_upazila'
on conflict(service_code,location_type)do nothing;
insert into public.license_fees(location_type,fee,effective_from)
values('upazila_sadar',5000,current_date)
on conflict(location_type)do nothing;
insert into public.service_fee_versions(service_code,location_type,assistance_fee,extra_page_fee,reason,changed_by)
select service_code,'upazila_sadar'::public.location_type,assistance_fee,extra_page_fee,'Initial Upazila Sadar Appendix-7 tier',null
from public.service_fees where location_type='union_upazila';
insert into public.license_fee_versions(location_type,fee,reason,changed_by)
values('upazila_sadar',5000,'Initial Upazila Sadar Appendix-6 tier',null);
