-- Correct Appendix-6 classification: Upazila Sadar uses the same license tier as Pourashava,
-- while Appendix-7 service charges follow the Union/Upazila tier.
alter type public.location_type add value if not exists 'upazila_sadar' after 'union_upazila';
