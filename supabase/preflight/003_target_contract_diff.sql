-- ALLIFY target application contract diff (READ ONLY)
-- Run on authoritative Supabase project after 001_authoritative_schema_inventory.sql.
-- Compares columns referenced by the current app with the live public schema.
-- Returns schema metadata only; never reads customer, seller, order, Auth, or Storage records.
-- No DDL or data mutation is performed.

WITH expected(table_name, column_name, app_usage) AS (
  VALUES
  ('profiles','id','auth profile identity'),
  ('profiles','full_name','account profile'),
  ('profiles','phone','account profile'),
  ('user_roles','user_id','authorization'),
  ('user_roles','role','authorization'),
  ('categories','id','public catalog'),
  ('categories','slug','public catalog'),
  ('categories','name_bn','public catalog'),
  ('categories','name_en','public catalog'),
  ('categories','icon','public catalog'),
  ('categories','sort_order','public catalog'),
  ('delivery_areas','id','checkout delivery fees'),
  ('delivery_areas','name_bn','checkout delivery area selector'),
  ('delivery_areas','name_en','checkout delivery fee lookup'),
  ('delivery_areas','zone','checkout delivery rules'),
  ('delivery_areas','fee','checkout delivery fee'),
  ('delivery_areas','active','checkout delivery area availability'),
  ('seller_applications','id','seller onboarding'),
  ('seller_applications','user_id','seller onboarding ownership'),
  ('seller_applications','store_name','seller onboarding'),
  ('seller_applications','owner_name','seller onboarding'),
  ('seller_applications','phone','seller onboarding'),
  ('seller_applications','area','seller onboarding'),
  ('seller_applications','address','seller onboarding'),
  ('seller_applications','status','seller onboarding moderation'),
  ('seller_applications','admin_note','seller onboarding moderation'),
  ('seller_stores','id','seller storefront'),
  ('seller_stores','owner_id','seller storefront ownership'),
  ('seller_stores','slug','seller storefront routing'),
  ('seller_stores','name','seller storefront'),
  ('seller_stores','name_en','seller storefront'),
  ('seller_stores','description','seller storefront'),
  ('seller_stores','area','seller storefront'),
  ('seller_stores','address','seller storefront'),
  ('seller_stores','phone','seller storefront'),
  ('seller_stores','status','seller storefront moderation'),
  ('seller_stores','is_demo','demo protection'),
  ('products','id','catalog and inventory'),
  ('products','store_id','catalog and inventory'),
  ('products','category_id','catalog filtering'),
  ('products','slug','product routing'),
  ('products','title_bn','catalog display'),
  ('products','title_en','catalog display'),
  ('products','description','catalog display'),
  ('products','price','catalog and checkout'),
  ('products','compare_price','catalog display'),
  ('products','stock','inventory'),
  ('products','status','catalog moderation'),
  ('products','sold_count','catalog ranking'),
  ('product_images','id','product media'),
  ('product_images','product_id','product media'),
  ('product_images','url','product media'),
  ('product_images','sort_order','product media'),
  ('carts','id','customer cart'),
  ('carts','user_id','customer cart ownership'),
  ('cart_items','cart_id','customer cart'),
  ('cart_items','product_id','customer cart'),
  ('cart_items','quantity','customer cart'),
  ('addresses','id','saved checkout address'),
  ('addresses','user_id','saved checkout address ownership'),
  ('addresses','recipient','saved checkout address'),
  ('addresses','phone','saved checkout address'),
  ('addresses','area','saved checkout address'),
  ('addresses','address_line','saved checkout address'),
  ('addresses','is_default','saved checkout address'),
  ('orders','id','customer order history'),
  ('orders','order_no','customer order history'),
  ('orders','customer_id','customer order ownership'),
  ('orders','status','order lifecycle'),
  ('orders','payment_method','COD checkout'),
  ('orders','subtotal','COD checkout'),
  ('orders','delivery_fee','COD checkout'),
  ('orders','total','COD checkout'),
  ('orders','recipient','COD checkout'),
  ('orders','phone','COD checkout'),
  ('orders','area','COD checkout'),
  ('orders','address_line','COD checkout'),
  ('orders','note','COD checkout'),
  ('orders','is_demo','demo order protection'),
  ('orders','checkout_request_id','checkout idempotency'),
  ('order_items','id','seller order management'),
  ('order_items','order_id','seller order management'),
  ('order_items','product_id','seller order management'),
  ('order_items','store_id','seller order management'),
  ('order_items','title','seller order management'),
  ('order_items','image_url','seller order management'),
  ('order_items','unit_price','seller order management'),
  ('order_items','quantity','seller order management'),
  ('order_items','status','seller order management')
)
SELECT e.table_name,
       e.column_name,
       e.app_usage,
       CASE WHEN c.column_name IS NULL THEN 'MISSING'
            ELSE 'PRESENT' END AS contract_state,
       c.data_type AS live_data_type,
       c.udt_name AS live_udt_name
FROM expected e
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = e.table_name
 AND c.column_name = e.column_name
ORDER BY e.table_name, e.column_name;

-- Current RPC names required by the application. Presence does not prove
-- signature/grants/security are correct; inspect those in preflight 001.
WITH expected_rpc(function_name, app_usage) AS (
  VALUES
    ('has_role','authorization checks'),
    ('place_order','authenticated COD checkout'),
    ('cancel_order_item','atomic item cancellation'),
    ('review_seller_application','admin seller application review')
)
SELECT e.function_name,
       e.app_usage,
       count(p.oid) AS matching_public_overloads,
       coalesce(string_agg(pg_get_function_identity_arguments(p.oid), '; '), '') AS live_signatures
FROM expected_rpc e
LEFT JOIN pg_proc p
  ON p.pronamespace = 'public'::regnamespace
 AND p.proname = e.function_name
GROUP BY e.function_name, e.app_usage
ORDER BY e.function_name;

-- Legacy names that must remain accounted for during a compatibility window.
SELECT p.proname AS legacy_function,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname IN ('is_admin','owns_store','lookup_order','place_marketplace_order','sync_seller_role')
ORDER BY p.proname, identity_arguments;
