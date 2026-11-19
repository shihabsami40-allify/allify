# ALLIFY recovery progress ledger

Last reconciled: 2026-11-19  
Repository: `shihabsami40-allify/allify`  
Branch: `allify-recovery-2026-11-17`  
Latest commit: `82f3abc61b312faeb9146a3bff5286ec9aa75b78`  
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

- Latest commit `82f3abc6` has Vercel Preview status SUCCESS and deployment state READY.
- Preview alias: https://allify-chattogram-git-allify-recovery-2026-11-17-allify.vercel.app
- This is a Preview deployment, not Production.
- Deployment success proves build/deploy only; it does not prove database-backed workflows.

## Main remaining blocker — do this next, not more repeated tests

The authoritative Supabase project is `onqadpqdontbdvecnvby` (ap-south-1). Its live schema is still the six-table legacy schema (`profiles`, `categories`, `stores`, `products`, `orders`, `order_items`). The application expects `user_roles`, `delivery_areas`, `seller_applications`, `seller_stores`, `product_images`, cart/address tables, renamed columns and new RPCs.

Existing migrations `0000`–`0016` are not safe to apply blindly. The live `app_role` enum and existing SECURITY DEFINER helpers/policies/triggers require compatibility handling. Existing six category UUIDs/slugs must be preserved.

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
