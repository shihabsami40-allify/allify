# ALLIFY recovery progress ledger

Last reconciled: 2026-11-19  
Repository: `shihabsami40-allify/allify`  
Branch: `allify-recovery-2026-11-17`  
Latest implementation commit: `3b4987ae78e97f47cc55926a796004a2aaa12de1`  
Latest Preview: https://allify-chattogram-git-allify-recovery-2026-11-17-allify.vercel.app

This ledger exists to prevent completed work from being repeated. A passing build or static source-contract test is not proof that a live marketplace workflow works.

## Verified code work already present — do not redo

| Area | Existing implementation / verification | Evidence |
|---|---|---|
| Auth initialization | Prevents delayed `getUser()` from overwriting newer auth events | `market-provider.tsx`, `market-provider-auth-race.test.ts` |
| Password recovery | Handles recovery hash and PASSWORD_RECOVERY event; requires confirmed recovery session | commits `cac0f354`, `8e81e9b3` |
| Account privacy | Profile, role, store, application and customer-order queries scoped to authenticated user | `account-query-privacy.test.ts` |
| Customer order history | Authenticated customer-only orders and associated items; retry/error handling | `customer-order-history-privacy.test.ts` |
| Seller management | Product writes scoped to active owner store; seller application validation; order ownership and transition checks | `seller-management-safety.test.ts` |
| Seller image storage | Owner/store path validation, active non-demo store checks, JPEG/PNG/WebP and 5 MiB constraints | migrations `0006`, `0007`, `0014` |
| Seller applications | DB-level serialization prevents concurrent duplicate pending applications | migration `0012` |
| Application review | Atomic admin review; prevents duplicate approval/store creation and unauthorized status changes | migration `0013` |
| Checkout | Authenticated COD form, active delivery-area fee, BD phone validation, request UUID idempotency, cart cleared only after confirmed order; request UUID is stored under a SHA-256 fingerprint rather than a key containing customer name/phone/address, and existing legacy retry UUIDs are migrated before old PII-bearing keys are removed | `checkout-flow-safety.test.ts`, `checkout-idempotency.test.ts`, `checkout-storage.test.ts`, migration `0009` |
| Order cancellation | Guarded RPC restores stock once and blocks demo/late-state cancellation | migration `0016`; contract test added in commit `82f3abc6` |
| Seller management queries | Store ownership scope, order-item inner join, demo-order exclusion, fail-closed query errors | `management-query-authorization.test.ts`; commits `fc192321`, `cdad7fcd` |
| Admin/seller dashboard discovery | Admin order/product search and status filters; seller product search/status/stock filters and seller order search/status filters now include `processing` | commits `8ca2675`, `ee67f61`, `8cae05a`, `475597b`, `97946db`, `1e885f8`; latest CI checks passed |
| Admin dashboard | Demo data excluded from real metrics/moderation; admin confirmation; store status write verifies a returned row | `admin-dashboard-safety.test.ts`; commit `c089aded` |
| TanStack validator API | Replaced deprecated `.inputValidator()` with `.validator()` | commit `5f3e23b3` |
| Supabase project config | Repository `supabase/config.toml` points to authoritative project ref | commit `3d3db2af` |
| Read-only schema preflight | Inventory, legacy mapping report, app-contract diff scripts exist | `supabase/preflight/001_*.sql` through `003_*.sql` |

## Deployment state

- Latest commit `d74157dd` has Vercel Preview deployment state READY (verified by deployment ID `dpl_H5Zt67Nj8BjfCrD7qp6GeYLEg8WA`).
- Preview alias: https://allify-chattogram-git-allify-recovery-2026-11-17-allify.vercel.app
- This is a Preview deployment, not Production.
- Deployment success proves build/deploy only; it does not prove database-backed workflows.

## Main remaining blocker — do this next, not more repeated tests

The authoritative Supabase project is `onqadpqdontbdvecnvby` (ap-south-1). Its live schema is still the six-table legacy schema (`profiles`, `categories`, `stores`, `products`, `orders`, `order_items`). The application expects `user_roles`, `delivery_areas`, `seller_applications`, `seller_stores`, `product_images`, cart/address tables, renamed columns and new RPCs.

