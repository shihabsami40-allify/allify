# ALLIFY recovery status

Source: Lovable project revision 2374410ebdb39a274e68fc9cade5cd64fb4dd54b
Recovery branch: allify-recovery-2026-11-17

## Recovered
- Text source, route, test, configuration, and migration files from the Lovable revision have been added to this branch.
- The existing main branch was not changed.
- No database migration or production deployment was run.

## Database verification
- The Lovable project's own environment configuration and the existing Vercel project's `VITE_SUPABASE_URL` / `SUPABASE_URL` point to the same Supabase project ref: `htsvvotamlxlkncksssq`.
- The separately connected Supabase dashboard project `onqadpqdontbdvecnvby` is different and is not being substituted.
- Lovable's project database connection is enabled. The live database exposes 13 public tables and existing marketplace records (at the time of the earlier count: 24 products, 6 stores, 6 orders, and 2 seller applications).
- The live `public.place_order(jsonb,text,text,text,text,text,boolean)` function was read directly. It is SECURITY DEFINER, requires `auth.uid()`, validates customer details and delivery area, locks active products, checks stock, decrements stock and creates order/order-item rows transactionally, then clears the customer's saved cart. The function has EXECUTE granted to authenticated and service_role (as well as postgres).
- Live RLS policies were inspected for orders, order_items, products, delivery_areas, carts, cart_items, and addresses. Customer order reads are limited to the customer, admin, or the owning store; order-item reads are limited to the customer, owning store, or admin.
- The Lovable database read quota was reached during follow-up metadata inspection. No SQL writes, test orders, migrations, or data changes were made. Do not run a test order against real inventory until a controlled test account/product and cleanup plan are available.

## Changes made on this recovery branch
- Replaced the browser-only demo checkout screen with an authenticated COD checkout that calls the existing live `place_order` RPC, validates buyer name/phone/address, and displays order totals.
- Replaced the browser-local demo order-history page with a customer order-history view that reads the signed-in customer's orders and order items from Supabase.
- Added a GitHub Actions workflow to run dependency installation, lint, tests, and production build on this recovery branch. The first run was queued when last checked; its final result is not yet known.
- These code changes have not yet passed CI or been exercised through a real signed-in browser session. Do not treat the flow as launch-ready until those checks pass.

## Still required before a safe deployment
- Restore the 18 binary assets listed in the Lovable project (favicon, product images, and catalog/hero images). The available Lovable file reader exposes binary files as lossy text; those corrupted representations must not be committed.
- Complete CI, then fix any build/lint/test errors it reports.
- Run authenticated buyer/seller/admin checks, including COD order creation and stock decrement, using a controlled test product and restoring inventory after the test.
- Review the remaining security findings and verify seller/admin order status transitions and stock restoration/cancellation logic.
- Online payment integration is not configured; the implemented payment option is COD only.
- Connect the existing Vercel project to the intended GitHub source only after the full source tree and preview build are verified. The existing Vercel project currently has no linked Git repository, and its latest production deployment was in ERROR state.

## Environment
See .env.example for required variable names only. Never commit .env or real keys.
