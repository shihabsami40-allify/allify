-- Keep the legacy and idempotent checkout RPCs aligned: ALLIFY stores product price only.
-- Courier delivery charges are determined separately in the courier merchant panel.

CREATE OR REPLACE FUNCTION public.place_order(p_items jsonb, p_recipient text, p_phone text, p_area text, p_address text, p_note text DEFAULT NULL::text, p_save_address boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_sub numeric := 0;
  v_order_id uuid;
  v_no text;
  it jsonb;
  v_p record;
  v_qty int;
  v_img text;
  v_previous_internal text := coalesce(current_setting('app.internal', true), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Please sign in to place an order';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Cart is empty or invalid';
  END IF;

  p_recipient := btrim(coalesce(p_recipient, ''));
  p_phone := btrim(coalesce(p_phone, ''));
  p_address := btrim(coalesce(p_address, ''));
  IF char_length(p_recipient) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;
  IF p_phone !~ '^01[3-9][0-9]{8}$' THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;
  IF char_length(p_address) NOT BETWEEN 5 AND 300 THEN
    RAISE EXCEPTION 'Invalid address';
  END IF;
  IF p_note IS NOT NULL AND char_length(p_note) > 500 THEN
    RAISE EXCEPTION 'Note too long';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.delivery_areas WHERE name_en = p_area AND active) THEN
    RAISE EXCEPTION 'Delivery not available in this area';
  END IF;

  PERFORM set_config('app.internal', '1', true);
  v_no := 'ALF-' || to_char(now() AT TIME ZONE 'Asia/Dhaka', 'YYMMDD')
          || '-' || nextval('public.order_no_seq');
  INSERT INTO public.orders (
    order_no, customer_id, subtotal, delivery_fee, total,
    recipient, phone, area, address_line, note
  )
  VALUES (
    v_no, v_uid, 0, 0, 0,
    p_recipient, p_phone, p_area, p_address,
    nullif(btrim(coalesce(p_note, '')), '')
  )
  RETURNING id INTO v_order_id;

  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (it->>'quantity')::int;
    IF v_qty IS NULL OR v_qty < 1 OR v_qty > 99 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    SELECT p.* INTO v_p
    FROM public.products p
    JOIN public.seller_stores s ON s.id = p.store_id
    WHERE p.id = (it->>'product_id')::uuid
      AND p.status = 'active'
      AND s.status = 'active'
      AND s.is_demo = false
    FOR UPDATE OF p;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'A product is no longer available';
    END IF;
    IF v_p.stock < v_qty THEN
      RAISE EXCEPTION 'Not enough stock for %', v_p.title_bn;
    END IF;

    SELECT url INTO v_img
    FROM public.product_images
    WHERE product_id = v_p.id
    ORDER BY sort_order
    LIMIT 1;

    UPDATE public.products
    SET stock = stock - v_qty, sold_count = sold_count + v_qty
    WHERE id = v_p.id;

    INSERT INTO public.order_items (
      order_id, product_id, store_id, title, image_url, unit_price, quantity
    )
    VALUES (
      v_order_id, v_p.id, v_p.store_id, v_p.title_bn, v_img, v_p.price, v_qty
    );

    v_sub := v_sub + v_p.price * v_qty;
  END LOOP;

  UPDATE public.orders
  SET subtotal = v_sub, delivery_fee = 0, total = v_sub
  WHERE id = v_order_id;

  IF p_save_address THEN
    INSERT INTO public.addresses (
      user_id, recipient, phone, area, address_line, is_default
    )
    VALUES (
      v_uid, p_recipient, p_phone, p_area, p_address,
      NOT EXISTS (SELECT 1 FROM public.addresses WHERE user_id = v_uid)
    );
  END IF;

  DELETE FROM public.cart_items
  WHERE cart_id IN (SELECT id FROM public.carts WHERE user_id = v_uid);

  PERFORM set_config('app.internal', v_previous_internal, true);
  RETURN v_no;
END;
$function$

CREATE OR REPLACE FUNCTION public.place_order(p_items jsonb, p_recipient text, p_phone text, p_area text, p_address text, p_request_id uuid, p_note text DEFAULT NULL::text, p_save_address boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_sub numeric := 0;
  v_order_id uuid;
  v_no text;
  it jsonb;
  v_p record;
  v_qty int;
  v_img text;
  v_item_count int;
  v_unique_count int;
  v_previous_internal text := coalesce(current_setting('app.internal', true), '');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Please sign in to place an order';
  END IF;
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'Checkout request ID is required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || p_request_id::text, 0));
  SELECT order_no INTO v_no
  FROM public.orders
  WHERE customer_id = v_uid AND checkout_request_id = p_request_id;
  IF FOUND THEN
    RETURN v_no;
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Cart is empty or invalid';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_items) AS entry(value)
    WHERE jsonb_typeof(entry.value) <> 'object'
       OR nullif(entry.value->>'product_id', '') IS NULL
       OR nullif(entry.value->>'quantity', '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Cart item format is invalid';
  END IF;

  SELECT count(*), count(DISTINCT value->>'product_id')
  INTO v_item_count, v_unique_count
  FROM jsonb_array_elements(p_items) AS entry(value);
  IF v_item_count <> v_unique_count THEN
    RAISE EXCEPTION 'Duplicate products are not allowed in the cart';
  END IF;

  p_recipient := btrim(coalesce(p_recipient, ''));
  p_phone := btrim(coalesce(p_phone, ''));
  p_address := btrim(coalesce(p_address, ''));
  IF char_length(p_recipient) NOT BETWEEN 2 AND 100 THEN
    RAISE EXCEPTION 'Invalid name';
  END IF;
  IF p_phone !~ '^01[3-9][0-9]{8}$' THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;
  IF char_length(p_address) NOT BETWEEN 5 AND 300 THEN
    RAISE EXCEPTION 'Invalid address';
  END IF;
  IF p_note IS NOT NULL AND char_length(p_note) > 500 THEN
    RAISE EXCEPTION 'Note too long';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.delivery_areas WHERE name_en = p_area AND active) THEN
    RAISE EXCEPTION 'Delivery not available in this area';
  END IF;

  PERFORM set_config('app.internal', '1', true);
  v_no := 'ALF-' || to_char(now() AT TIME ZONE 'Asia/Dhaka', 'YYMMDD')
          || '-' || nextval('public.order_no_seq');
  INSERT INTO public.orders (
    order_no, customer_id, subtotal, delivery_fee, total,
    recipient, phone, area, address_line, note, checkout_request_id
  )
  VALUES (
    v_no, v_uid, 0, 0, 0,
    p_recipient, p_phone, p_area, p_address,
    nullif(btrim(coalesce(p_note, '')), ''), p_request_id
  )
  RETURNING id INTO v_order_id;

  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := (it->>'quantity')::int;
    IF v_qty < 1 OR v_qty > 99 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;

    SELECT p.* INTO v_p
    FROM public.products p
    JOIN public.seller_stores s ON s.id = p.store_id
    WHERE p.id = (it->>'product_id')::uuid
      AND p.status = 'active'
      AND s.status = 'active'
      AND s.is_demo = false
    FOR UPDATE OF p;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'A product is no longer available';
    END IF;
    IF v_p.stock < v_qty THEN
      RAISE EXCEPTION 'Not enough stock for %', v_p.title_bn;
    END IF;

    SELECT url INTO v_img
    FROM public.product_images
    WHERE product_id = v_p.id
    ORDER BY sort_order
    LIMIT 1;

    UPDATE public.products
    SET stock = stock - v_qty, sold_count = sold_count + v_qty
    WHERE id = v_p.id;

    INSERT INTO public.order_items (
      order_id, product_id, store_id, title, image_url, unit_price, quantity
    )
    VALUES (
      v_order_id, v_p.id, v_p.store_id, v_p.title_bn, v_img, v_p.price, v_qty
    );

    v_sub := v_sub + v_p.price * v_qty;
  END LOOP;

  UPDATE public.orders
  SET subtotal = v_sub, delivery_fee = 0, total = v_sub
  WHERE id = v_order_id;

  IF p_save_address THEN
    INSERT INTO public.addresses (
      user_id, recipient, phone, area, address_line, is_default
    )
    VALUES (
      v_uid, p_recipient, p_phone, p_area, p_address,
      NOT EXISTS (SELECT 1 FROM public.addresses WHERE user_id = v_uid)
    );
  END IF;

  DELETE FROM public.cart_items
  WHERE cart_id IN (SELECT id FROM public.carts WHERE user_id = v_uid);

  PERFORM set_config('app.internal', v_previous_internal, true);
  RETURN v_no;
END;
$function$
