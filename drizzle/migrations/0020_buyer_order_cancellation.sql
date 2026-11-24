-- Allow a customer to cancel their own pending order item.
-- Sellers/admins retain the existing pending/confirmed cancellation workflow.
-- Cancellation remains atomic and restores stock exactly once.

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

  SELECT oi.id, oi.status, oi.store_id, oi.product_id, oi.quantity,
         o.is_demo, o.customer_id
  INTO v_item
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.id = p_item_id
  FOR UPDATE OF oi;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item not found';
  END IF;

  -- Buyers may only cancel their own pending items (or safely retry an
  -- already-completed cancellation). Store owners/admins keep their workflow.
  IF NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.owns_store(v_item.store_id)
     AND NOT (
       v_item.customer_id = auth.uid()
       AND v_item.status IN ('pending', 'cancelled')
     ) THEN
    RAISE EXCEPTION 'You cannot cancel this order item';
  END IF;

  IF v_item.is_demo THEN
    RAISE EXCEPTION 'Demo orders cannot be changed';
  END IF;

  IF v_item.status = 'cancelled' THEN
    RETURN true;
  END IF;

  IF v_item.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Only pending or confirmed items can be cancelled';
  END IF;

  IF v_item.product_id IS NULL THEN
    RAISE EXCEPTION 'The original product is unavailable; stock cannot be restored safely';
  END IF;

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
  WHERE id = v_item.id AND status = v_item.status;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order item changed; retry cancellation';
  END IF;

  PERFORM set_config('app.internal', v_previous_internal, true);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_order_item(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_item(uuid) TO authenticated;
