-- Restore inventory atomically when an eligible order item is cancelled.
-- Direct Data API cancellation remains blocked; callers must use this guarded RPC.
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

  IF new.status IS DISTINCT FROM old.status THEN
    IF new.status = 'cancelled' THEN
      IF coalesce(current_setting('app.internal', true), '') <> '1' THEN
        RAISE EXCEPTION 'Use the protected order cancellation workflow';
      END IF;
    ELSIF old.status = 'cancelled' THEN
      RAISE EXCEPTION 'A cancelled order item cannot be reopened';
    ELSIF NOT public.has_role(auth.uid(), 'admin') AND NOT (
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

REVOKE ALL ON FUNCTION public.guard_order_item_update() FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.cancel_order_item(p_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_previous_internal text := coalesce(current_setting('app.internal', true), '');
  v_product_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Please sign in to cancel an order';
  END IF;

  -- Serialize cancellation attempts for the same line item.
  SELECT oi.id, oi.status, oi.store_id, oi.product_id, oi.quantity, o.is_demo
  INTO v_item
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.id = p_item_id
  FOR UPDATE OF oi;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item not found';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.owns_store(v_item.store_id) THEN
    RAISE EXCEPTION 'You cannot cancel this order item';
  END IF;

  IF v_item.is_demo THEN
    RAISE EXCEPTION 'Demo orders cannot be changed';
  END IF;

  -- Idempotent retry: the previous transaction already restored stock.
  IF v_item.status = 'cancelled' THEN
    RETURN true;
  END IF;

  IF v_item.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Only pending or confirmed items can be cancelled';
  END IF;

  IF v_item.product_id IS NULL THEN
    RAISE EXCEPTION 'The original product is unavailable; stock cannot be restored safely';
  END IF;

  -- Keep stock within the products table constraint. Any failure aborts the
  -- transaction, including the subsequent order-item status update.
  PERFORM set_config('app.internal', '1', true);
  UPDATE public.products
  SET stock = stock + v_item.quantity,
      sold_count = greatest(0, sold_count - v_item.quantity)
  WHERE id = v_item.product_id
    AND stock <= 100000 - v_item.quantity
  RETURNING id INTO v_product_id;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'Stock could not be restored safely';
  END IF;

  UPDATE public.order_items
  SET status = 'cancelled'
  WHERE id = v_item.id
    AND status = v_item.status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item changed; retry cancellation';
  END IF;

  PERFORM set_config('app.internal', v_previous_internal, true);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order_item(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_item(uuid) TO authenticated;
