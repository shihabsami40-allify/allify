-- ALLIFY legacy data mapping report (READ ONLY)
-- Run only after 001_authoritative_schema_inventory.sql confirms the six legacy tables.
-- Target: authoritative Supabase project onqadpqdontbdvecnvby.
-- This script returns aggregate counts and category mapping candidates only.
-- It does not return names, phone numbers, addresses, auth identities, or object contents.
-- No INSERT/UPDATE/DELETE/DDL is performed.

-- A. Preserve existing category identity and report the current values.
SELECT id, slug, active, count(*) OVER () AS total_category_rows
FROM public.categories
ORDER BY slug;

-- B. Legacy role distribution (counts only).
SELECT role::text AS legacy_role, count(*) AS profile_count
FROM public.profiles
GROUP BY role
ORDER BY role::text;

-- C. Store status and ownership coverage (counts only).
SELECT status::text AS legacy_store_status,
       count(*) AS store_count,
       count(*) FILTER (WHERE owner_id IS NOT NULL) AS owned_store_count,
       count(*) FILTER (WHERE owner_id IS NULL) AS ownerless_store_count
FROM public.stores
GROUP BY status
ORDER BY status::text;

-- D. Product category mapping candidates.
-- A match is only a candidate; it must be reviewed before assigning category_id.
WITH category_map AS (
  SELECT lower(trim(slug)) AS slug FROM public.categories
),
product_values AS (
  SELECT lower(trim(coalesce(category, ''))) AS category_value, count(*) AS product_count
  FROM public.products
  GROUP BY lower(trim(coalesce(category, '')))
)
SELECT p.category_value,
       p.product_count,
       EXISTS (SELECT 1 FROM category_map c WHERE c.slug = p.category_value) AS exact_slug_candidate
FROM product_values p
ORDER BY p.product_count DESC, p.category_value;

-- E. Product status and image-path coverage (aggregate only).
SELECT status::text AS legacy_product_status,
       count(*) AS product_count,
       count(*) FILTER (WHERE image_url IS NULL OR trim(image_url) = '') AS missing_image_count,
       count(*) FILTER (WHERE image_url LIKE '/%') AS relative_image_path_count,
       count(*) FILTER (WHERE image_url LIKE 'https://%') AS https_image_count,
       count(*) FILTER (WHERE image_url IS NOT NULL AND image_url NOT LIKE '/%' AND image_url NOT LIKE 'https://%') AS other_image_path_count
FROM public.products
GROUP BY status
ORDER BY status::text;

-- F. Order status and payment method distribution (counts only).
SELECT status::text AS legacy_order_status,
       payment_method,
       count(*) AS order_count,
       count(*) FILTER (WHERE total_amount < delivery_fee) AS negative_subtotal_candidate_count,
       count(*) FILTER (WHERE total_amount < 0 OR delivery_fee < 0) AS invalid_amount_count
FROM public.orders
GROUP BY status, payment_method
ORDER BY status::text, payment_method;

-- G. Order-item status distribution and broken relationship counts.
SELECT status::text AS legacy_item_status,
       count(*) AS item_count,
       count(*) FILTER (WHERE product_id IS NULL) AS null_product_id_count,
       count(*) FILTER (WHERE store_id IS NULL) AS null_store_id_count,
       count(*) FILTER (WHERE product_id IS NOT NULL AND NOT EXISTS
         (SELECT 1 FROM public.products p WHERE p.id = order_items.product_id)) AS missing_product_reference_count,
       count(*) FILTER (WHERE store_id IS NOT NULL AND NOT EXISTS
         (SELECT 1 FROM public.stores s WHERE s.id = order_items.store_id)) AS missing_store_reference_count
FROM public.order_items
GROUP BY status
ORDER BY status::text;

-- H. Cross-table consistency checks (counts only).
SELECT
  (SELECT count(*) FROM public.orders WHERE customer_id IS NOT NULL) AS orders_with_customer_id,
  (SELECT count(*) FROM public.orders o WHERE o.customer_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = o.customer_id)) AS orders_with_missing_profile,
  (SELECT count(*) FROM public.products p
    WHERE NOT EXISTS (SELECT 1 FROM public.stores s WHERE s.id = p.store_id)) AS products_with_missing_store,
  (SELECT count(*) FROM public.order_items oi
    WHERE NOT EXISTS (SELECT 1 FROM public.orders o WHERE o.id = oi.order_id)) AS items_with_missing_order;

-- I. Legacy enum labels relevant to explicit status mapping.
SELECT t.typname AS enum_name, e.enumsortorder, e.enumlabel
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname IN ('app_role', 'approval_state', 'order_state')
ORDER BY t.typname, e.enumsortorder;

-- J. Storage object count only. Does not reveal object names or metadata.
SELECT bucket_id, count(*) AS object_count
FROM storage.objects
GROUP BY bucket_id
ORDER BY bucket_id;
