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
  ('user_roles','id','authorization row identity'),
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
  ('delivery_areas','sort_order','checkout delivery area ordering'),
  ('seller_applications','id','seller onboarding'),
  ('seller_applications','user_id','seller onboarding ownership'),
  ('seller_applications','store_name','seller onboarding'),
  ('seller_applications','owner_name','seller onboarding'),
  ('seller_applications','phone','seller onboarding'),
  ('seller_applications','area','seller onboarding'),
  ('seller_applications','address','seller onboarding'),
  ('seller_applications','status','seller onboarding moderation'),
  ('seller_applications','admin_note','seller onboarding moderation'),
  ('seller_applications','category_hint','seller onboarding context'),
  ('seller_applications','description','seller onboarding description'),
  ('seller_applications','created_at','seller onboarding timestamp'),
  ('seller_applications','reviewed_at','seller onboarding review timestamp'),
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
  ('seller_stores','logo_url','seller storefront branding'),
  ('seller_stores','banner_url','seller storefront branding'),
  ('seller_stores','rating','store discovery rating'),
  ('seller_stores','created_at','store discovery ordering'),
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
  ('products','rating','catalog rating'),
  ('products','created_at','catalog ordering'),
  ('products','updated_at','product management timestamp'),
  ('product_images','id','product media'),
  ('product_images','product_id','product media'),
  ('product_images','url','product media'),
  ('product_images','sort_order','product media'),
  ('carts','id','customer cart'),
  ('carts','user_id','customer cart ownership'),
  ('carts','updated_at','customer cart timestamp'),
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
  ('addresses','created_at','saved checkout address timestamp'),
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
  ('orders','created_at','order history ordering'),
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

-- Exact RPC contracts required by the current application. Resolve the
-- expected identity signature rather than accepting a same-name overload.
-- Security-definer mode, search_path and effective EXECUTE grants are reported
-- for review; this query does not change privileges.
WITH expected_rpc(signature, function_name, app_usage, expected_return_type) AS (
  VALUES
    ('public.has_role(public.app_role, uuid)', 'has_role', 'authorization checks', 'boolean'),
    ('public.place_order(text, text, jsonb, text, text, text, text, boolean)', 'place_order', 'authenticated idempotent COD checkout', 'text'),
    ('public.cancel_order_item(uuid)', 'cancel_order_item', 'atomic item cancellation', 'boolean'),
    ('public.review_seller_application(uuid, boolean, text)', 'review_seller_application', 'admin seller application review', 'uuid')
)
SELECT e.function_name,
       e.signature AS expected_signature,
       e.app_usage,
       CASE WHEN p.oid IS NULL THEN 'MISSING_EXACT_SIGNATURE' ELSE 'PRESENT' END AS contract_state,
       coalesce(p.prorettype::regtype::text, '') AS live_return_type,
       CASE WHEN p.oid IS NULL THEN NULL ELSE p.prorettype::regtype::text = e.expected_return_type END AS return_type_matches,
       p.prosecdef AS security_definer,
       p.proconfig AS function_settings,
       CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('anon', p.oid, 'EXECUTE') END AS anon_execute,
       CASE WHEN p.oid IS NULL THEN NULL ELSE has_function_privilege('authenticated', p.oid, 'EXECUTE') END AS authenticated_execute
FROM expected_rpc e
LEFT JOIN pg_proc p ON p.oid = to_regprocedure(e.signature)
ORDER BY e.function_name;

-- Legacy names that must remain accounted for during a compatibility window.
SELECT p.proname AS legacy_function,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname IN ('is_admin','owns_store','lookup_order','place_marketplace_order','sync_seller_role')
ORDER BY p.proname, identity_arguments;


-- Generated enum contracts. A label mismatch can break inserts, filters, and
-- status transitions even when every expected column exists.
WITH expected_enum(enum_name, enum_label) AS (
  VALUES
    ('app_role','admin'), ('app_role','seller'), ('app_role','customer'),
    ('application_status','pending'), ('application_status','approved'), ('application_status','rejected'),
    ('order_status','pending'), ('order_status','confirmed'), ('order_status','processing'),
    ('order_status','shipped'), ('order_status','delivered'), ('order_status','cancelled'),
    ('product_status','active'), ('product_status','draft'), ('product_status','hidden'),
    ('store_status','pending'), ('store_status','active'), ('store_status','suspended')
)
SELECT e.enum_name,
       e.enum_label,
       CASE WHEN t.typname IS NULL THEN 'MISSING_ENUM'
            WHEN a.enumlabel IS NULL THEN 'MISSING_LABEL'
            ELSE 'PRESENT' END AS contract_state
FROM expected_enum e
LEFT JOIN pg_type t
  ON t.typname = e.enum_name
 AND t.typnamespace = 'public'::regnamespace
LEFT JOIN pg_enum a
  ON a.enumtypid = t.oid
 AND a.enumlabel = e.enum_label
ORDER BY e.enum_name, e.enum_label;


-- Extra live enum labels are reported too. These may be legitimate legacy
-- values (for example app_role.buyer) and must be mapped, not silently dropped.
WITH expected_enum(enum_name, enum_label) AS (
  VALUES
    ('app_role','admin'), ('app_role','seller'), ('app_role','customer'),
    ('application_status','pending'), ('application_status','approved'), ('application_status','rejected'),
    ('order_status','pending'), ('order_status','confirmed'), ('order_status','processing'),
    ('order_status','shipped'), ('order_status','delivered'), ('order_status','cancelled'),
    ('product_status','active'), ('product_status','draft'), ('product_status','hidden'),
    ('store_status','pending'), ('store_status','active'), ('store_status','suspended')
)
SELECT t.typname AS enum_name,
       a.enumlabel AS live_only_label,
       'REVIEW_LEGACY_LABEL' AS contract_state
FROM pg_type t
JOIN pg_enum a ON a.enumtypid = t.oid
WHERE t.typnamespace = 'public'::regnamespace
  AND EXISTS (SELECT 1 FROM expected_enum e WHERE e.enum_name = t.typname)
  AND NOT EXISTS (
    SELECT 1 FROM expected_enum e
    WHERE e.enum_name = t.typname AND e.enum_label = a.enumlabel
  )
ORDER BY t.typname, a.enumsortorder;
