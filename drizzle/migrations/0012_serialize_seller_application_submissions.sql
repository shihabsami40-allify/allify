-- Serialize seller-application submissions per user so concurrent requests
-- cannot both pass the pending-application existence check.
CREATE OR REPLACE FUNCTION public.guard_application_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.status := 'pending';
  NEW.admin_note := NULL;
  NEW.reviewed_at := NULL;

  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'A signed-in applicant is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 0));

  IF EXISTS (
    SELECT 1 FROM public.seller_applications
    WHERE user_id = NEW.user_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'An application is already pending';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.seller_stores
    WHERE owner_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'A store already exists';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_application_insert() FROM PUBLIC, anon, authenticated;
