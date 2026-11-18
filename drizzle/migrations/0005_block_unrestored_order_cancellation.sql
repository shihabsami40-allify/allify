-- Keep direct authenticated Data API updates aligned with the application.
-- Cancellation is intentionally unavailable until stock restoration is implemented.
CREATE OR REPLACE FUNCTION public.guard_order_item_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF new.unit_price IS DISTINCT FROM old.unit_price
     OR new.quantity IS DISTINCT FROM old.quantity
     OR new.store_id IS DISTINCT FROM old.store_id
     OR new.order_id IS DISTINCT FROM old.order_id
     OR new.product_id IS DISTINCT FROM old.product_id
     OR new.title IS DISTINCT FROM old.title
     OR new.image_url IS DISTINCT FROM old.image_url THEN
    RAISE EXCEPTION 'Only order status can be changed';
  END IF;

  IF new.status IS DISTINCT FROM old.status
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NOT (
      (old.status = 'pending' AND new.status = 'confirmed')
      OR (old.status = 'confirmed' AND new.status = 'shipped')
      OR (old.status = 'shipped' AND new.status = 'delivered')
    ) THEN
      RAISE EXCEPTION 'Invalid order status transition';
    END IF;
  END IF;

  RETURN new;
END;
$$;

-- Trigger functions are invoked by their triggers, not directly by clients.
REVOKE ALL ON FUNCTION public.guard_order_item_update() FROM public, anon, authenticated;
