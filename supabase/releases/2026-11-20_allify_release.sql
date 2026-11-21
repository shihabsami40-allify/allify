-- ALLIFY production release migration pack (2026-11-20)
-- IMPORTANT: Run only after confirming a restorable backup and completing read-only preflight.
-- This pack was rehearsed on the isolated allify-test project. It has NOT been applied to Production.
BEGIN;

DO $release_preflight$
BEGIN
  IF to_regclass('public.orders') IS NULL
     OR to_regclass('public.order_items') IS NULL
     OR to_regclass('public.products') IS NULL
     OR to_regclass('public.seller_stores') IS NULL
     OR to_regclass('public.seller_applications') IS NULL
     OR to_regclass('public.product_images') IS NULL
     OR to_regclass('public.user_roles') IS NULL
     OR to_regclass('public.delivery_areas') IS NULL
     OR to_regclass('storage.objects') IS NULL
     OR to_regclass('storage.buckets') IS NULL THEN
    RAISE EXCEPTION 'Preflight failed: required ALLIFY tables are missing';
  END IF;

  IF to_regprocedure('public.place_order(jsonb,text,text,text,text,text,boolean)') IS NULL
     OR to_regprocedure('public.review_seller_application(uuid,boolean,text)') IS NULL
     OR to_regprocedure('public.has_role(uuid,public.app_role)') IS NULL
     OR to_regprocedure('public.owns_store(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Preflight failed: required RPC/helper signatures are missing';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (VALUES
      ('orders','id'),('orders','order_no'),('orders','customer_id'),('orders','status'),('orders','payment_method'),('orders','subtotal'),('orders','delivery_fee'),('orders','total'),('orders','recipient'),('orders','phone'),('orders','area'),('orders','address_line'),('orders','is_demo'),
      ('order_items','id'),('order_items','order_id'),('order_items','product_id'),('order_items','store_id'),('order_items','title'),('order_items','image_url'),('order_items','unit_price'),('order_items','quantity'),('order_items','status'),
      ('products','id'),('products','store_id'),('products','category_id'),('products','slug'),('products','title_bn'),('products','price'),('products','stock'),('products','sold_count'),('products','status'),
      ('seller_stores','id'),('seller_stores','owner_id'),('seller_stores','slug'),('seller_stores','name'),('seller_stores','area'),('seller_stores','address'),('seller_stores','phone'),('seller_stores','status'),('seller_stores','is_demo'),
      ('seller_applications','id'),('seller_applications','user_id'),('seller_applications','store_name'),('seller_applications','owner_name'),('seller_applications','phone'),('seller_applications','area'),('seller_applications','address'),('seller_applications','description'),('seller_applications','status'),('seller_applications','admin_note'),('seller_applications','reviewed_at'),
      ('product_images','id'),('product_images','product_id'),('product_images','url'),
      ('user_roles','user_id'),('user_roles','role'),
      ('delivery_areas','id'),('delivery_areas','name_en'),('delivery_areas','fee'),('delivery_areas','active')
    ) AS required(table_name,column_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_schema='public' AND c.table_name=required.table_name AND c.column_name=required.column_name
    )
  ) THEN
    RAISE EXCEPTION 'Preflight failed: one or more required ALLIFY columns are missing';
  END IF;

  IF to_regtype('public.app_role') IS NULL
     OR to_regtype('public.store_status') IS NULL
     OR to_regtype('public.product_status') IS NULL
     OR to_regtype('public.order_status') IS NULL
     OR to_regtype('public.application_status') IS NULL THEN
    RAISE EXCEPTION 'Preflight failed: required ALLIFY enum types are missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id='product-images') THEN
    RAISE EXCEPTION 'Preflight failed: product-images bucket is missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typname='order_status') THEN
    RAISE EXCEPTION 'Preflight failed: order_status enum is missing';
  END IF;
END;
$release_preflight$;


