# ALLIFY recovery status

Source: Lovable project revision 2374410ebdb39a274e68fc9cade5cd64fb4dd54b
Recovery branch: allify-recovery-2026-11-17
Latest reviewed commit: ce891d6dac57583768ca553423bed9d97b555a42

## Recovered and verified
- Recovered the text source, route, test, configuration, and migration files from the Lovable revision into the recovery branch.
- Main branch remains unchanged.
- Fixed lint issues and removed the missing homepage hero asset reference.
- GitHub Actions verification on the latest recovery commit succeeded: lint, 16 tests, and production build.
- Checkout now uses authenticated cash-on-delivery flow calling the existing live `place_order` RPC; order history uses authenticated Supabase data.

## Database safety
- Lovable's environment and the existing Vercel project's Supabase URL point to project ref `htsvvotamlxlkncksssq`.
- A separately connected Supabase project `onqadpqdontbdvecnvby` is not substituted.
- Previously inspected live database has 13 public tables and records; counts at prior inspection were 24 products, 6 stores, 6 orders, and 2 seller applications.
- The live `place_order(jsonb,text,text,text,text,text,boolean)` function validates customer input/delivery area, locks products, checks stock, decrements inventory, creates order and order-items transactionally, and clears cart.
- RLS on orders/order-items was reviewed. No SQL writes, migrations, test orders, or real inventory changes were made.

## Remaining before launch
- Restore/replace the 18 missing binary assets (favicon, product/catalog/hero images) from trustworthy originals; do not use corrupted text representations.
- Verify buyer, seller, and admin flows in an authenticated browser session, including controlled COD order, inventory decrement, seller status changes, admin controls, cancellation/stock-restoration behavior. Use a dedicated test product and cleanup plan.
- Review the security findings and order-status lifecycle carefully.
- Payment gateway is not configured; only COD is implemented.
- Vercel project has no Git repository link yet. A preview deployment attempt failed with `git_info_fail`; subsequent API request was rate-limited by GitHub. The GitHub app was just installed for the repository, but Vercel's linked-project state still needs re-checking.
- Do not merge recovery into main or deploy production until source/assets, authenticated checks, and preview are verified.

## Environment
See `.env.example` for variable names only. Never commit real keys or .env files.
