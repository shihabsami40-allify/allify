# ALLIFY legacy-to-target column mapping

Status: review specification only — **not executable SQL**  
Reviewed: 2026-11-20  
Authoritative Supabase project: `onqadpqdontbdvecnvby`

This document translates the live legacy schema into the current application's database contract. It is a mapping specification, not permission to change the database. Keep legacy columns and objects until a restored-clone rehearsal and an explicit cutover approval.

## Live starting point

- Existing tables: `profiles`, `categories`, `stores`, `products`, `orders`, `order_items`.
- Existing enum types: `app_role(buyer,seller,admin)`, `approval_state(pending,approved,rejected)`, `order_state(pending,confirmed,processing,shipped,delivered,cancelled)`.
- Current app contract additionally expects `user_roles`, `delivery_areas`, `seller_applications`, `seller_stores`, `product_images`, `carts`, `cart_items`, and `addresses`.
- Live legacy profile/store/product/order/item tables are empty; the six existing category rows are the only non-empty application data. Their UUIDs and slugs must be preserved.
- The public `product-images` bucket exists already (5 MiB; JPEG/PNG/WebP; currently zero objects). Never recreate it as part of this mapping.

## Existing tables

| Live table / column | Target application field | Mapping and compatibility note |
|---|---|---|
| `profiles.id` | `profiles.id` | Preserve UUID and Auth FK |
| `profiles.full_name` | `profiles.full_name` | Keep; enforce current app length only after checking existing values |
| `profiles.role` (`app_role`) | `user_roles.user_id, user_roles.role` | Backfill roles explicitly: legacy `buyer → customer`, `seller → seller`, `admin → admin`; keep legacy role column/trigger during transition |
| missing `profiles.phone` | `profiles.phone` | Add nullable first; validate Bangladesh phone format on new writes, not by assuming old data |
| `categories.id` | `categories.id` | Preserve all six UUIDs |
| `categories.slug` | `categories.slug` | Preserve all six slugs, including `lifestyle`; do not replace with seed rows |
| `categories.name` | `categories.name_bn`, `categories.name_en` | Translate/normalize each existing row by explicit slug-based mapping; retain `name` until cutover |
| missing category `icon`, `sort_order` | same | Add with reviewed values; do not infer ordering from UUID |
| `stores.id` | `seller_stores.id` | Preserve IDs if mirroring; maintain an explicit legacy-store ↔ target-store mapping |
| `stores.owner_id` | `seller_stores.owner_id` | Preserve owner UUID; audit duplicate owners before target unique index |
| `stores.name` | `seller_stores.name` | Direct mapping after length validation |
| `stores.phone,address,bio` | `seller_stores.phone,address,description` | Direct mapping after validation |
| `stores.status: approval_state` | `seller_stores.status: store_status` | `approved → active`, `pending → pending`; rejected/suspended requires explicit policy decision and must not be silently treated as active |
| missing store `slug,name_en,area,logo_url,banner_url,is_demo,rating` | same | Generate/review unique slugs; do not invent seller area or branding; set demo/rating defaults only after reviewing target behavior |
| `products.id,store_id` | same | Preserve IDs; store FK strategy must account for legacy `stores` and new `seller_stores` together |
| `products.name` | `products.title_bn` | Use as the initial display-title candidate; do not fabricate an English title |
| `products.description,price,stock` | same | Direct mapping after validation of price > 0 and stock >= 0 |
| `products.category` (text) | `products.category_id` | Map only exact reviewed category slug/name matches; report unmatched and ambiguous values for manual review |
| `products.image_url` | `product_images.url` / `order_items.image_url` | Preserve source URL as a candidate; verify object existence in the existing bucket before treating it as a Storage object |
| `products.status: approval_state` | `products.status: product_status` | Candidate mapping: approved→active, pending→draft, rejected→hidden; replace dependent RLS predicates/triggers before changing type |
| missing product `slug,title_en,compare_price,sold_count,rating,category_id` | same | Generate unique slug; leave unknown English title/compare price unset; default counters/ratings only after schema review |
| `orders.order_number` | `orders.order_no` | Preserve order identifier exactly; keep legacy column through rollback window |
| `orders.customer_name` | `orders.recipient` | Direct snapshot mapping |
| `orders.customer_phone` | `orders.phone` | Direct snapshot mapping; never include in diagnostic output |
| `orders.delivery_address` | `orders.address_line` | Direct snapshot mapping; never include in diagnostic output |
| `orders.total_amount` | `orders.total` | Preserve total; derive subtotal as total minus delivery fee only after reconciliation |
| `orders.delivery_fee` | same | Preserve; validate non-negative |
| `orders.customer_id,area,payment_method,status,created_at` | same | Preserve IDs/values/timestamps; status type needs deliberate mapping and dependent function/policy review |
| missing order `subtotal,note,is_demo,checkout_request_id` | same | Historical subtotal can be derived only if header/item reconciliation passes; do not fabricate request IDs for old orders; legacy orders should not be marked demo |
| `order_items.product_name` | `order_items.title` | Preserve historical item title snapshot |
| `order_items.image_url` | same | Add nullable snapshot field; do not depend on current product image for historical orders |
| `order_items.order_id,product_id,store_id,quantity,unit_price,status,created_at` | same | Preserve identifiers, quantity, price and timestamps; validate every relationship before tightening FKs |
| `order_items.status: order_state` | `order_items.status: order_status` | Preserve the six lifecycle labels; replace transition trigger and policies in a reviewed sequence |