-- ===== drizzle/migrations/0004_block_demo_store_checkout.sql =====
-- Repair the authenticated COD order RPC after the secure order-update trigger.
-- Keep the internal flag enabled through the subtotal/total update, then clear it.
-- Exclude demo stores at the database boundary, not only in the checkout UI.
CREATE OR REPLACE FUNCTION public.place_order(
  p_items jsonb,
  p_recipient text,
  p_phone text,
  p_area text,
  p_address text,
  p_note text DEFAULT NULL,
  p_save_address boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_fee numeric;
  v_sub numeric := 0;
  v_order_id uuid;
  v_no text;
  it jsonb;
  v_p record;
  v_qty int;
  v_img text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Please sign in to place an order';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array'
     OR jsonb_array_length(p_items) = 0 OR jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Cart is empty or invalid';
  END IF;

  p_recipient := btrim(coalesce(p_recipient, ''));
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

  SELECT fee INTO v_fee
  FROM public.delivery_areas
  WHERE name_en = p_area AND active;
  IF v_fee IS NULL THEN
    RAISE EXCEPTION 'Delivery not available in this area';
  END IF;

  -- This flag is transaction-local and used only inside this SECURITY DEFINER RPC.
  -- Keep it enabled until all protected order/product writes are complete.
  PERFORM set_config('app.internal', '1', true);

  v_no := 'ALF-' || to_char(now() AT TIME ZONE 'Asia/Dhaka', 'YYMMDD')
          || '-' || nextval('public.order_no_seq');
  INSERT INTO public.orders (
    order_no, customer_id, subtotal, delivery_fee, total,
    recipient, phone, area, address_line, note
  )
  VALUES (
    v_no, v_uid, 0, v_fee, 0,
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

  -- guard_order_update rejects non-status edits unless app.internal is enabled.
  UPDATE public.orders
  SET subtotal = v_sub, total = v_sub + v_fee
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

  PERFORM set_config('app.internal', '', true);
  RETURN v_no;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.place_order(jsonb,text,text,text,text,text,boolean)
  FROM anon, public;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb,text,text,text,text,text,boolean)
  TO authenticated;

-- ===== drizzle/migrations/0005_atomic_order_lifecycle.sql =====
-- Harden the order lifecycle and make cancellation restore inventory atomically.
-- Apply only after confirming the live schema and a restorable backup.

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
    IF EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = old.order_id AND o.is_demo = true
    ) THEN
      RAISE EXCEPTION 'Demo order status cannot be changed';
    END IF;

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

  PERFORM set_config('app.internal', '1', true);
  UPDATE public.orders SET status = v_status WHERE id = NEW.order_id;
  PERFORM set_config('app.internal', v_previous_internal, true);

  RETURN NEW;
END;
$$;

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

-- Exactly one immutable-field/status guard trigger on order_items.
DROP TRIGGER IF EXISTS order_items_guard ON public.order_items;
DROP TRIGGER IF EXISTS order_items_guard_update ON public.order_items;
CREATE TRIGGER order_items_guard_update
BEFORE UPDATE ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.guard_order_item_update();

-- Keep the aggregate order status synchronized with line-item transitions.
DROP TRIGGER IF EXISTS order_items_sync_order_status ON public.order_items;
CREATE TRIGGER order_items_sync_order_status
AFTER UPDATE OF status ON public.order_items
FOR EACH ROW
WHEN (old.status IS DISTINCT FROM new.status)
EXECUTE FUNCTION public.sync_order_status_from_items();

DROP TRIGGER IF EXISTS orders_guard ON public.orders;
CREATE TRIGGER orders_guard
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.guard_order_update();

REVOKE ALL ON FUNCTION public.guard_order_update() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_order_item_update() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_order_status_from_items() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_order_item(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_item(uuid) TO authenticated;

-- ===== drizzle/migrations/0006_secure_product_image_storage.sql =====
-- Restrict product image writes to the authenticated seller's own active, non-demo store.
-- Keep deletion available to the store owner even after suspension so old objects can be cleaned up.

drop policy if exists "Sellers upload to their own product folder" on storage.objects;
create policy "Sellers upload to their own product folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.seller_stores s
    where s.id::text = (storage.foldername(name))[2]
      and s.owner_id = (select auth.uid())
      and s.status = 'active'
      and s.is_demo = false
  )
);

