# ALLIFY recovery progress ledger

Last reconciled: 2026-11-19  
Repository: `shihabsami40-allify/allify`  
Branch: `allify-recovery-2026-11-17`  
Latest implementation commit: `aa9a15b6308bb511f2ff13217445332148a4f849`  
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


## RPC signature correction — 2026-11-19

- Cross-checked the newly added exact RPC signatures against `src/integrations/supabase/types.ts` and corrected argument order/types for `has_role(uuid, public.app_role)` and `place_order(text, text, jsonb, text, text, text, text, boolean)`.
- `cancel_order_item(uuid)` and `review_seller_application(uuid, boolean, text)` remain aligned with generated function Args.
- Commits: `1436ae9` (preflight SQL), `169cb46` (test assertions).
- The prior exact-signature commit is superseded for these two RPC signatures; do not rely on its initial signature values.
- CI for corrected commits is pending. No live database or deployment changes.


## Migration planning and RPC signature verification — 2026-11-19

- Verified both CI workflows for commit `169cb46` completed successfully.
- Cross-checked target RPC identity signatures against the actual SQL declarations and generated Supabase types. Corrected `has_role(uuid, public.app_role)` and `place_order(jsonb, text, text, text, text, uuid, text, boolean)`; the latter follows the declared positional argument order in migration `0009`.
- Added `docs/LEGACY_TO_TARGET_MIGRATION_PLAN.md`: staged additive-only design, explicit legacy-to-target mappings, validation gates, rollback conditions and production safety boundaries. It is a design document, not executable SQL.
- Commits: `4b91add` (RPC signature), `f2f2b99` (test), `8f3c503` (migration plan).
- No production database, Storage, Vercel environment variables, or Production deployment were changed.


## Live dependency deep-dive — 2026-11-19

- Rechecked authoritative project status: `ACTIVE_HEALTHY`, PostgreSQL 17.11.
- Read-only inspection confirmed the exact legacy trigger functions and dependencies: `handle_new_user()` inserts legacy role `buyer`; `sync_seller_role()` updates legacy roles on store INSERT/UPDATE; `protect_moderation_fields()` guards store/product moderation; and `rls_auto_enable()` is an event trigger for new public tables.
- Captured the existing RLS policy predicates on categories, profiles, stores, products, orders and order_items. The legacy policies call `is_admin()` and `owns_store(uuid)`; the order_items customer-read policy checks its parent order. Preserve these dependencies until replacement policies are proven.
- Re-ran Supabase Advisors: Security reports 4 SECURITY DEFINER routines callable by anon and authenticated; Performance reports 7 RLS init-plan findings, 1 multiple-permissive-policy finding on categories, and 7 unused-index informational findings; Health reports no findings.
- Added the fresh observations and migration sequencing implications to `docs/LEGACY_TO_TARGET_MIGRATION_PLAN.md`.
- CI for commit `8406013`: both checks and build passed. CI for current commit `b19cb35` is pending verification.
- All live inspection was read-only. No production schema, data, policies, functions, Storage, Vercel variables, or deployments were changed.


## RPC contract documentation reconciliation — 2026-11-19

- Corrected the application-to-database dependency matrix to match generated Supabase TypeScript and SQL declarations: `has_role(uuid, public.app_role)`; `place_order(jsonb, text, text, text, text, uuid, text, boolean)`; `cancel_order_item(uuid)`; `review_seller_application(uuid, boolean, text)`.
- The earlier matrix had the `has_role` argument order reversed. It is now explicitly marked superseded and the checkout argument ordering is documented in full.
- No runtime application code or live database objects changed in this documentation correction.


## Catalog search and sorting coverage — 2026-11-19

- Extracted browse-page catalog filtering and sorting into `filterCatalogProducts` in `src/lib/catalog-query.ts`; the route now uses the shared helper rather than embedding the filter pipeline in JSX.
- Search now trims surrounding whitespace and uses locale-aware case-insensitive matching across Bangla/English product names and seller store names.
- Added focused tests for search normalization, category slug matching, in-stock filtering, all four sort modes, unknown categories, and source-array immutability.
- Updated the existing browse contract assertion to follow the extracted helper rather than requiring the old inline implementation.
- CI for commit `936dd6e`: ALLIFY checks and ALLIFY build check both passed.
- This is a new catalog behavior/testability improvement; no completed checkout, seller, admin, or auth feature was repeated. No live database or deployment settings changed.


## Role RPC signature preflight correction — 2026-11-19

