-- Reject an undefined approval decision at the database boundary.
-- Recreate the existing RPC without changing its authorization, locking,
-- store-creation, role-grant, or review-state behavior.

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

  IF p_approve IS NULL THEN
    RAISE EXCEPTION 'An explicit approve or reject decision is required';
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

  -- Serialize approval attempts for the same applicant, including
  -- applications that were submitted separately.
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