Existing Drizzle migrations `drizzle/migrations/0000`–`0016` are not safe to apply blindly. The live `app_role` enum and existing SECURITY DEFINER helpers/policies/triggers require compatibility handling. Existing six category UUIDs/slugs must be preserved.

### Exact next execution sequence

1. Obtain and verify a restorable backup/export of the authoritative project; current project is on Supabase Free plan and no verified restorable backup is recorded.
2. Re-run the read-only preflight against the authoritative project and capture current schema, grants, triggers, policies, constraints, category rows and aggregate counts.
3. Draft a separate additive compatibility migration (do not replay baseline `0000` or plain seed inserts). Preserve legacy tables/columns and category UUIDs; add target schema in stages.
4. Validate migration against a disposable clone/local PostgreSQL database, including existing legacy policies/functions and enum values.
5. Only after explicit authorization and verified rollback/restore, apply staged migrations to the authoritative project.
6. Re-run contract diff and security checks; then update generated Supabase types.
7. Only after schema is ready, change Vercel Supabase environment variables from old project ref `htsvvotamlxlkncksssq` to authoritative project `onqadpqdontbdvecnvby`, with explicit owner authorization. Never expose keys.
8. Run real authenticated Preview workflows: sign-in, seller application/review, store/product/image creation, customer checkout, seller order transitions/cancellation, customer history.
9. Promote to Production only after acceptance and explicit authorization.

## Hard safety boundaries

- No live database DDL/data/Storage changes have been made in the recorded work.
- No Vercel environment variables have been changed.
- Do not revoke legacy `is_admin()`/`owns_store(uuid)` function execution before every dependent policy is migrated and tested.
- Do not replace guest RPC behavior until the new authenticated checkout contract is proven end-to-end.
- Do not claim seller registration, checkout, or order lifecycle is live until verified against the real database.


## Latest live smoke checks — 2026-11-19

- Preview alias returned HTTP 200 for `/`, `/browse`, `/sell`, `/stores`, `/auth`, `/cart`, `/checkout`, and `/orders`. This confirms public SSR route responses only; it does not verify browser hydration, sign-in, or mutations.
- The root page renders the Bangla ALLIFY marketplace shell, category navigation, local-store content, and free seller-registration messaging.
- Current live database inventory was rechecked through Supabase table metadata: the six legacy tables remain; `profiles.phone`, `user_roles`, `delivery_areas`, `seller_applications`, `seller_stores`, `product_images`, `carts`, `cart_items`, and `addresses` are still absent. Existing category table has six rows; other five legacy tables report zero rows.
- Security Advisor still reports four externally executable SECURITY DEFINER routines: `is_admin()`, `owns_store(uuid)`, `lookup_order(text,text)`, and guest-capable `place_marketplace_order(...)`. These are not blindly revoked because legacy RLS policies depend on helper functions. Review and migrate grants with their policy replacements.
- Performance Advisor reports seven RLS init-plan warnings and one multiple-permissive-policy warning on categories. These are deferred until the compatibility migration so policy behavior can be corrected and tested together; no production policy was changed.
- The latest commit `d74157dd` has a READY Preview deployment at the branch alias. This is not a Production deployment.


- A fresh read-only enum/category check reconfirmed `app_role = buyer, seller, admin`, `approval_state = pending, approved, rejected`, and `order_state = pending, confirmed, processing, shipped, delivered, cancelled`. All six existing category slugs (`bags`, `beauty`, `clothing`, `lifestyle`, `shoes`, `watches`) remain active with their original UUIDs; preserve them during any additive migration.\n\n## Migration repository integrity check — 2026-11-19\n\n- The migration directory contains 17 journaled migrations (`0000` and `0001`–`0016`) plus an additional `0001_remove_first_admin_claim.sql` file that is not in `_journal.json`. Do not run or rename this orphan file; the journaled `0001_secure_marketplace_controls.sql` is the migration entry.\n- The actual directory is `drizzle/migrations/`, not `supabase/migrations/`.\n\n## Development isolation attempt — 2026-11-19

