# Legacy data mapping report guide

Run `supabase/preflight/002_legacy_data_mapping_report.sql` against the authoritative project only after the read-only schema inventory has confirmed the legacy tables and columns.

## What the report checks

- Existing category IDs/slugs, without changing them.
- Legacy profile-role counts and store/product/order/item status distributions.
- Exact category-slug candidates for legacy `products.category`; candidates are not automatic mappings.
- Product image URL classes (relative, HTTPS, missing, other) without exposing the URLs.
- Order amount anomalies before calculating a target subtotal.
- Broken or null order-item/product/store relationships.
- Whether legacy orders point to a profile row.
- Legacy enum labels, including `processing`, which has no direct value in the target `order_status` enum.
- Storage object counts per bucket without exposing object names or contents.

## Review gates before any migration

1. Every legacy product category value must be explicitly mapped or intentionally left unmapped. Do not silently map unknown values.
2. Do not copy a relative image path into Storage or assume the file exists. Verify each referenced image in a separate controlled export process.
3. Do not derive `subtotal = total_amount - delivery_fee` until the invalid/negative candidate count is zero and historical semantics are confirmed.
4. Do not coerce `processing` into `shipped` or `confirmed`; preserve it with an explicit compatibility decision.
5. Do not backfill owner IDs, customer IDs, or role rows by guessing. Auth user identity must be verified.
6. Do not remove legacy tables, columns, enums, policies, or functions as part of the initial additive migration.
7. Do not run any write migration until a restorable backup exists and the migration has been rehearsed against a restored copy.

This report is read-only. It is not a migration and does not authorize a live schema change.