drop policy if exists "Sellers update their own product images" on storage.objects;
create policy "Sellers update their own product images"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.seller_stores s
    where s.id::text = (storage.foldername(name))[2]
      and s.owner_id = (select auth.uid())
      and s.status = 'active'
      and s.is_demo = false
  )
)
with check (
  bucket_id = 'product-images'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.seller_stores s
    where s.id::text = (storage.foldername(name))[2]
      and s.owner_id = (select auth.uid())
      and s.status = 'active'
      and s.is_demo = false
  )
);

drop policy if exists "Sellers delete their own product images" on storage.objects;
create policy "Sellers delete their own product images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.seller_stores s
    where s.id::text = (storage.foldername(name))[2]
      and s.owner_id = (select auth.uid())
  )
);

-- ===== drizzle/migrations/0007_harden_product_image_bucket_config.sql =====
-- Keep the product image bucket configuration explicit even when the legacy
-- bucket migration was applied outside the Drizzle journal.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Product images are intentionally public so storefront visitors can view them.
drop policy if exists "Product images are publicly readable" on storage.objects;
create policy "Product images are publicly readable"
on storage.objects for select
using (bucket_id = 'product-images');

-- ===== drizzle/migrations/0008_remove_legacy_storage_policy_overrides.sql =====
-- Remove legacy permissive Storage policies that bypass the active-store
-- ownership checks enforced by the newer seller-specific policies.
drop policy if exists "product images own upload" on storage.objects;
drop policy if exists "product images own delete" on storage.objects;

-- ===== drizzle/migrations/0009_remove_duplicate_storage_read_policy.sql =====
-- Keep the canonical public-read Storage policy and remove its duplicate.
drop policy if exists "product images public read" on storage.objects;

-- ===== drizzle/migrations/0010_secure_insert_guards.sql =====
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

-- ===== drizzle/migrations/0011_restrict_anon_helper_execution.sql =====
-- Keep internal ownership/order helpers out of the anonymous API role.
-- Split public catalog policies so anonymous reads do not need privileged helpers.

drop policy if exists "products public read" on public.products;
drop policy if exists "products public read anon" on public.products;
drop policy if exists "products public read authenticated" on public.products;
create policy "products public read anon"
  on public.products for select to anon
  using (
    status = 'active'::public.product_status
    and exists (
      select 1 from public.seller_stores s
      where s.id = products.store_id
        and s.status = 'active'::public.store_status
    )
  );
create policy "products public read authenticated"
  on public.products for select to authenticated
  using (
    (
      status = 'active'::public.product_status
      and exists (
        select 1 from public.seller_stores s
        where s.id = products.store_id
          and s.status = 'active'::public.store_status
      )
    )
    or public.owns_store(store_id)
    or public.has_role(auth.uid(), 'admin'::public.app_role)
  );

drop policy if exists "stores public read active" on public.seller_stores;
drop policy if exists "stores public read anon" on public.seller_stores;
drop policy if exists "stores public read authenticated" on public.seller_stores;
create policy "stores public read anon"
  on public.seller_stores for select to anon
  using (status = 'active'::public.store_status);
create policy "stores public read authenticated"
  on public.seller_stores for select to authenticated
  using (
    status = 'active'::public.store_status
    or owner_id = auth.uid()
    or public.has_role(auth.uid(), 'admin'::public.app_role)
  );

revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_my_order(uuid) from public, anon;
revoke execute on function public.order_has_my_store(uuid) from public, anon;
revoke execute on function public.owns_store(uuid) from public, anon;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_my_order(uuid) to authenticated;
grant execute on function public.order_has_my_store(uuid) to authenticated;
grant execute on function public.owns_store(uuid) to authenticated;

