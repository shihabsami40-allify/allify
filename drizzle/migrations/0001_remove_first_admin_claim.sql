-- ALLIFY security hardening.
-- The original bootstrap migration contained a first-user admin claim function.
-- Never allow public self-promotion to admin on a public marketplace.
drop function if exists public.claim_first_admin();