- The user explicitly approved creating a Supabase Development Branch after the quoted estimate of USD $0.01344/hour.
- Supabase returned `PaymentRequiredException`: Development Branches are supported only on Pro plan or above. The authoritative project is on Free plan; no branch was created and no branch compute charge began.
- The project currently has no Supabase development branches. Do not retry branch creation unless the project plan changes or a separate disposable database is provisioned.
- Continue with repository-side compatibility analysis and local/disposable PostgreSQL rehearsal only. No production schema, data, Storage, or Vercel environment variables were changed.


## Checkout browser-storage privacy hardening — 2026-11-19

- Added `src/lib/checkout-storage.ts` to derive a deterministic SHA-256 key from the authenticated user ID and normalized order payload. Customer name, phone, address and note are no longer embedded in a localStorage key.
- Existing raw-payload keys are read once and their UUID is copied to the hashed key before the legacy key is removed, preserving retry idempotency for an order that was already in progress during the upgrade.
- Added tests for deterministic fingerprints, changed-user/payload separation, absence of personal details in the key, and legacy UUID migration.
- CI for commit `5edaf03`: ALLIFY checks and ALLIFY build check both passed (lint, typecheck, tests and production build).
- No database or deployment configuration was changed by this work.


## Expanded read-only database preflight — 2026-11-19

- Extended `supabase/preflight/001_authoritative_schema_inventory.sql` with effective table privileges for anon/authenticated/service_role, sequence USAGE privileges, default ACLs, and catalog-tracked dependencies on legacy SECURITY DEFINER helpers.
- Documented the additional checks in `docs/APP_DATABASE_DEPENDENCY_MATRIX.md`.
- This is repository-only, read-only preparation. No database, Storage, environment-variable, or deployment changes were made. The required verified backup/restore gate remains open.

- CI for preflight update commit `44dc9e1`: ALLIFY checks and ALLIFY build check both passed (lint, typecheck, tests and production build).


## Generated schema contract preflight completion — 2026-11-19

- Aligned `003_target_contract_diff.sql` with the generated Supabase table types, adding previously unlisted fields for role row identity, delivery-area ordering, seller-application metadata/timestamps, storefront branding/rating/timestamps, product rating/timestamps, cart/address timestamps, and order timestamps.
- Added read-only enum-label comparison for all expected labels in `app_role`, `application_status`, `order_status`, `product_status`, and `store_status`. This detects missing enum types/labels before a migration is attempted.
- Extended `preflight-safety.test.ts` to assert these table and enum contract checks remain present and read-only.
- Updated the database dependency matrix to explain the scope and limits of the generated-schema diff.
- Repository commits: `3f07e4d` (preflight), `68978ba` (tests), `75a53f9` (dependency matrix).
- This is repository-only work. No live Supabase schema/data, Storage, Vercel environment, or Production deployment was changed.
- CI status for these commits is pending verification; do not treat the static test additions as proof of a live database match.


- Follow-up compatibility check: the enum diff now also lists live-only labels requiring review, rather than only reporting missing target labels. This explicitly surfaces the legacy `app_role.buyer` value alongside the app's generated `customer` role contract; no enum values were changed or removed.
- Follow-up commits: `25b59d2` (legacy-only enum reporting), `e27ccc0` (test coverage), `7fa2f6f` (documentation).


## Exact application RPC preflight — 2026-11-19

- Extended `supabase/preflight/003_target_contract_diff.sql` to resolve the exact PostgreSQL signatures for `has_role`, `place_order`, `cancel_order_item`, and `review_seller_application`. Same-name overloads no longer count as a match.
- The report now includes missing exact signatures, return-type match, SECURITY DEFINER mode, function settings/search_path, and effective anon/authenticated EXECUTE privileges for review.
- Added static safety-test assertions and documented the diagnostic scope in `docs/APP_DATABASE_DEPENDENCY_MATRIX.md`.
- Commits: `7ac8089` (SQL), `ee20eb6` (tests), `3b4987a` (docs).
- CI for `ee20eb6`: ALLIFY checks and build check were triggered; results were pending at ledger update time.
- Repository-only, read-only preflight work. No live database, Storage, Vercel environment, or Production deployment was changed.
