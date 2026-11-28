-- Temporarily auto-approve new seller applications.
-- Reversible: set enabled=false in public.seller_auto_approval_settings
-- to restore the existing admin-review workflow. Existing rows are untouched.

CREATE TABLE IF NOT EXISTS public.seller_auto_approval_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.seller_auto_approval_settings (singleton, enabled)
VALUES (true, true)
ON CONFLICT (singleton) DO NOTHING;

REVOKE ALL ON public.seller_auto_approval_settings FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.auto_approve_new_seller_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_enabled boolean;
  v_slug text;
BEGIN
  SELECT enabled INTO v_enabled
  FROM public.seller_auto_approval_settings
  WHERE singleton = true;

  IF NOT coalesce(v_enabled, false) THEN
    RETURN NEW;
  END IF;

  -- Existing BEFORE INSERT guard already serializes per-user submissions
  -- and rejects duplicate stores / pending applications.
  IF EXISTS (
    SELECT 1 FROM public.seller_stores WHERE owner_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'User already has a store';
  END IF;

  v_slug := 'store-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);

  INSERT INTO public.seller_stores
    (owner_id, slug, name, description, area, address, phone, status)
  VALUES
    (NEW.user_id, v_slug, NEW.store_name, NEW.description,
     NEW.area, NEW.address, NEW.phone, 'active');

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, 'seller')
  ON CONFLICT (user_id, role) DO NOTHING;

  PERFORM set_config('app.review_application', '1', true);

  UPDATE public.seller_applications
  SET status = 'approved',
      reviewed_at = now()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS seller_applications_auto_approve ON public.seller_applications;

CREATE TRIGGER seller_applications_auto_approve
AFTER INSERT ON public.seller_applications
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_new_seller_application();