- A final cross-check found that the exact-signature preflight listed `has_role(public.app_role, uuid)`, while the baseline SQL actually declares `has_role(_user_id uuid, _role public.app_role)` and all positional SQL call sites pass UUID first. The preflight expected signature is now corrected to `public.has_role(uuid, public.app_role)`; the application RPC continues to send named arguments, so its JSON key names remain `_role` and `_user_id`.
- Added regression assertions tying the preflight identity signature to the baseline SQL declaration, plus checks for the checkout, cancellation and seller-review RPC signatures.
- Updated the dependency matrix and migration plan to retain the corrected exact identity signature. This corrects the preflight diagnostic only; no live function was changed.
- CI for the correction commits: ALLIFY checks and ALLIFY build check both passed (latest recorded commit `3a58d85`).
- No live Supabase schema/data, Storage, Vercel environment, or deployment was changed.


## Read-only migration reconciliation preflight — 2026-11-20

- Added `supabase/preflight/004_migration_readiness.sql` as a separate read-only report for the legacy-to-target migration. It checks profile-role mapping counts, duplicate store ownership, candidate slug collisions, product-category mapping ambiguity, invalid inventory values, legacy store/product statuses, order financial consistency, item/header subtotal reconciliation, broken historical relationships, payment/status distributions, and the existing product-images bucket configuration/object count.
- Output is aggregate-only: no customer names, phone numbers, addresses, order numbers, auth identifiers, or Storage object paths are selected.
- Added static tests to enforce read-only behavior and assert that the critical mapping/reconciliation checks remain present.
- This is an additional diagnostic only; it is not a migration and does not modify any database. The report has not yet been run against the authoritative project as part of this change.


## Migration readiness preflight executed read-only — 2026-11-20

- Confirmed authoritative Supabase project remains `ACTIVE_HEALTHY` on PostgreSQL 17.11.
- Executed all 11 SELECT-only sections of `supabase/preflight/004_migration_readiness.sql` against the authoritative project. All sections completed without SQL errors.
- Current legacy data is still effectively empty: no profile role rows, stores, products, orders, or order items. Therefore the role/store/product/order reconciliation queries returned no rows or zero exception counts; no historical customer/order data currently needs conversion.
- Store-owner duplicate groups: 0. Store slug candidate failures/collisions: 0. Product value exceptions: 0. Order financial/profile exceptions: 0. Order-item relationship/quantity/price exceptions: 0.
- Existing `product-images` bucket remains public, 5 MiB limit, JPEG/PNG/WebP allowlist, and currently has 0 objects. It was inspected only; not changed.
- Previously confirmed six category rows and their UUIDs remain the only non-empty legacy application data; preserve those rows and IDs. This report intentionally does not output category UUIDs or customer data.
- CI for migration readiness SQL commit `eb1e627` and test commit `1b44334`: ALLIFY checks and ALLIFY build check both passed.
- All live queries were SELECT-only. No live schema, data, Storage, Vercel variables, or deployments were modified.


## Field-level legacy mapping specification — 2026-11-20

- Added `docs/LEGACY_COLUMN_MAPPING.md` to document each existing legacy column's target field, explicit status/role mapping candidates, missing target entities, and compatibility risks.
- The mapping records the critical `products.store_id → stores.id` FK dependency: introducing `seller_stores` alone is insufficient; the migration must rehearse either a preserved-ID bridge or a fully migrated FK/policy strategy.
- Documented that legacy `app_role.buyer` must remain while adding target `customer`, and that existing moderation/order enums, triggers, RLS policies, and externally callable legacy RPCs must not be retired incidentally.
- Linked the field-level mapping from the migration plan. Documentation only; no database or deployment changes.


## Legacy mapping and target-contract reports rerun — 2026-11-20

- Executed all 10 SELECT-only sections of `supabase/preflight/002_legacy_data_mapping_report.sql`; all completed without SQL errors.
- Reconfirmed the six active category slugs and stable UUIDs: `bags`, `beauty`, `clothing`, `lifestyle`, `shoes`, `watches`. No profiles, stores, products, orders, order items, or Storage objects are present. No product-category or status distribution exists yet because the product/store/order tables are empty.
- Executed all 5 SELECT-only sections of `supabase/preflight/003_target_contract_diff.sql`; all completed without SQL errors. As expected, target-only tables/columns and four app RPCs are currently missing. Live enum labels are `app_role(buyer,seller,admin)`, `approval_state(pending,approved,rejected)`, and `order_state(pending,confirmed,processing,shipped,delivered,cancelled)`; the only target enum label mismatch is the required additive `customer` role value, while the target enum types and RPCs still need staged installation.
- The diff confirms legacy `products.status` and `stores.status` use `approval_state`, and legacy order/order-item status uses `order_state`. These types cannot be blindly renamed or cast while legacy triggers and RLS policies depend on them.
- All queries were read-only. No production database, Storage, environment variables or deployments were changed.


