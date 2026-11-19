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

## Required function inventory

The current server functions call these database functions by exact name:
- `has_role(uuid, app_role)` (admin checks and role checks)
- `place_order(jsonb,text,text,text,text,uuid,text,boolean)` (authenticated, idempotent COD checkout)
- `cancel_order_item(uuid)` (atomic stock restoration and cancellation)
- `review_seller_application(uuid,boolean,text)` (one-time admin review and approval)

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
