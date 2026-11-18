# ALLIFY recovery status

Source: Lovable project revision 2374410ebdb39a274e68fc9cade5cd64fb4dd54b
Recovery branch: allify-recovery-2026-11-17
Latest verified code commit: 7877b343670d418de885e0921a04c7d42d3b6972

## Recovered and verified
- Recovered the text source, route, test, configuration, and migration files from the Lovable revision into the recovery branch.
- Main branch remains unchanged.
- Fixed lint issues and removed the missing homepage hero asset reference.
- GitHub Actions runs lint, strict TypeScript checking (excluding the orphaned legacy `src/routes/$page.tsx`), 20 tests, and production build; latest verified run succeeded.
- Public catalog filters suspended stores, cart stock-limit messaging is corrected, and unavailable cart entries can be removed individually.
- Checkout now uses authenticated cash-on-delivery flow calling the existing live `place_order` RPC; order history uses authenticated Supabase data.
- Product-detail add-to-cart now accounts for quantity already in the cart, prevents adding beyond available stock, and shows an error rather than a success toast when the limit is exceeded.
- Product cards also enforce the 99-item cart cap, matching cart and product-detail controls; CI run 44238102831 passed lint, strict TypeScript, tests, and production build.

## Database safety
- Lovable's environment and the existing Vercel project's Supabase URL point to project ref `htsvvotamlxlkncksssq`.
- A separately connected Supabase project `onqadpqdontbdvecnvby` is not substituted.
- Previously inspected live database has 13 public tables and records; counts at prior inspection were 24 products, 6 stores, 6 orders, and 2 seller applications.
- The live `place_order(jsonb,text,text,text,text,text,boolean)` function validates customer input/delivery area, locks products, checks stock, decrements inventory, creates order and order-items transactionally, and clears cart.
- RLS on orders/order-items was reviewed. No SQL writes, migrations, test orders, or real inventory changes were made.

## Latest verified source update
- Product-detail stock-overflow guard commit `9071d305`; CI run `44237881589` passed lint, strict TypeScript, 20 tests, and production build.
- Product-card cart quantity cap commit `7877b343`; CI run `44238102831` passed lint, strict TypeScript, tests, and production build.
- Bengali 404/error-page localization commit `e0955663`; CI run `44237769526` passed.
- Added order-history refresh after checkout and seller/admin order-status changes.
- CI for both cache-refresh commits passed lint, strict TypeScript, tests, and production build.
- Source review of `0000_migration.sql`, `0001_secure_marketplace_controls.sql`, and `0003_order_status_lifecycle.sql` confirms that pending/confirmed items may transition to `cancelled`, but the recovered database functions contain no corresponding stock-restoration operation. The current seller/admin status-update path can therefore cancel an item without restoring product stock. This is a launch blocker; implement an authenticated, atomic, idempotent cancellation RPC (with authorization and concurrency protections) and test only against controlled test inventory. No live test was run.

## Remaining before launch
- Restore the remaining original catalog/hero binary assets; missing product images now use a graceful SVG placeholder and the favicon is restored as SVG. Do not use corrupted text representations.
- Verify buyer, seller, and admin flows in an authenticated browser session, including controlled COD order, inventory decrement, seller status changes, admin controls, cancellation/stock-restoration behavior. Use a dedicated test product and cleanup plan.
- Review the security findings and order-status lifecycle carefully; specifically, do not expose cancellation as a normal operational action until the stock-restoration blocker is resolved.
- Payment gateway is not configured; only COD is implemented.
- Vercel project has no Git repository link yet. A preview deployment attempt failed with `git_info_fail`; subsequent API request was rate-limited by GitHub. The GitHub app was just installed for the repository, but Vercel's linked-project state still needs re-checking.
- Do not merge recovery into main or deploy production until source/assets, authenticated checks, and preview are verified.

## Environment
See `.env.example` for variable names only. Never commit real keys or .env files.
