# ALLIFY recovery progress ledger

Last reconciled: 2026-11-19  
Repository: `shihabsami40-allify/allify`  
Branch: `allify-recovery-2026-11-17`  
Latest commit: `28e8a1ec0ffda36a48879c988d9fbff3afea9e49`  
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
| Checkout | Authenticated COD form, active delivery-area fee, BD phone validation, request UUID idempotency, cart cleared only after confirmed order | `checkout-flow-safety.test.ts`, migration `0009` |
| Order cancellation | Guarded RPC restores stock once and blocks demo/late-state cancellation | migration `0016`; contract test added in commit `82f3abc6` |
| Seller management queries | Store ownership scope, order-item inner join, demo-order exclusion, fail-closed query errors | `management-query-authorization.test.ts`; commits `fc192321`, `cdad7fcd` |
| Admin dashboard | Demo data excluded from real metrics/moderation; admin confirmation; store status write verifies a returned row | `admin-dashboard-safety.test.ts`; commit `c089aded` |
| TanStack validator API | Replaced deprecated `.inputValidator()` with `.validator()` | commit `5f3e23b3` |
| Supabase project config | Repository `supabase/config.toml` points to authoritative project ref | commit `3d3db2af` |
| Read-only schema preflight | Inventory, legacy mapping report, app-contract diff scripts exist | `supabase/preflight/001_*.sql` through `003_*.sql` |

## Deployment state

- Latest commit `28e8a1ec` has Vercel Preview deployment state READY (verified by deployment ID `dpl_HjhSrZoc31LSyzPJ2WScWPY59A46`).
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
- The latest commit `28e8a1ec` has a READY Preview deployment at the branch alias. This is not a Production deployment.


## Development isolation attempt — 2026-11-19

- The user explicitly approved creating a Supabase Development Branch after the quoted estimate of USD $0.01344/hour.
- Supabase returned `PaymentRequiredException`: Development Branches are supported only on Pro plan or above. The authoritative project is on Free plan; no branch was created and no branch compute charge began.
- The project currently has no Supabase development branches. Do not retry branch creation unless the project plan changes or a separate disposable database is provisioned.
- Continue with repository-side compatibility analysis and local/disposable PostgreSQL rehearsal only. No production schema, data, Storage, or Vercel environment variables were changed.
