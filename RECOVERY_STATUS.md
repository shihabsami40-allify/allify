# ALLIFY recovery status

Source: Lovable project revision 2374410ebdb39a274e68fc9cade5cd64fb4dd54b
Recovery branch: allify-recovery-2026-11-17
Latest verified code commit: f8b49f72e37d7fa797baf1921870e3137d040584

## Recovered and verified
- Recovered the text source, route, test, configuration, and migration files from the Lovable revision into the recovery branch.
- Main branch remains unchanged.
- Fixed lint issues and removed the missing homepage hero asset reference.
- GitHub Actions runs lint, strict TypeScript checking (excluding the orphaned legacy `src/routes/$page.tsx`), 20 tests, and production build; latest verified run succeeded.
- Public catalog filters suspended stores, cart stock-limit messaging is corrected, and unavailable cart entries can be removed individually.
- Checkout now uses authenticated cash-on-delivery flow calling the existing live `place_order` RPC; order history uses authenticated Supabase data.

## Database safety
- Lovable's environment and the existing Vercel project's Supabase URL point to project ref `htsvvotamlxlkncksssq`.
- A separately connected Supabase project `onqadpqdontbdvecnvby` is not substituted.
- Previously inspected live database has 13 public tables and records; counts at prior inspection were 24 products, 6 stores, 6 orders, and 2 seller applications.
- The live `place_order(jsonb,text,text,text,text,text,boolean)` function validates customer input/delivery area, locks products, checks stock, decrements inventory, creates order and order-items transactionally, and clears cart.
- RLS on orders/order-items was reviewed. No SQL writes, migrations, test orders, or real inventory changes were made.

## Latest verified source update
- Added order-history refresh after checkout and seller/admin order-status changes.
- CI for both cache-refresh commits passed lint, strict TypeScript, tests, and production build.
- Cancellation stock restoration remains unverified; avoid live inventory testing.

## Remaining before launch
- Restore the remaining original catalog/hero binary assets; missing product images now use a graceful SVG placeholder and the favicon is restored as SVG. Do not use corrupted text representations.
- Verify buyer, seller, and admin flows in an authenticated browser session, including controlled COD order, inventory decrement, seller status changes, admin controls, cancellation/stock-restoration behavior. Use a dedicated test product and cleanup plan.
- Review the security findings and order-status lifecycle carefully.
- Payment gateway is not configured; only COD is implemented.
- Vercel project has no Git repository link yet. A preview deployment attempt failed with `git_info_fail`; subsequent API request was rate-limited by GitHub. The GitHub app was just installed for the repository, but Vercel's linked-project state still needs re-checking.
- Do not merge recovery into main or deploy production until source/assets, authenticated checks, and preview are verified.

## Environment
See `.env.example` for variable names only. Never commit real keys or .env files.
