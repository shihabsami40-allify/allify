# Authoritative Supabase Schema Reconciliation

**Project:** `onqadpqdontbdvecnvby` (Allify, ap-south-1)  
**Repository branch:** `allify-recovery-2026-11-17`  
**Inspection date:** 2026-11-19  
**Purpose:** Record verified differences before any live schema migration. This document is not a migration and must not be executed as SQL.

## Safety status

- Supabase project status was verified as ACTIVE_HEALTHY.
- Inspection was read-only. No SQL writes, schema changes, data changes, storage changes, or environment-variable changes were made.
- Six public tables exist: `profiles`, `categories`, `stores`, `products`, `orders`, `order_items`.
- Exact row counts at inspection: `categories=6`; `profiles=0`, `stores=0`, `products=0`, `orders=0`, and `order_items=0`.
- Read-only aggregate inspection also returned `auth.users=0`, `storage.objects=0`, and one existing Storage bucket. This is an aggregate count only; no user records or object contents were read.
- Supabase migration history endpoint returned an empty list.
- The six category records are the only current application rows found in these public tables. Their IDs and names were read to plan a lossless mapping; preserve the existing UUIDs.

## Live schema observed

| Table | Current columns |
|---|---|
| profiles | id, full_name, role, created_at |
| categories | id, name, slug, active, created_at |
| stores | id, owner_id, name, phone, address, bio, status, created_at |
| products | id, store_id, name, description, category, price, stock, image_url, status, created_at, updated_at |
| orders | id, order_number, customer_id, customer_name, customer_phone, delivery_address, area, total_amount, delivery_fee, payment_method, status, created_at |
| order_items | id, order_id, store_id, product_id, product_name, quantity, unit_price, status, created_at |

Live enum types:
- `app_role`: buyer, seller, admin
- `approval_state`: pending, approved, rejected
- `order_state`: pending, confirmed, processing, shipped, delivered, cancelled

All six tables have RLS enabled. Existing RLS policies include public reads for approved categories/products/stores, owner-scoped seller operations, and customer/admin order reads.

Storage has a public `product-images` bucket with 5 MiB maximum object size and JPEG/PNG/WebP MIME types. The bucket currently contains zero objects.

### Existing category records to preserve

| Existing UUID | Slug | Bengali name | Target English name |
|---|---|---|---|
| `01b580ce-140d-48c7-83c0-e975a8179054` | watches | ঘড়ি | Watches |
| `05fc03e6-9adb-435c-bd03-3fc7b9b10f89` | bags | ব্যাগ | Bags |
| `74cd5fc4-9fea-4ecf-8030-98aea2efb229` | lifestyle | লাইফস্টাইল | Lifestyle |
| `a7fc4aa8-6dd7-4d7a-9342-e278890b181e` | clothing | পোশাক | Clothing |
| `a909fd27-f3ae-4cac-9f30-cd3fd81a74e7` | beauty | বিউটি | Beauty |
| `b28d2bfd-93b7-4048-94ad-64eefb71d498` | shoes | জুতা | Shoes |

The target `categories` table should retain these UUIDs and slugs while adding the bilingual names, icon, and sort order fields. Do not delete and recreate these records.

## Application schema expected by the recovery branch

The generated Supabase types and baseline migration expect a materially different schema, including:
- New tables such as `user_roles`, `delivery_areas`, `seller_applications`, `seller_stores`, `product_images`, `carts`, `cart_items`, and `addresses`.
- Renamed/restructured columns: category `name` -> `name_bn`/ `name_en`; product `name` -> `title_bn`/ `title_en`; order `order_number` -> `order_no`, customer/delivery fields split into `recipient`, `phone`, `address_line`; order item `product_name` -> `title` and adds `image_url`.
- New status enums `store_status`, `product_status`, `order_status`, and `application_status`, whereas live tables use `approval_state` and `order_state`.
- Baseline migration 0000 attempts to create names that already exist, including `profiles`, `categories`, `products`, `orders`, and `order_items`. It is therefore not safe to apply to this project as-is.
- Migration 0001 assumes new order columns such as `phone`, `recipient`, and `address_line`; migration 0003 assumes `order_items.title` and `image_url`. These migrations are also not safe to run against the current schema without a preceding reconciliation.

## Existing database security observations

- All six existing public tables have RLS enabled.
- Four SECURITY DEFINER helpers/RPCs are externally executable under current grants: `is_admin()`, `owns_store(uuid)`, `lookup_order(text,text)`, and `place_marketplace_order(...)`. The two order RPCs are explicitly granted to anon/authenticated; helper functions have default PUBLIC execute.
- `lookup_order` checks both order number and phone and returns a limited order summary.
- `place_marketplace_order` is the current guest-capable order RPC; it locks product rows, checks approval/stock/store status, writes order items, and decrements stock in a transaction. Its input validation and abuse controls need a separate review before changing grants or behavior.
- Existing moderation and seller-role synchronization triggers are present.
- Security Advisor previously reported externally executable SECURITY DEFINER functions and RLS init-plan performance warnings. Do not blindly revoke helper execution: policies depend on `is_admin()` and `owns_store()`, including public/anon read policies.

## Recommended reconciliation sequence