## New target tables

These have no same-name legacy table and must be created additively with explicit RLS, grants, indexes and constraints before application access is enabled.

| Target table | Initial data strategy | Critical guard |
|---|---|---|
| `user_roles` | Backfill from audited `profiles.role`; add customer role value without deleting legacy `buyer` | Role writes must be admin/service-controlled; users can read only their own roles (or admin) |
| `delivery_areas` | Seed only an owner-reviewed Chattogram delivery-area and fee list | Public read; admin-only changes; checkout must reject inactive/unknown areas |
| `seller_applications` | Start empty; new applications are authenticated | Applicant can insert/read own; only admin can review |
| `seller_stores` | Mirror legacy stores by preserved UUID where present; otherwise new store IDs | One approved active store per owner if that remains the business rule; keep legacy ownership helper compatible |
| `product_images` | Backfill only verified image URLs/objects; new objects use owner/store-scoped paths | Preserve existing bucket; enforce owner/store RLS and MIME/size rules |
| `carts, cart_items` | Start empty | Authenticated owner-only access; active product/store and stock validation at checkout |
| `addresses` | Start empty; no historical address book inferred from order snapshots | Authenticated owner-only access; validate phone/area/address |

## Enum and routine migration notes

1. Existing `app_role` has `buyer,seller,admin`; target needs `customer,seller,admin`. The additive path must preserve `buyer` while adding `customer` in a separately committed enum step before any transaction uses the new label. Never drop/rename `buyer` while legacy triggers or profile rows depend on it.
2. Keep `approval_state` and `order_state` while legacy tables, triggers, policies and RPCs still use them. Create target enum types or convert columns only after replacing all dependent policies/triggers and testing their rollback.
3. Current app order lifecycle includes `processing`; ensure target `order_status` includes all six labels before enabling order transitions.
4. Keep `is_admin()`, `owns_store(uuid)`, `lookup_order(text,text)`, and `place_marketplace_order(...)` until all dependent legacy policies and guest workflows have tested replacements. They are externally executable today.
5. Existing `handle_new_user()` and `sync_seller_role()` write legacy `profiles.role`; replace or bridge them only after target role provisioning is tested. Existing `protect_moderation_fields()` and `rls_auto_enable()` also remain part of the dependency graph.
6. `products.store_id` currently references legacy `stores`. A new `seller_stores` table alone is not enough: choose and rehearse a mirrored-ID/bridge strategy or a fully migrated FK/policy strategy before allowing new product inserts.
7. The target `place_order` and other RPCs must be installed with the exact signatures recorded in `supabase/preflight/003_target_contract_diff.sql`, fixed search_path, correct return types and least-privilege EXECUTE grants.

## Required validation before cutover

- Run preflights 001–004 on a fresh backup-restored isolated clone.
- Require exact category UUID/slug preservation.
- Require zero unresolved category mappings, duplicate store-owner conflicts, slug collisions, invalid price/stock values, broken FK links and order subtotal mismatches.
- Verify every new/altered table has RLS and explicit grants; test both allowed and denied cases as anon, authenticated owner, another user and admin.
- Verify trigger/RPC dependencies, legacy guest order lookup/checkout behavior, status transitions, idempotent checkout and cancellation stock restoration.
- Only then stage Preview against the authoritative project with explicit authorization. Production URL/environment cutover and promotion require separate explicit approval.