-- ===== drizzle/migrations/0012_scope_role_helper_to_current_user.sql =====
-- has_role is used by RLS policies with auth.uid(). Prevent direct RPC
-- callers from probing the role of arbitrary account IDs.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select _user_id = auth.uid()
     and exists (
       select 1
       from public.user_roles
       where user_id = auth.uid()
         and role = _role
     )
$function$;

-- ===== drizzle/migrations/0013_minimize_order_table_grants.sql =====
-- Keep order access behind RLS and the protected checkout/cancellation RPCs.
-- Anonymous clients must not hold direct table privileges.
revoke all on table public.orders from anon;
revoke all on table public.order_items from anon;

-- Authenticated users read their own orders/items; seller status updates are
-- further constrained by the existing RLS policies and update guard trigger.
revoke all on table public.orders from authenticated;
revoke all on table public.order_items from authenticated;
grant select, update on table public.orders to authenticated;
grant select, update on table public.order_items to authenticated;

-- ===== drizzle/migrations/0014_guard_seller_application_review.sql =====
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

DROP TRIGGER IF EXISTS seller_applications_update_guard ON public.seller_applications;
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

-- ===== drizzle/migrations/0015_restrict_suspended_store_product_writes.sql =====
-- Prevent sellers from bypassing suspended-store UI restrictions through the Data API.
-- Admins retain moderation access; owners may write only while their real store is active.
DROP POLICY IF EXISTS "products owner insert" ON public.products;
CREATE POLICY "products owner insert" ON public.products
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.owns_store(store_id)
      AND EXISTS (
        SELECT 1 FROM public.seller_stores s
        WHERE s.id = store_id
          AND s.status = 'active'
          AND s.is_demo = false
      )
    )
  );

DROP POLICY IF EXISTS "products owner update" ON public.products;
CREATE POLICY "products owner update" ON public.products
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.owns_store(store_id)
      AND EXISTS (
        SELECT 1 FROM public.seller_stores s
        WHERE s.id = store_id
          AND s.status = 'active'
          AND s.is_demo = false
      )
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.owns_store(store_id)
      AND EXISTS (
        SELECT 1 FROM public.seller_stores s
        WHERE s.id = store_id
          AND s.status = 'active'
          AND s.is_demo = false
      )
    )
  );

-- Keep suspended sellers from deleting products through the Data API as well.
-- order_items.product_id uses ON DELETE SET NULL, preserving its order snapshot.
DROP POLICY IF EXISTS "products owner delete" ON public.products;
CREATE POLICY "products owner delete" ON public.products
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR (
      public.owns_store(store_id)
      AND EXISTS (
        SELECT 1 FROM public.seller_stores s
        WHERE s.id = store_id
          AND s.status = 'active'
          AND s.is_demo = false
      )
    )
  );

-- ===== drizzle/migrations/0016_restrict_suspended_store_image_rows.sql =====
-- Close the product_images table-policy bypass left by the original owner-write policy.
-- Sellers may manage image rows only while their own store is active and non-demo.
-- Admin moderation access is retained.
DROP POLICY IF EXISTS "images owner write" ON public.product_images;

CREATE POLICY "images owner write" ON public.product_images
FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.seller_stores s ON s.id = p.store_id
    WHERE p.id = product_id
      AND s.owner_id = auth.uid()
      AND s.status = 'active'
      AND s.is_demo = false
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1
    FROM public.products p
    JOIN public.seller_stores s ON s.id = p.store_id
    WHERE p.id = product_id
      AND s.owner_id = auth.uid()
      AND s.status = 'active'
      AND s.is_demo = false
  )
);

-- ===== drizzle/migrations/0017_remove_first_admin_claim.sql =====
-- The first-admin claim path must not exist in a public marketplace.
DROP FUNCTION IF EXISTS public.claim_first_admin();

-- ===== drizzle/migrations/0018_optimize_rls_and_fk_indexes.sql =====
-- Optimize RLS auth context evaluation and add missing FK covering indexes.
-- The policy predicates are unchanged semantically; auth.uid() is evaluated once
-- per statement through a scalar subquery rather than once per candidate row.