1. **Preserve and inventory:** before any write, create a verified database backup/export and separately inventory Auth references, Storage objects, grants, constraints, indexes, triggers, and policies. Keep the six existing category records.
2. **Build an additive migration plan:** avoid running baseline 0000. Prefer carefully staged ALTER/CREATE operations with explicit compatibility mapping; do not drop or rename live tables until the app has been migrated and tested.
3. **Map legacy to target fields:** categories `name` needs a reviewed Bengali/English mapping; stores -> seller_stores requires status/owner mapping; products.category text -> category_id needs a deterministic mapping; orders/order_items need explicit column and enum conversion rules.
4. **Resolve enum differences deliberately:** preserve existing values, define handling for `processing`, and only convert after constraints/defaults/functions are audited.
5. **Add missing target tables:** create seller applications, delivery areas, user roles, product images, carts, cart items, addresses, and any other missing target tables with RLS and least-privilege grants.
6. **Reconcile functions and triggers:** replace old order RPC/trigger behavior only after matching application calls and proving stock, order lifecycle, and idempotency behavior.
7. **Update generated types from the final live schema** and run typecheck, lint, unit tests, and Preview functional tests.
8. **Switch Vercel Supabase URLs/keys only after schema readiness.** Production environment changes require explicit owner authorization. Do not expose or log secret keys.

## Current repository/config status

The recovery branch's `supabase/config.toml` was corrected to `project_id = "onqadpqdontbdvecnvby"` in commit `3d3db2af313ad84b43d22177e3c90c83b36f6dc7`. This is a repository config correction only; Vercel's configured Supabase URL variables were previously observed pointing at the old project and have not been changed.

## Do not do

- Do not apply `0000_migration.sql` or migrations 0001–0016 blindly.
- Do not drop/recreate tables, overwrite category data, or change enum types without a verified backup and tested forward migration.
- Do not change production Vercel environment variables or deploy production without explicit authorization.
- Do not disable Vercel SSO or expose secrets.


## Additional read-only audit: policy, trigger, and enum compatibility

A second read-only catalog inspection recorded the current policy and trigger dependencies. This is important because renaming or replacing tables can silently break security behavior even when column names appear compatible.

### Current policy/trigger inventory

- `categories`: public SELECT is limited to `active = true` or admin; admin has ALL access.
- `stores`: public SELECT is limited to approved stores, owner, or admin; owner INSERT requires pending status; owner/admin UPDATE is allowed.
- `products`: public SELECT is limited to approved products, owner, or admin; owner INSERT requires pending status; owner/admin UPDATE and owner/admin DELETE policies exist.
- `profiles`: authenticated users can read self/admin and update self/admin.
- `orders`: customer/admin SELECT and admin UPDATE.
- `order_items`: related customer, owning seller, or admin SELECT; owner/admin UPDATE.
- Existing triggers: `protect_product_status` (products UPDATE), `protect_store_status` (stores UPDATE), and `store_role_sync` (stores INSERT/UPDATE). The trigger functions are SECURITY DEFINER.
- `order_items` foreign keys point to `orders`, `products`, and `stores`. Any table rename or replacement must preserve and re-check these relationships.
- Current order payment constraint permits only `cod`.

### Explicit data-mapping decisions required before migration

| Legacy source | Target shape | Safe proposed treatment |
|---|---|---|
| `profiles.role` (`buyer/seller/admin`) | `user_roles.role` (`customer/seller/admin`) | Backfill buyer -> customer, seller -> seller, admin -> admin. Keep the legacy column until validation. |
| `app_role` enum | target role enum also named `app_role` | Existing type cannot be recreated. Add `customer` as a new enum label if required; retain `buyer` for compatibility until no dependency remains. |
| `categories.name` | `name_bn/name_en` | Preserve UUID and slug; use the six reviewed translations above. Add `icon` and `sort_order` with reviewed defaults. |
| `stores` | `seller_stores` | Preserve IDs and owner IDs. Map `bio` -> `description`; add stable unique slug and missing storefront fields. Do not assume the legacy status enum is interchangeable. |
| Store `approval_state` | `store_status` | `pending -> pending`, `approved -> active`; map `rejected` to `suspended` only after product/business rules are approved. |
| `products.name` | `title_bn/title_en` | Preserve ID/store ID; copy name to title_bn. Add title_en and slug without replacing the original until validated. |
| `products.category` (text) | `category_id` (UUID) | Match by category slug/name using an explicit mapping table; unmatched values must be reported, not silently assigned. |
| Product `approval_state` | `product_status` | Proposed: pending -> draft, approved -> active, rejected -> hidden. Confirm moderation semantics before applying. |
| `products.image_url` | `product_images.url` | Preserve the URL as the first image row only after validating it belongs to the expected bucket/path; do not copy untrusted external URLs into managed storage metadata. |
| `orders.order_number/customer_name/customer_phone/delivery_address/total_amount` | `order_no/recipient/phone/address_line/total` | Copy values without changing order identity. Derive subtotal as total_amount - delivery_fee only after checking nonnegative values. Preserve order number text exactly. |
| `order_items.product_name` | `title` | Copy as order-time product title snapshot; image_url can be copied from product only when the source relationship exists and is verified. |
| `order_state.processing` | target `order_status` | Target enum currently omits processing. Do not coerce to confirmed/shipped. Either add a compatible processing state and update UI transitions/types, or preserve legacy status in a dedicated mapping field before conversion. |

### Important sequencing notes

1. Preserve all legacy enum types and columns while adding target structures. PostgreSQL enum labels cannot simply be removed; avoid in-place casts until every dependent default, policy, trigger, and function has been inventoried.
2. Keep legacy tables/columns available through a dual-read/validation window. A rename of `stores` or `products` is not the first migration step.
3. Before adding new RLS policies, inventory existing policy expressions and trigger functions; recreate least-privilege policies for every new table, then test both anon and authenticated access.
4. Validate foreign keys, unique indexes, defaults, and grants after every stage. Do not remove old policies/functions until the new app path has passed functional tests.
5. The observed zero row counts reduce current copy volume but do not justify destructive shortcuts; future data may be added before migration.
