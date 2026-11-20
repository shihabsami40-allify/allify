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


## Fresh live dependency observations — 2026-11-19

Read-only catalog inspection of the active authoritative project confirmed these additional compatibility requirements:

- The auth-user trigger `handle_new_user()` inserts `profiles(id, full_name, role)` with legacy enum value `buyer`. It must remain compatible until the new profile/role provisioning trigger is installed and tested. The target baseline's `customer` role cannot be substituted into the legacy enum.
- `sync_seller_role()` is attached to both INSERT and UPDATE on legacy `stores`; it updates `profiles.role` between `seller` and `buyer` based on legacy store approval state. Migrate or deliberately bridge this behavior before switching seller approval to the new application/store workflow.
- `protect_moderation_fields()` guards status changes on both `stores` and `products`. Its trigger dependencies must be included in the cutover/rollback inventory.
- The database has an `rls_auto_enable()` event trigger for newly created public tables. New tables therefore begin with RLS enabled, but this does not create policies or grants; migration stages must install and test policies before exposing table access.
- Legacy RLS policies directly call `is_admin()` and `owns_store(uuid)` across categories, products, stores, orders and order_items. In particular, the order_items read policy joins orders and checks customer ownership; seller update policy uses store ownership. Do not revoke helper EXECUTE or replace helper definitions until all dependent policies have compatible replacements.
- The existing categories SELECT policy permits public reads of active categories and admin reads; a separate authenticated ALL policy allows admin management. This currently produces the multiple-permissive-policy advisor warning for authenticated SELECT. Consolidate only as part of a tested policy migration.
- Legacy product/store states use `approval_state` values such as `pending` and `approved`, whereas target app contracts use `product_status` and `store_status`. Map these deliberately (and preserve rejected/suspended semantics where present); do not cast or rename enum types in place.
- The live project exposes four SECURITY DEFINER functions to anon and authenticated: `is_admin()`, `owns_store(uuid)`, `lookup_order(text,text)`, and `place_marketplace_order(text,text,text,text,jsonb)`. The guest order-creation and order-lookup endpoints are existing legacy behavior. Treat them as externally reachable APIs: review rate limits, validation, response data, and cutover compatibility. Do not revoke or change them as an incidental cleanup.

Fresh Supabase Advisor observations: 4 anon-callable SECURITY DEFINER functions (and the same 4 callable by authenticated), 7 RLS init-plan performance findings, 1 multiple-permissive-policy finding on categories, and 7 unused-index informational findings. Health advisor returned no findings. These are recorded as baseline findings, not authorization to change production.


## Field-level mapping specification

See [`LEGACY_COLUMN_MAPPING.md`](./LEGACY_COLUMN_MAPPING.md) for the detailed legacy-column to target-field mapping, enum compatibility rules, new-table strategy, trigger/RPC dependencies, and cutover validation gates. It is a review specification, not executable SQL.


## Legacy RPC security and Data API exposure

See [`LEGACY_RPC_SECURITY_REMEDIATION.md`](./LEGACY_RPC_SECURITY_REMEDIATION.md) for the current advisor findings and dependency-aware remediation order. Do not revoke the four legacy SECURITY DEFINER RPCs in isolation: existing policies and guest workflows depend on them. Every newly created public table also needs explicit Data API grants and RLS; automatic exposure must not be assumed.
