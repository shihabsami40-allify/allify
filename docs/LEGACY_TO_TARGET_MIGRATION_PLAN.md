# ALLIFY legacy-to-target database migration plan

Status: design/rehearsal only — NOT an executable migration  
Last reviewed: 2026-11-19  
Authoritative project: `onqadpqdontbdvecnvby` (ap-south-1)

## Safety gate

Do not run this document as SQL. Do not replay `drizzle/migrations/0000_migration.sql` or the journal sequentially against the current project. No live schema or data changes are authorized by this plan. Before any production DDL: obtain a restorable backup/export, verify restore into an isolated database, capture fresh read-only inventory, and obtain explicit production-change approval.

## Confirmed incompatibilities

| Concern | Current legacy shape | Application target | Required treatment |
|---|---|---|---|
| Roles | `app_role(buyer,seller,admin)`; profile role column | `app_role(admin,seller,customer)` plus `user_roles` | Preserve legacy labels during transition; explicitly map buyer→customer; backfill roles from profiles only after auditing every role value |
| Store data | `stores(owner_id,name,phone,address,bio,status,created_at)` | `seller_stores` with slug, area, branding, is_demo, rating | Add target table first; map existing store IDs where possible; retain legacy table and policies until references are migrated |
| Product ownership | `products.store_id → stores.id` | `products.store_id → seller_stores.id` | Cannot simply replace FK; reconcile ID mapping and create/validate target FK without losing product references |
| Product fields | `name,category,image_url,status` | `title_bn,title_en,category_id,product_images,status` | Add columns and deterministic mapping; review category values before assigning category_id; migrate image URLs without assuming storage objects exist |
| Categories | six existing rows and UUIDs; legacy `name,slug,active` | target `name_bn,name_en,icon,sort_order` | Preserve all six IDs and slugs (including lifestyle); add/translate columns in place rather than reseeding or replacing rows |
| Orders | `order_number,customer_name,customer_phone,delivery_address,total_amount,delivery_fee,status` | `order_no,recipient,phone,address_line,subtotal,total,checkout_request_id` | Add/map columns with explicit amount and status rules; retain original columns during validation |
| Order items | legacy product/store references and `product_name` | target `title,image_url` and nullable-safe references | Preserve order history; map snapshot fields and validate every FK before adding stricter constraints |
| Missing entities | no target carts, addresses, delivery areas, seller applications, product images, user roles | target tables required by app | Create only after table/function dependencies and RLS policies are designed |
| Enums | `approval_state`, `order_state`, legacy `app_role` | `application_status`, `order_status`, target role labels | Create new enum types where required; never rename/drop legacy types or labels while old functions/policies depend on them |
| Legacy routines | `is_admin()`, `owns_store(uuid)`, guest checkout/order lookup routines | target role/ownership and authenticated checkout RPCs | Inventory exact signatures, grants, search_path and dependencies; migrate dependent policies before changing grants or retiring routines |

## Required staged rollout

1. **Backup and baseline:** verify a restorable backup; save read-only inventory, category IDs/slugs, table counts, constraints, indexes, policies, triggers, routine definitions/grants, storage bucket config and object counts.
2. **Additive foundation:** create new enum types and missing target tables/columns without dropping or renaming legacy objects. Keep existing RLS and helper routines working.
3. **Identity and store mapping:** establish explicit legacy-store-ID → target-store-ID mapping. Backfill `user_roles` from audited profile roles; preserve ownerless stores as an explicit review bucket, not guessed ownership.
4. **Product and category mapping:** preserve category UUIDs; map products by verified store mapping; produce an exception report for unmatched category strings, unsupported statuses and image URLs. Do not silently coerce unknown values.
5. **Order-history mapping:** copy/map order headers and item snapshots while preserving IDs and timestamps. Validate totals, quantities, status distributions and every relationship before constraints are tightened.
6. **Target RPC and RLS:** install target functions with exact signatures, fixed search_path, least-privilege EXECUTE grants, and policy tests. Migrate dependencies before restricting legacy SECURITY DEFINER helpers.
7. **Validation:** run the read-only target contract diff, row-count/reconciliation checks, RLS/grant checks, and authenticated workflow tests in an isolated restored clone.
8. **Cutover:** only after explicit approval, point Preview at the authoritative project and run seller application/review, store/product/image creation, customer cart/checkout, seller order processing/cancellation, and customer history tests.
9. **Production:** change Vercel project URL only after schema and Preview workflows pass; promote to Production only with separate explicit approval. Keep legacy structures through a defined rollback window.

## Hard stop conditions

- Backup cannot be restored and verified.
- Any category UUID/slug changes unexpectedly.
- Store/product/order/item counts or financial totals do not reconcile.
- Any legacy SECURITY DEFINER dependency is unaccounted for.
- Any target table is missing RLS or least-privilege grants.
- Any RPC exact signature, return type, search_path or execute grant differs from reviewed expectations.
- A migration requires dropping legacy columns/tables/types before the rollback window ends.

## Current state

The project is on Supabase Free; a Supabase Development Branch attempt was rejected by the platform as Pro-only. Therefore rehearsal must use a separately provisioned disposable PostgreSQL environment or another explicitly approved isolated project. The live authoritative project has not been modified. The existing `product-images` bucket must be preserved; its configuration is already present and should not be recreated.