do $$
declare
  p record;
  using_expr text;
  check_expr text;
  statement text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') like '%auth.uid()%'
        or coalesce(with_check, '') like '%auth.uid()%'
      )
  loop
    using_expr := case
      when p.qual is null then null
      else replace(p.qual, 'auth.uid()', '(select auth.uid())')
    end;
    check_expr := case
      when p.with_check is null then null
      else replace(p.with_check, 'auth.uid()', '(select auth.uid())')
    end;

    statement := format(
      'alter policy %I on %I.%I',
      p.policyname, p.schemaname, p.tablename
    );
    if using_expr is not null then
      statement := statement || format(' using (%s)', using_expr);
    end if;
    if check_expr is not null then
      statement := statement || format(' with check (%s)', check_expr);
    end if;
    execute statement;
  end loop;
end
$$;

create index if not exists cart_items_product_id_idx
  on public.cart_items (product_id);
create index if not exists order_items_product_id_idx
  on public.order_items (product_id);
create index if not exists product_images_product_id_idx
  on public.product_images (product_id);

-- ===== drizzle/migrations/0019_split_overlapping_select_policies.sql =====
-- Avoid overlapping SELECT policies while preserving existing public-read behavior.
-- Admins still read through the public SELECT policy; admin write access is
-- expressed only for INSERT/UPDATE/DELETE. Product image ownership rules remain
-- identical for writes.

