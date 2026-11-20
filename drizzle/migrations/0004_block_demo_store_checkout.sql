-- Prevent demo/sample stores from accepting real COD orders.
-- Apply only after verifying the live place_order signature and taking a restorable backup.
create or replace function public.place_order(
  p_items jsonb,
  p_recipient text,
  p_phone text,
  p_area text,
  p_address text,
  p_note text default null,
  p_save_address boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_fee numeric;
  v_sub numeric := 0;
  v_order_id uuid;
  v_no text;
  it jsonb;
  v_p record;
  v_qty int;
  v_img text;
begin
  if v_uid is null then
    raise exception 'Please sign in to place an order';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0
     or jsonb_array_length(p_items) > 50 then
    raise exception 'Cart is empty or invalid';
  end if;

  -- Fail closed before creating an order if any item belongs to a sample store.
  if exists (
    select 1
    from jsonb_array_elements(p_items) as item(value)
    join public.products p on p.id = (item.value->>'product_id')::uuid
    join public.seller_stores s on s.id = p.store_id
    where s.is_demo = true
  ) then
    raise exception 'Sample products are not available for checkout';
  end if;

  p_recipient := btrim(coalesce(p_recipient,''));
  p_address := btrim(coalesce(p_address,''));
  if char_length(p_recipient) not between 2 and 100 then
    raise exception 'Invalid name';
  end if;
  if p_phone !~ '^01[3-9][0-9]{8}$' then
    raise exception 'Invalid phone number';
  end if;
  if char_length(p_address) not between 5 and 300 then
    raise exception 'Invalid address';
  end if;
  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'Note too long';
  end if;

  select fee into v_fee
  from public.delivery_areas
  where name_en = p_area and active;
  if v_fee is null then
    raise exception 'Delivery not available in this area';
  end if;

  perform set_config('app.internal','1', true);
  v_no := 'ALF-' || to_char(now() at time zone 'Asia/Dhaka','YYMMDD') || '-' || nextval('public.order_no_seq');
  insert into public.orders
    (order_no, customer_id, subtotal, delivery_fee, total, recipient, phone, area, address_line, note)
  values
    (v_no, v_uid, 0, v_fee, 0, p_recipient, p_phone, p_area, p_address, nullif(btrim(coalesce(p_note,'')),''))
  returning id into v_order_id;

  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := (it->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'Invalid quantity';
    end if;

    select p.*, s.is_demo as store_is_demo
    into v_p
    from public.products p
    join public.seller_stores s on s.id = p.store_id
    where p.id = (it->>'product_id')::uuid
      and p.status = 'active'
      and s.status = 'active'
    for update of p;

    if not found then
      raise exception 'A product is no longer available';
    end if;
    if v_p.store_is_demo then
      raise exception 'Sample products are not available for checkout';
    end if;
    if v_p.stock < v_qty then
      raise exception 'Not enough stock for %', v_p.title_bn;
    end if;

    select url into v_img
    from public.product_images
    where product_id = v_p.id
    order by sort_order
    limit 1;

    update public.products
    set stock = stock - v_qty, sold_count = sold_count + v_qty
    where id = v_p.id;

    insert into public.order_items
      (order_id, product_id, store_id, title, image_url, unit_price, quantity)
    values
      (v_order_id, v_p.id, v_p.store_id, v_p.title_bn, v_img, v_p.price, v_qty);

    v_sub := v_sub + v_p.price * v_qty;
  end loop;

  perform set_config('app.internal','', true);
  update public.orders
  set subtotal = v_sub, total = v_sub + v_fee
  where id = v_order_id;

  if p_save_address then
    insert into public.addresses
      (user_id, recipient, phone, area, address_line, is_default)
    values
      (v_uid, p_recipient, p_phone, p_area, p_address,
       not exists (select 1 from public.addresses where user_id = v_uid));
  end if;

  delete from public.cart_items
  where cart_id in (select id from public.carts where user_id = v_uid);

  return v_no;
end;
$$;

revoke execute on function public.place_order(jsonb,text,text,text,text,text,boolean) from anon, public;
grant execute on function public.place_order(jsonb,text,text,text,text,text,boolean) to authenticated;