## Fresh Supabase advisor and Vercel state — 2026-11-20

- Re-ran Supabase security, performance, and health advisors on the authoritative project. Health: no findings. Security: 4 legacy SECURITY DEFINER RPCs callable by anon/authenticated (`is_admin`, `owns_store`, guest `lookup_order`, guest `place_marketplace_order`). Performance: 7 RLS init-plan warnings, 1 overlapping categories SELECT policy warning, 7 unused-index notices. No blanket revokes or index drops were applied; the functions are part of live policy and guest workflow dependencies, and the tables are currently empty.
- Added `docs/LEGACY_RPC_SECURITY_REMEDIATION.md` with a staged, dependency-aware plan: replace helper functions and policies on a clone, test all access roles, replace or deliberately retire guest lookup/checkout, then revoke legacy EXECUTE only after client migration. It also documents RLS performance follow-up and explicit Data API grants for new tables.
- Vercel project `allify-chattogram` remains connected to the repository. Latest preview deployment for commit `085af19` is READY. Production deployment remains on `main` commit `05a0ef4`; no promotion or Production change was made.
- Vercel environment inventory confirms the Supabase URL/publishable-key variables exist across Production, Preview and Development. Their values were not decrypted or changed in this check. The previously documented Supabase URL mismatch remains a cutover blocker.
- Supabase organization lookup shows the available organization is `Allify` on the Free plan. A separate test project is not created yet; the project-creation tool requires the user to select the organization explicitly. The previously quoted project cost is $0/month.
- Supabase changelog reviewed: the October 30, 2026 Data API exposure change means new public tables must have explicit grants/exposure configuration; the November 4 CLI v3 change makes local the default target. Future CLI instructions must specify the target explicitly. No production DDL/DML, environment, or deployment changes were made.


## Isolated test project and full migration replay — 2026-11-20

- With the user's approval, created Supabase project `allify-test` in the Allify organization, region `ap-south-1`, project ref `ltwobqpgxmkeylmpkogq`. Supabase quoted and confirmed `$0/month`; project reached `ACTIVE_HEALTHY`.
- This is a fresh target-schema test project, not a restored clone of the authoritative legacy database. No Production records or secrets were copied.
- Replayed all 17 journaled Drizzle migrations `0000`–`0016` successfully. The test project now has 13 application tables with RLS enabled, the `product-images` bucket, and seeded demo data (8 categories, 27 delivery areas, 6 demo stores, 24 demo products, 6 demo orders/items).
- The first replay attempt exposed a forward dependency: migration `0002` attempted to revoke `sync_order_status_from_items()` before migration `0003` creates it. Removed that premature revoke from `0002`; migration `0003` already revokes the trigger function after creating it. Replayed `0002` onward successfully on the test project.
- Added a regression test to ensure migration `0002` does not reference the function introduced in `0003`.
- Added branch-scoped Vercel Preview environment variables for `allify-recovery-2026-11-17` only, pointing all four Supabase URL/publishable-key variables to the isolated test project. Existing Production and Development environment variables were not changed.
- Initial test-project advisors report remaining hardening work: four anon-callable SECURITY DEFINER helpers, seven authenticated-callable SECURITY DEFINER functions (including intended authenticated RPCs), 23 RLS init-plan warnings, and three unindexed foreign keys. These findings are recorded for review; no blanket revokes or speculative index changes were made.
- CI/build for the latest commits and a fresh Preview deployment using the branch-scoped variables remain to be verified. Real sign-in, seller application/review, image upload, checkout, order transition/cancellation and customer-history workflows remain untested pending a dedicated test account/admin setup.
- No changes were made to the authoritative Production database, Production environment variables, Production deployment, or custom domains.


## Test workflow verification — 2026-11-20

- Ran transaction-scoped SQL workflow tests on `allify-test`; all test rows were rolled back. Verified public category reads, authenticated seller-application submission, authenticated COD checkout, customer order privacy (owner sees the order; unrelated user sees none), checkout idempotency (same request UUID returns one order), and protected cancellation restores stock exactly once and marks the item cancelled.
- The replayed migrations and these SQL checks validate the clean target schema only. They do not substitute for a restored legacy-clone rehearsal, browser-based sign-in, or actual Storage upload.
- CI status for latest recorded branch commit `7d83ea07df37344b0932c141dba4b129780f82db` is successful; Vercel Preview deployment `dpl_5vcCZy1ipYTawbvneke56ZddfjTe` is READY with branch-scoped test-project environment variables. No runtime requests had been observed at the time of inspection.