drop policy if exists "categories admin insert" on public.categories;
drop policy if exists "categories admin update" on public.categories;
drop policy if exists "categories admin delete" on public.categories;
drop policy if exists "areas admin insert" on public.delivery_areas;
drop policy if exists "areas admin update" on public.delivery_areas;
drop policy if exists "areas admin delete" on public.delivery_areas;
drop policy if exists "images owner insert" on public.product_images;
drop policy if exists "images owner update" on public.product_images;
drop policy if exists "images owner delete" on public.product_images;
drop policy if exists "categories admin write" on public.categories;
create policy "categories admin insert" on public.categories
  for insert to authenticated
  with check (public.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "categories admin update" on public.categories
  for update to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role))
  with check (public.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "categories admin delete" on public.categories
  for delete to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "areas admin write" on public.delivery_areas;
create policy "areas admin insert" on public.delivery_areas
  for insert to authenticated
  with check (public.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "areas admin update" on public.delivery_areas
  for update to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role))
  with check (public.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "areas admin delete" on public.delivery_areas
  for delete to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "images owner write" on public.product_images;
create policy "images owner insert" on public.product_images
  for insert to authenticated
  with check (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or exists (
      select 1 from public.products p
      join public.seller_stores s on s.id = p.store_id
      where p.id = product_images.product_id
        and s.owner_id = (select auth.uid())
        and s.status = 'active'::public.store_status
        and s.is_demo = false
    )
  );
create policy "images owner update" on public.product_images
  for update to authenticated
  using (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or exists (
      select 1 from public.products p
      join public.seller_stores s on s.id = p.store_id
      where p.id = product_images.product_id
        and s.owner_id = (select auth.uid())
        and s.status = 'active'::public.store_status
        and s.is_demo = false
    )
  )
  with check (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or exists (
      select 1 from public.products p
      join public.seller_stores s on s.id = p.store_id
      where p.id = product_images.product_id
        and s.owner_id = (select auth.uid())
        and s.status = 'active'::public.store_status
        and s.is_demo = false
    )
  );
create policy "images owner delete" on public.product_images
  for delete to authenticated
  using (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or exists (
      select 1 from public.products p
      join public.seller_stores s on s.id = p.store_id
      where p.id = product_images.product_id
        and s.owner_id = (select auth.uid())
        and s.status = 'active'::public.store_status
        and s.is_demo = false
    )
  );

-- Migration 0020: allow customers to cancel their own pending order items.
CREATE OR REPLACE FUNCTION public.cancel_order_item(p_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
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
$;

REVOKE ALL ON FUNCTION public.cancel_order_item(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cancel_order_item(uuid) TO authenticated;



-- ===== drizzle/migrations/0021_idempotent_checkout_requests.sql =====
-- Add idempotent checkout requests so retries cannot create duplicate COD orders.
-- Apply only after the release preflight and a verified restorable backup.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_request_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS orders_customer_checkout_request_uidx
  ON public.orders (customer_id, checkout_request_id)
  WHERE checkout_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.place_order(
  p_items jsonb,
  p_recipient text,
  p_phone text,
  p_area text,
  p_address text,
  p_request_id uuid,
  p_note text DEFAULT NULL,
  p_save_address boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $
DECLARE
  v_uid uuid := auth.uid();
  v_fee numeric;
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

  -- Serialize concurrent retries with the same customer/request key.
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
  IF p_phone !~ '^01[3-9][0-9]{8}
DECLARE
  v_bucket_limit bigint;
  v_bucket_public boolean;
  v_guard_count integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.role_table_grants
    WHERE table_schema='public' AND grantee='anon' AND privilege_type <> 'SELECT'
  ) THEN
    RAISE EXCEPTION 'Postflight failed: anon retains non-read table privileges';
  END IF;
  IF NOT has_table_privilege('anon','public.categories','SELECT')
     OR NOT has_table_privilege('anon','public.delivery_areas','SELECT')
     OR NOT has_table_privilege('anon','public.products','SELECT')
     OR NOT has_table_privilege('anon','public.seller_stores','SELECT')
     OR NOT has_table_privilege('anon','public.product_images','SELECT') THEN
    RAISE EXCEPTION 'Postflight failed: public catalog read grants are missing';
  END IF;
  IF pg_get_functiondef('public.cancel_order_item(uuid)'::regprocedure) NOT LIKE '%v_item.customer_id = auth.uid()%' THEN
    RAISE EXCEPTION 'Postflight failed: buyer cancellation ownership guard is missing';
  END IF;
  IF has_function_privilege('authenticated','public.place_order(jsonb,text,text,text,text,text,boolean)','EXECUTE')
     OR has_function_privilege('anon','public.place_order(jsonb,text,text,text,text,text,boolean)','EXECUTE')
     OR has_function_privilege('public','public.place_order(jsonb,text,text,text,text,text,boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'Postflight failed: legacy non-idempotent checkout RPC remains executable';
  END IF;
  IF NOT has_function_privilege('authenticated','public.place_order(jsonb,text,text,text,text,uuid,text,boolean)','EXECUTE')
     OR has_function_privilege('anon','public.place_order(jsonb,text,text,text,text,uuid,text,boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'Postflight failed: idempotent place_order grants are incorrect';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='orders'
      AND indexname='orders_customer_checkout_request_uidx'
  ) THEN
    RAISE EXCEPTION 'Postflight failed: checkout idempotency index is missing';
  END IF;
  IF NOT has_function_privilege('authenticated','public.review_seller_application(uuid,boolean,text)','EXECUTE')
     OR has_function_privilege('anon','public.review_seller_application(uuid,boolean,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Postflight failed: seller review grants are incorrect';
  END IF;
  IF NOT has_function_privilege('authenticated','public.cancel_order_item(uuid)','EXECUTE')
     OR has_function_privilege('anon','public.cancel_order_item(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Postflight failed: cancellation RPC grants are incorrect';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='claim_first_admin') THEN
    RAISE EXCEPTION 'Postflight failed: obsolete first-admin claim function remains';
  END IF;

  SELECT count(*) INTO v_guard_count FROM pg_trigger
  WHERE tgrelid='public.order_items'::regclass
    AND tgname IN ('order_items_guard','order_items_guard_update')
    AND NOT tgisinternal;
  IF v_guard_count<>1
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.orders'::regclass AND tgname='orders_guard' AND NOT tgisinternal)
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.seller_applications'::regclass AND tgname='seller_applications_update_guard' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Postflight failed: required order/application triggers are missing or duplicated';
  END IF;

  SELECT file_size_limit,public INTO v_bucket_limit,v_bucket_public
  FROM storage.buckets WHERE id='product-images';
  IF v_bucket_limit<>5242880 OR v_bucket_public IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Postflight failed: product image bucket settings are incorrect';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Sellers upload to their own product folder' AND cmd='INSERT')
     OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Product images are publicly readable' AND cmd='SELECT')
     OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname IN ('product images own upload','product images own delete','product images public read')) THEN
    RAISE EXCEPTION 'Postflight failed: product image Storage policies are incorrect';
  END IF;
END;
$release_postflight$;

COMMIT;
SELECT jsonb_build_object('status','applied','migration_pack','0004-0021') AS release_result;
 THEN
    RAISE EXCEPTION 'Invalid phone number';
  END IF;
  IF char_length(p_address) NOT BETWEEN 5 AND 300 THEN
    RAISE EXCEPTION 'Invalid address';
  END IF;
  IF p_note IS NOT NULL AND char_length(p_note) > 500 THEN
    RAISE EXCEPTION 'Note too long';
  END IF;

  SELECT fee INTO v_fee
  FROM public.delivery_areas
  WHERE name_en = p_area AND active;
  IF v_fee IS NULL THEN
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
    v_no, v_uid, 0, v_fee, 0,
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
  SET subtotal = v_sub, total = v_sub + v_fee
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
$;

REVOKE ALL ON FUNCTION public.place_order(jsonb,text,text,text,text,uuid,text,boolean)
  FROM public, anon;
GRANT EXECUTE ON FUNCTION public.place_order(jsonb,text,text,text,text,uuid,text,boolean)
  TO authenticated;

-- Retire the legacy overload: current clients must use request-ID idempotency.
REVOKE ALL ON FUNCTION public.place_order(jsonb,text,text,text,text,text,boolean)
  FROM public, anon, authenticated;


-- ===== drizzle/migrations/0022_minimize_anon_table_grants.sql =====
-- Anonymous API clients may read the public catalog, but hold no write privileges.
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON TABLE
  public.categories,
  public.delivery_areas,
  public.products,
  public.seller_stores,
  public.product_images
TO anon;

-- ===== drizzle/migrations/0023_revoke_authenticated_truncate.sql =====
-- RLS policies do not apply to TRUNCATE. Never expose table-wide truncation to API users.
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public FROM authenticated;

-- ===== drizzle/migrations/0024_revoke_unneeded_api_ddl_and_sequence_grants.sql =====
REVOKE TRIGGER, REFERENCES ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;

-- ===== drizzle/migrations/0025_harden_future_api_default_privileges.sql =====
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON SEQUENCES FROM anon, authenticated;

-- ===== drizzle/migrations/0026_harden_future_public_api_defaults.sql =====
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE MAINTAIN ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;

DO $release_postflight$
  IF EXISTS (
    SELECT 1 FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) x
    WHERE d.defaclrole = 'postgres'::regrole
      AND d.defaclnamespace = 'public'::regnamespace
      AND d.defaclobjtype = 'r'
      AND (x.grantee = 'anon'::regrole
        OR (x.grantee IN ('anon'::regrole, 'authenticated'::regrole)
            AND x.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')))
  ) THEN
    RAISE EXCEPTION 'Postflight failed: unsafe postgres default table grants remain';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) x
    WHERE d.defaclrole = 'postgres'::regrole
      AND d.defaclnamespace = 'public'::regnamespace
      AND d.defaclobjtype = 'S'
      AND x.grantee IN ('anon'::regrole, 'authenticated'::regrole)
  ) THEN
    RAISE EXCEPTION 'Postflight failed: postgres default sequence grants remain';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_default_acl d
    CROSS JOIN LATERAL aclexplode(d.defaclacl) x
    WHERE d.defaclrole = 'postgres'::regrole
      AND d.defaclnamespace = 'public'::regnamespace
      AND d.defaclobjtype = 'f'
      AND (x.grantee = 0 OR x.grantee IN ('anon'::regrole, 'authenticated'::regrole))
      AND x.privilege_type = 'EXECUTE'
  ) THEN
    RAISE EXCEPTION 'Postflight failed: public/API default function EXECUTE remains';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      AND (
        has_table_privilege('anon', c.oid, 'TRIGGER')
        OR has_table_privilege('anon', c.oid, 'REFERENCES')
        OR has_table_privilege('authenticated', c.oid, 'TRIGGER')
        OR has_table_privilege('authenticated', c.oid, 'REFERENCES')
      )
  ) THEN
    RAISE EXCEPTION 'Postflight failed: API roles retain TRIGGER or REFERENCES privileges';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'S'
      AND (
        has_sequence_privilege('anon', c.oid, 'USAGE')
        OR has_sequence_privilege('anon', c.oid, 'SELECT')
        OR has_sequence_privilege('anon', c.oid, 'UPDATE')
        OR has_sequence_privilege('authenticated', c.oid, 'USAGE')
        OR has_sequence_privilege('authenticated', c.oid, 'SELECT')
        OR has_sequence_privilege('authenticated', c.oid, 'UPDATE')
      )
  ) THEN
    RAISE EXCEPTION 'Postflight failed: API roles retain direct sequence privileges';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND grantee = 'authenticated'
      AND privilege_type = 'TRUNCATE'
  ) THEN
    RAISE EXCEPTION 'Postflight failed: authenticated TRUNCATE privilege remains';
  END IF;

