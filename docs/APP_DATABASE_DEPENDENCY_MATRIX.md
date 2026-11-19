# ALLIFY application-to-database dependency matrix

This document is based on the current recovery-branch application code and a read-only inspection of the authoritative Supabase project `onqadpqdontbdvecnvby`. It is a compatibility plan, not approval to mutate the live database.

## Runtime contracts currently required by the application

| App feature | Tables / columns / RPCs used by app | Legacy live schema status |
|---|---|---|
| Public catalog | `products` + `product_images` + `seller_stores`; `categories`; `delivery_areas`; product fields `title_bn`, `title_en`, `slug`, `category_id`, `sold_count`, `status`; store fields `name_en`, `slug`, `is_demo`, `logo_url`, `banner_url`, `rating` | Only legacy `products`, `categories`, `stores` exist; legacy products use `name`, `category`; legacy stores use `name`, `bio`. Other required relations/columns absent. |
| Account/profile | `profiles(id, full_name, phone)`; `user_roles(user_id, role)`; account orders and applications | `profiles.phone` and `user_roles` absent; legacy role is `profiles.role`. |
| Seller application | `seller_applications` fields including store_name, owner_name, phone, area, address, description, status, admin_note, reviewed_at; `delivery_areas(name_bn)` | Both tables absent. |
| Seller store management | `seller_stores` and active/suspended status; product/image relations | Legacy `stores` is not column-compatible and must not be renamed in place. |
| Product management | `products` new bilingual/title/category/status fields; `product_images`; RPC `has_role` | Legacy product columns/status enum incompatible; `has_role` absent. |
| Admin moderation | `has_role`, `review_seller_application`; updates to `seller_stores` and `products` | Legacy uses `is_admin`, `owns_store`, `stores`, and `protect_* ` triggers. |
| Checkout | `place_order(jsonb,text,text,text,text,uuid,text,boolean)`; `delivery_areas`, `orders`, `order_items`, `products`, `product_images`, `seller_stores`, `carts`, `cart_items`, optional `addresses` | Live only has guest-capable `place_marketplace_order(text,text,text,text,jsonb)`; incompatible args, return type and security contract. |
| Order management | `order_items.status`; `cancel_order_item(uuid)`; order snapshots `title`, `image_url`; `orders.order_no`, `recipient`, `phone`, `address_line`, `note`, `is_demo` | Legacy uses `product_name`, `order_number`, `customer_name`, `customer_phone`, `delivery_address`; no atomic cancellation RPC. |

## Generated schema contract coverage

The read-only contract diff in `supabase/preflight/003_target_contract_diff.sql` is aligned with `src/integrations/supabase/types.ts` for the currently generated table fields, including storefront branding/rating, seller-application metadata, cart/address timestamps, and product/order timestamps. It separately checks every expected label for the generated `app_role`, `application_status`, `order_status`, `product_status`, and `store_status` enums. The diff also reports live-only enum labels for review (notably the legacy `app_role.buyer` value against the generated `customer` role contract), so legacy labels are not silently treated as safe to remove. A `PRESENT` result is only a structural match; it does not prove constraints, RLS, grants, function semantics, or end-to-end behavior. Review those independently in preflight 001 and the functional acceptance suite.

## Required function inventory

The current server functions call these database functions by exact name:
- `has_role(app_role, uuid)` (PostgreSQL identity signature `public.has_role(public.app_role, uuid)`; generated TypeScript args are `_role` then `_user_id`)
- `place_order(jsonb, text, text, text, text, uuid, text, boolean)` (authenticated, idempotent COD checkout; generated TypeScript args map to `p_items`, `p_recipient`, `p_phone`, `p_area`, `p_address`, `p_request_id`, `p_note`, `p_save_address`)
- `cancel_order_item(uuid)` (atomic stock restoration and cancellation)
- `review_seller_application(uuid, boolean, text)` (one-time admin review and approval; returns `uuid`)

The live database instead exposes `is_admin()`, `owns_store(uuid)`, `lookup_order(text,text)`, and `place_marketplace_order(text,text,text,text,jsonb)`. These are not interchangeable. Existing RLS policies depend on legacy helper functions; do not revoke or replace them until every dependent policy/trigger has a tested replacement.

## Safe implementation order

1. Run the read-only inventory script in `supabase/preflight/001_authoritative_schema_inventory.sql` and export a restorable backup.
2. Reconcile role model and profile fields without dropping `profiles.role` or legacy enum values.
3. Add new catalog/store/application/delivery relations and columns additively. Keep legacy `stores`, `products`, `orders`, `order_items` and their current columns during a dual-read window.
4. Preserve the six existing category IDs and slugs. Backfill bilingual names; add only missing seed slugs with conflict-safe inserts.
5. Backfill `seller_stores`, product category IDs and image rows only after explicit mapping reports have zero unresolved rows. Do not guess category matches or storage paths.
6. Install least-privilege RLS and helper functions, then verify anon/authenticated access separately.
7. Add and test authenticated idempotent checkout, status lifecycle, and atomic cancellation. Do not expose the old guest RPC as the new checkout path.
8. Deploy the app only after database contract tests pass. Update Vercel URL/key configuration only after the authoritative project publishable key is verified and the schema is ready.
9. Retain legacy tables/functions until production-like acceptance tests and rollback window complete.

## Hard stop conditions

- Any backup/restore verification missing.
- Any unknown FK, policy, trigger, function grant, auth reference or storage object mapping.
- Any non-zero count of unresolved category/product/store/order mappings.
- Any attempt to apply the old baseline migration or replay the eight-category plain INSERT seed block.
- Any change that weakens existing RLS, changes admin authority, makes the product bucket private/public unexpectedly, or replaces guest checkout without a signed-off customer-auth contract.
- Any production environment change before the schema is ready.

No live schema, data, Storage policy, Vercel environment variable, or Production deployment was changed while preparing this matrix.


## Expanded read-only preflight coverage — 2026-11-19

The inventory script now additionally reports effective table privileges for `anon`, `authenticated`, and `service_role`; sequence USAGE privileges; configured default ACLs; and catalog-tracked dependencies on the legacy SECURITY DEFINER helpers (`is_admin`, `owns_store`, `lookup_order`, `place_marketplace_order`, `sync_seller_role`). These checks are read-only and are intended to prevent accidental privilege widening or breaking legacy policy dependencies during the later additive migration.


## Exact RPC signature preflight — 2026-11-19

The target contract diff now resolves the four application RPCs by their full PostgreSQL identity signatures, not just function names. It reports missing exact signatures, return-type mismatches, SECURITY DEFINER mode, function settings (including any fixed search path), and effective anon/authenticated EXECUTE privileges. This is a read-only diagnostic: privilege results require policy-aware review and are not automatically treated as pass/fail because the intended grants differ by RPC. A same-name overload no longer counts as proof that the app's call will resolve safely.


## RPC signature reconciliation correction — 2026-11-19

The required RPC identity signatures above were checked against both the generated TypeScript function argument definitions and the SQL function declarations. In particular, `has_role` takes the enum role first and user UUID second; `place_order` takes the JSONB items first, followed by recipient, phone, area, address, request UUID, optional note and save-address flag. These are PostgreSQL identity argument types, not TypeScript parameter names. The exact-signature preflight uses the same ordering. This correction supersedes the earlier reversed `has_role` order and any abbreviated checkout signature in older notes.
