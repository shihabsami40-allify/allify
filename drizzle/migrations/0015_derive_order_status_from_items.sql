-- Keep the aggregate order status derived exclusively from order_items.
-- Direct authenticated updates to orders must not bypass item lifecycle or stock guards.
CREATE OR REPLACE FUNCTION public.guard_order_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF coalesce(current_setting('app.internal', true), '') = '1' THEN
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'status') THEN
    RAISE EXCEPTION 'Order fields can only be changed by internal order workflows';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'Order status is derived from order items';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_order_status_from_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status public.order_status;
  v_previous_internal text := coalesce(current_setting('app.internal', true), '');
BEGIN
  SELECT
    CASE
      WHEN bool_and(status = 'cancelled') THEN 'cancelled'::public.order_status
      WHEN bool_or(status = 'pending') THEN 'pending'::public.order_status
      WHEN bool_or(status = 'confirmed') THEN 'confirmed'::public.order_status
      WHEN bool_or(status = 'shipped') THEN 'shipped'::public.order_status
      WHEN bool_or(status = 'delivered') THEN 'delivered'::public.order_status
      ELSE 'pending'::public.order_status
    END
  INTO v_status
  FROM public.order_items
  WHERE order_id = NEW.order_id;

  -- Only this trusted trigger may update the aggregate order status.
  PERFORM set_config('app.internal', '1', true);
  UPDATE public.orders
  SET status = v_status
  WHERE id = NEW.order_id;
  PERFORM set_config('app.internal', v_previous_internal, true);

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_order_update() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_order_status_from_items() FROM PUBLIC, anon, authenticated;
