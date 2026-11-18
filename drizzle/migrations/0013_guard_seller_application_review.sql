-- Restrict seller-application status changes to the atomic review RPC.
-- Also serialize approval attempts for the same applicant, including legacy duplicate applications.
CREATE OR REPLACE FUNCTION public.guard_seller_application_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (to_jsonb(NEW) - ARRAY['status','admin_note','reviewed_at'])
     IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['status','admin_note','reviewed_at']) THEN
    RAISE EXCEPTION 'Submitted application details cannot be changed';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status
     AND coalesce(current_setting('app.review_application', true), '') <> '1' THEN
    RAISE EXCEPTION 'Application status must be changed through the review action';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER seller_applications_update_guard
BEFORE UPDATE ON public.seller_applications
FOR EACH ROW EXECUTE FUNCTION public.guard_seller_application_update();

REVOKE ALL ON FUNCTION public.guard_seller_application_update() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.review_seller_application(
  p_app_id uuid,
  p_approve boolean,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_app public.seller_applications%ROWTYPE;
  v_store uuid;
  v_slug text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO v_app
  FROM public.seller_applications
  WHERE id = p_app_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;
  IF v_app.status <> 'pending' THEN
    RAISE EXCEPTION 'Already reviewed';
  END IF;

  IF NOT p_approve THEN
    PERFORM set_config('app.review_application', '1', true);
    UPDATE public.seller_applications
    SET status = 'rejected',
        admin_note = left(p_note, 500),
        reviewed_at = now()
    WHERE id = p_app_id;
    RETURN NULL;
  END IF;

  IF v_app.user_id IS NULL THEN
    RAISE EXCEPTION 'Demo application has no account';
  END IF;

  -- Serialize approval attempts for the same applicant, not only one application row.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_app.user_id::text, 0));

  IF EXISTS (
    SELECT 1 FROM public.seller_stores
    WHERE owner_id = v_app.user_id
  ) THEN
    RAISE EXCEPTION 'User already has a store';
  END IF;

  v_slug := 'store-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  INSERT INTO public.seller_stores
    (owner_id, slug, name, description, area, address, phone, status)
  VALUES
    (v_app.user_id, v_slug, v_app.store_name, v_app.description,
     v_app.area, v_app.address, v_app.phone, 'active')
  RETURNING id INTO v_store;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_app.user_id, 'seller')
  ON CONFLICT DO NOTHING;

  PERFORM set_config('app.review_application', '1', true);
  UPDATE public.seller_applications
  SET status = 'approved',
      admin_note = left(p_note, 500),
      reviewed_at = now()
  WHERE id = p_app_id;

  RETURN v_store;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.review_seller_application(uuid, boolean, text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.review_seller_application(uuid, boolean, text) TO authenticated;
