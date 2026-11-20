-- Add defense-in-depth guards for direct table writes.
-- The application still uses the validated RPCs for checkout and moderation.

CREATE OR REPLACE FUNCTION public.guard_order_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.phone IS NULL OR NEW.phone !~ '^01[3-9][0-9]{8}$'
     OR NEW.recipient IS NULL OR char_length(btrim(NEW.recipient)) NOT BETWEEN 2 AND 100
     OR NEW.address_line IS NULL OR char_length(btrim(NEW.address_line)) NOT BETWEEN 5 AND 300 THEN
    RAISE EXCEPTION 'Invalid delivery details';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_demo_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF coalesce(current_setting('app.internal',true),'')='1'
     AND EXISTS (SELECT 1 FROM public.seller_stores WHERE id=OLD.store_id AND is_demo=true) THEN
    RAISE EXCEPTION 'Demo products cannot create real orders';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_product_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin'::public.app_role) THEN
    NEW.rating := 0;
    NEW.sold_count := 0;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_application_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
    WHERE user_id=NEW.user_id AND status='pending'
  ) THEN
    RAISE EXCEPTION 'An application is already pending';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.seller_stores WHERE owner_id=NEW.user_id
  ) THEN
    RAISE EXCEPTION 'A store already exists';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_validate ON public.orders;
CREATE TRIGGER orders_validate BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_order_insert();

DROP TRIGGER IF EXISTS products_demo_guard ON public.products;
CREATE TRIGGER products_demo_guard BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.guard_demo_stock();

DROP TRIGGER IF EXISTS products_insert_guard ON public.products;
CREATE TRIGGER products_insert_guard BEFORE INSERT ON public.products
FOR EACH ROW EXECUTE FUNCTION public.guard_product_insert();

DROP TRIGGER IF EXISTS applications_insert_guard ON public.seller_applications;
CREATE TRIGGER applications_insert_guard BEFORE INSERT ON public.seller_applications
FOR EACH ROW EXECUTE FUNCTION public.guard_application_insert();

REVOKE ALL ON FUNCTION public.guard_order_insert() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_demo_stock() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_product_insert() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_application_insert() FROM public, anon, authenticated;