DECLARE
  v_bucket_limit bigint;
  v_bucket_public boolean;
  v_guard_count integer;
BEGIN
  IF pg_get_functiondef('public.cancel_order_item(uuid)'::regprocedure) NOT LIKE '%v_item.customer_id = auth.uid()%' THEN
    RAISE EXCEPTION 'Postflight failed: buyer cancellation ownership guard is missing';
  END IF;
  IF NOT has_function_privilege('authenticated','public.place_order(jsonb,text,text,text,text,text,boolean)','EXECUTE')
     OR has_function_privilege('anon','public.place_order(jsonb,text,text,text,text,text,boolean)','EXECUTE') THEN
    RAISE EXCEPTION 'Postflight failed: place_order grants are incorrect';
  END IF;
  IF NOT has_function_privilege('authenticated','public.review_seller_application(uuid,boolean,text)','EXECUTE')
     OR has_function_privilege('anon','public.review_seller_application(uuid,boolean,text)','EXECUTE') THEN
    RAISE EXCEPTION 'Postflight failed: seller review grants are incorrect';
  END IF;
  IF NOT has_function_privilege('authenticated','public.cancel_order_item(uuid)','EXECUTE')
     OR has_function_privilege('anon','public.cancel_order_item(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Postflight failed: cancellation RPC grants are incorrect';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='claim_first_admin') THEN
    RAISE EXCEPTION 'Postflight failed: obsolete first-admin claim function remains';
  END IF;

  SELECT count(*) INTO v_guard_count FROM pg_trigger
  WHERE tgrelid='public.order_items'::regclass
    AND tgname IN ('order_items_guard','order_items_guard_update')
    AND NOT tgisinternal;
  IF v_guard_count<>1
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.orders'::regclass AND tgname='orders_guard' AND NOT tgisinternal)
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.seller_applications'::regclass AND tgname='seller_applications_update_guard' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Postflight failed: required order/application triggers are missing or duplicated';
  END IF;

  SELECT file_size_limit,public INTO v_bucket_limit,v_bucket_public
  FROM storage.buckets WHERE id='product-images';
  IF v_bucket_limit<>5242880 OR v_bucket_public IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Postflight failed: product image bucket settings are incorrect';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Sellers upload to their own product folder' AND cmd='INSERT')
     OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Product images are publicly readable' AND cmd='SELECT')
     OR EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname IN ('product images own upload','product images own delete','product images public read')) THEN
    RAISE EXCEPTION 'Postflight failed: product image Storage policies are incorrect';
  END IF;
END;
$release_postflight$;

COMMIT;
SELECT jsonb_build_object('status','applied','migration_pack','0004-0026') AS release_result;
