# Legacy RPC security remediation plan

Status: staged review plan — **not executable SQL**  
Reviewed: 2026-11-20  
Authoritative project: `onqadpqdontbdvecnvby`

## Current advisor result

The latest Supabase security advisor reports four `SECURITY DEFINER` functions callable by both `anon` and `authenticated`:

- `public.is_admin()`
- `public.owns_store(uuid)`
- `public.lookup_order(text,text)`
- `public.place_marketplace_order(text,text,text,text,jsonb)`

The performance advisor reports seven RLS init-plan warnings, one multiple-permissive-policy warning on `categories`, and seven unused-index notices. The health advisor reports no findings. These are the current observations, not proof of exploitability; the functions and policies must be reviewed in context.

## Why no blanket revoke is safe

- Legacy RLS policies on `categories`, `products`, `stores`, `orders`, and `order_items` call `is_admin()` and/or `owns_store(uuid)`. Revoking those helpers before replacing the dependent policies may break legitimate reads and writes.
- `lookup_order(text,text)` is a guest order lookup API. Removing anon execution before replacing the customer-facing lookup workflow would break that route.
- `place_marketplace_order(...)` is the legacy guest checkout API. Removing it before confirming that no live client depends on it would break checkout. The current application uses a different authenticated `place_order(...)` RPC.
- These functions use SECURITY DEFINER and are externally reachable, so their bodies, search paths, validation, output columns, and rate limiting require explicit review.

## Safe remediation sequence

1. On an isolated restored clone, capture the exact function definitions, ownership, ACLs, dependent policies, and all callers.
2. Implement replacement helper functions in a non-exposed schema where practical, with fixed `search_path`, minimal privileges, and an explicit caller/ownership check.
3. Replace each dependent RLS policy with the tested replacement helper; verify both allowed and denied cases as anon, owner, unrelated authenticated user, and admin.
4. Replace guest order lookup with a privacy-reviewed flow that returns only the minimum order information and is protected against repeated guessing. Preserve a compatibility route only if the product still needs guest order lookup.
5. Decide whether guest checkout is still a supported product requirement. If not, first verify all active clients use the authenticated, idempotent checkout flow and then retire the old RPC. If guest checkout remains required, redesign it with strong validation, idempotency, abuse controls, and minimal response data before keeping it public.
6. Only after all dependencies and clients are migrated, revoke public/anon EXECUTE from the legacy functions and remove or replace obsolete routines in a separate reviewed migration.
7. Rerun Supabase security/performance/health advisors and the RLS integration test matrix.

## Performance follow-up

- For the seven RLS init-plan warnings, evaluate replacing per-row `auth.uid()` / `current_setting()` calls with scalar subqueries such as `(select auth.uid())`, without changing policy semantics.
- For `categories`, consolidate overlapping authenticated SELECT policy behavior only after checking admin and public-read outcomes.
- Do not drop unused indexes before the application has real traffic and query plans. Current empty tables make usage statistics inconclusive.

## Data API exposure

Supabase now requires explicit exposure/grants for new public-schema tables; do not assume a new table automatically becomes reachable through the Data API. Every target table must have intentional grants and RLS enabled, followed by positive and negative API tests.

## Hard safety gate

No production function, policy, grant, trigger, Storage rule, or environment variable is changed by this document. Apply only after a restorable backup exists, the isolated rehearsal passes, and the owner explicitly authorizes the specific production cutover.
