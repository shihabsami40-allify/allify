-- ALLIFY migration-readiness reconciliation (READ ONLY)
-- Run only after 001_authoritative_schema_inventory.sql and 002_legacy_data_mapping_report.sql.
-- Reports aggregate exception counts for a staged legacy-to-target migration.
-- No customer names, phone numbers, addresses, auth IDs, or Storage object names are returned.
-- No DDL, DML, grants, or function changes are performed.

-- 1. Profile roles that need an explicit mapping to the target role table.
-- Legacy buyer maps to customer only after confirming the intended business rule.
SELECT role::text AS legacy_role,
       count(*) AS profile_count,
       CASE role::text
         WHEN 'buyer' THEN 'customer (review mapping)'
         WHEN 'seller' THEN 'seller (review mapping)'
         WHEN 'admin' THEN 'admin (review mapping)'
         ELSE 'UNMAPPED — manual review'
       END AS proposed_role_mapping
FROM public.profiles
GROUP BY role
ORDER BY role::text;

-- 2. Duplicate store owners. The target seller_stores contract has at most one
-- non-null owner per row set; duplicate ownership must be resolved, not dropped.
SELECT count(*) AS duplicate_owner_groups,
       coalesce(sum(owner_store_count), 0) AS stores_in_duplicate_owner_groups
FROM (
  SELECT owner_id, count(*) AS owner_store_count
  FROM public.stores
  WHERE owner_id IS NOT NULL
  GROUP BY owner_id
  HAVING count(*) > 1
) duplicates;

-- 3. Store slug candidates derived from names. This is only a collision report;
-- generated slugs must be reviewed before any unique constraint is installed.
WITH candidates AS (
  SELECT id,
         nullif(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), '') AS slug_candidate
  FROM public.stores
)
SELECT count(*) FILTER (WHERE slug_candidate IS NULL) AS stores_without_ascii_slug_candidate,
       count(*) FILTER (WHERE duplicate_count > 1) AS stores_in_slug_collision_groups
FROM (
  SELECT c.*, count(*) OVER (PARTITION BY slug_candidate) AS duplicate_count
  FROM candidates c
) checked;

-- 4. Product category mapping candidates. Exact slug and exact normalized
-- category-name matches are reported separately; unmatched values need review.
WITH categories AS (
  SELECT id, lower(trim(slug)) AS slug_key, lower(trim(name)) AS name_key
  FROM public.categories
), product_categories AS (
  SELECT lower(trim(coalesce(category, ''))) AS category_key,
         count(*) AS product_count
  FROM public.products
  GROUP BY lower(trim(coalesce(category, '')))
)
SELECT p.category_key,
       p.product_count,
       count(c.id) FILTER (WHERE c.slug_key = p.category_key) AS exact_slug_matches,
       count(c.id) FILTER (WHERE c.name_key = p.category_key) AS exact_name_matches,
       CASE
         WHEN count(c.id) FILTER (WHERE c.slug_key = p.category_key) = 1 THEN 'SLUG_CANDIDATE'
         WHEN count(c.id) FILTER (WHERE c.name_key = p.category_key) = 1 THEN 'NAME_CANDIDATE'
         WHEN count(c.id) = 0 THEN 'UNMATCHED — manual mapping'
         ELSE 'AMBIGUOUS — manual mapping'
       END AS mapping_state
FROM product_categories p
LEFT JOIN categories c
  ON c.slug_key = p.category_key OR c.name_key = p.category_key
GROUP BY p.category_key, p.product_count
ORDER BY p.product_count DESC, p.category_key;

-- 5. Product values that can block target constraints or safe inventory mapping.
SELECT count(*) FILTER (WHERE price <= 0) AS non_positive_price_count,
       count(*) FILTER (WHERE stock < 0) AS negative_stock_count,
       count(*) FILTER (WHERE name IS NULL OR trim(name) = '') AS missing_product_name_count,
       count(*) FILTER (WHERE store_id IS NULL) AS missing_store_id_count,
       count(*) FILTER (WHERE category IS NULL OR trim(category) = '') AS missing_category_count
FROM public.products;

-- 6. Store and product legacy statuses. Do not cast approval_state directly
-- to target enums: pending/approved/rejected have different target semantics.
SELECT 'stores' AS source_table, status::text AS legacy_status, count(*) AS row_count
FROM public.stores
GROUP BY status
UNION ALL
SELECT 'products', status::text, count(*)
FROM public.products
GROUP BY status
ORDER BY source_table, legacy_status;

-- 7. Order header financial consistency. This only returns aggregate exception
-- counts; it does not expose order numbers, names, phones, or addresses.
SELECT count(*) AS order_count,
       count(*) FILTER (WHERE total_amount < 0 OR delivery_fee < 0) AS negative_amount_orders,
       count(*) FILTER (WHERE total_amount < delivery_fee) AS subtotal_below_delivery_fee_orders,
       count(*) FILTER (WHERE customer_id IS NOT NULL AND NOT EXISTS
         (SELECT 1 FROM public.profiles p WHERE p.id = orders.customer_id)) AS orders_with_missing_profile
FROM public.orders;

-- 8. Reconcile order totals against item snapshots plus delivery fee.
-- Rounding is to two decimal places to match currency precision.
WITH item_totals AS (
  SELECT order_id,
         sum(unit_price * quantity) AS item_subtotal,
         count(*) AS item_count
  FROM public.order_items
  GROUP BY order_id
)
SELECT count(*) AS orders_with_items,
       count(*) FILTER (WHERE i.order_id IS NULL) AS orders_without_items,
       count(*) FILTER (
         WHERE round(coalesce(i.item_subtotal, 0)::numeric, 2)
             <> round((o.total_amount - o.delivery_fee)::numeric, 2)
       ) AS item_header_subtotal_mismatches,
       count(*) FILTER (WHERE i.item_count > 0 AND i.item_subtotal < 0) AS negative_item_subtotals
FROM public.orders o
LEFT JOIN item_totals i ON i.order_id = o.id;

-- 9. Order-item integrity. A missing product/store link requires explicit
-- history-preservation treatment before target foreign keys are tightened.
SELECT count(*) AS order_item_count,
       count(*) FILTER (WHERE quantity <= 0) AS non_positive_quantities,
       count(*) FILTER (WHERE unit_price < 0) AS negative_unit_prices,
       count(*) FILTER (WHERE product_id IS NULL OR NOT EXISTS
         (SELECT 1 FROM public.products p WHERE p.id = order_items.product_id)) AS unresolved_product_links,
       count(*) FILTER (WHERE store_id IS NULL OR NOT EXISTS
         (SELECT 1 FROM public.stores s WHERE s.id = order_items.store_id)) AS unresolved_store_links,
       count(*) FILTER (WHERE NOT EXISTS
         (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id)) AS unresolved_order_links
FROM public.order_items;

-- 10. Legacy order statuses and payment methods. These are source distributions,
-- not automatic conversion rules.
SELECT status::text AS legacy_status,
       payment_method,
       count(*) AS order_count
FROM public.orders
GROUP BY status, payment_method
ORDER BY status::text, payment_method;

-- 11. Preserve Storage configuration and object counts without exposing paths.
SELECT b.id AS bucket_id,
       b.public,
       b.file_size_limit,
       b.allowed_mime_types,
       count(o.id) AS object_count
FROM storage.buckets b
LEFT JOIN storage.objects o ON o.bucket_id = b.id
WHERE b.id = 'product-images'
GROUP BY b.id, b.public, b.file_size_limit, b.allowed_mime_types;
