# ALLIFY recovery status

Source: Lovable project revision 2374410ebdb39a274e68fc9cade5cd64fb4dd54b
Recovery branch: allify-recovery-2026-11-17
Latest verified code commit: 772477924710570a6c14fa6fb2e79103e1664e07

## Recovered and verified
- Recovered the text source, route, test, configuration, and migration files from the Lovable revision into the recovery branch.
- Main branch remains unchanged.
- Fixed lint issues and removed the missing homepage hero asset reference.
- GitHub Actions runs lint, strict TypeScript checking (excluding the orphaned legacy `src/routes/$page.tsx`), tests, and production build.
- Public catalog filters suspended stores, cart stock-limit messaging is corrected, and unavailable cart entries can be removed individually.
- Checkout uses the authenticated cash-on-delivery flow calling the existing `place_order` RPC; order history uses authenticated Supabase data.
- Product-detail and product-card add-to-cart prevent exceeding available stock and the 99-item cart cap.
- Bengali 404/error-page localization and customer order-history cache invalidation are implemented.
- Seller/admin app-layer cancellation actions are blocked until database stock restoration is safe; regression test covers pending and confirmed cancellation attempts.

## Source-level order lifecycle review (2026-11-18)
- Checkout calls the authenticated `place_order` RPC. The recovered SQL validates the signed-in customer and delivery details, locks each active product row, checks stock, decrements stock, creates order/order-item records, and clears the customer's saved cart within the transaction.
- The secure marketplace migration adds a database trigger preventing the internal stock-update path from processing demo-store products as real orders.
- Seller/admin status changes pass through the server function, which checks the allowed app transition, verifies admin role or store ownership, and uses a conditional update against the previously observed status.
- The database order-item trigger still permits `pending -> cancelled` and `confirmed -> cancelled` for direct authenticated updates. There is no stock-restoration routine in the recovered order flow. App-level blocking is not a database security boundary; cancellation remains a launch blocker.
- Supabase MCP read-only schema/migration inspection was attempted for project `htsvvotamlxlkncksssq` but the connected tool returned a permission-denied response. No database schema, migration, data, or inventory was changed. Reconnect/authorize Supabase access before designing and validating a new migration against the actual live schema.
- No real checkout, test order, stock mutation, browser-authenticated flow, or production deployment was performed during this review.

## Database safety
- Lovable's environment and the existing Vercel project's Supabase URL point to project ref `htsvvotamlxlkncksssq`.
- A separately connected Supabase project `onqadpqdontbdvecnvby` is not substituted.
- Previously inspected live database had 13 public tables; prior observed counts were 24 products, 6 stores, 6 orders, and 2 seller applications.
- The live `place_order(jsonb,text,text,text,text,text,boolean)` function validates customer input and delivery area, locks products, checks stock, decrements inventory, creates order and order-items transactionally, and clears cart.
- RLS on orders/order-items was reviewed. No SQL writes, migrations, test orders, or real inventory changes were made.

## Latest verified source update
- Product-detail stock-overflow guard commit `9071d305`; CI run 44237881589 passed.
- Product-card cart quantity cap commit `7877b343`; CI run 44238102831 passed.
- Bengali 404/error-page localization commit `e0955663`; CI run 44237769526 passed.
- Checkout and seller/admin order-status changes invalidate customer order-history cache; associated CI runs passed.
- App-layer order cancellation is blocked by commit `da430aaaa79616128e49dc95a98c77590aa2786f`, with regression test `772477924710570a6c14fa6fb2e79103e1664e07`; CI runs 44238570205 and 44238573890 passed all checks.
- Documentation commits `2562ed7485edd52e6a372d8fc3027422d8c12191` and `c0b328e52dbfe4f5cc77cda36984191e11c55348`; CI runs 44238653991 and 44238657856 both passed.
- Source review confirms the existing database trigger still allows direct cancellation updates through the authenticated Data API, while the recovered functions have no stock-restoration logic. This is an app-layer mitigation only, not a complete database-level block. A reviewed new migration must close the API bypass and implement authenticated, atomic, idempotent stock restoration with concurrency protections. No live test or database write was run.

## Vercel deployment status
- Existing Vercel project: `allify-chattogram` (`prj_HrrHA2oTczJFEKdKUB9hAOsJ8DEV`) in team `allify`.
- The existing project is now linked to GitHub repository `shihabsami40-allify/allify`; the Git provider connection was verified in Vercel's Git deployment context.
- A fresh Preview deployment was created from branch `allify-recovery-2026-11-17`, commit `225c619da50be292bf008d89ed028a45abb6632b`: `https://allify-chattogram-5go72lc2f-allify.vercel.app`.
- Git-triggered Preview deployment is now verified for later commits too. Latest recovery-branch commit `08bd585752d116301f73776f34a1303501944ebb` has deployment `dpl_7VgNxVnFc7AEMZod2pQ4nxy3uDHa`, state `READY`, URL `https://allify-chattogram-5ju3ugbqa-allify.vercel.app`.
- Vercel build logs report `Build Completed` and `Deployment completed`; deployment state is `READY`. This confirms build/deploy completion, not successful authenticated app QA.
- Project-level environment variables are present for Production, Preview, and Development: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, and `SUPABASE_PUBLISHABLE_KEY`. Secret values were not retrieved or recorded.
- Vercel SSO protection is enabled for deployments on non-custom domains. The preview has not yet received an authenticated browser QA session; no runtime logs were observed during the inspection window. Do not disable SSO as a shortcut.
- Production and `main` remain untouched. Do not create a duplicate project or promote this Preview to Production before launch gates are satisfied.

## Remaining before launch
- Restore the remaining original catalog/hero binary assets; missing product images use a graceful SVG placeholder. Do not use corrupted text representations.
- Verify buyer, seller, and admin flows in an authenticated browser session, including controlled COD order, inventory decrement, seller status changes, admin controls, and cancellation/stock-restoration behavior. Use a dedicated test product and cleanup plan.
- Review security and order-status lifecycle carefully; database cancellation bypass and missing stock restoration remain launch blockers.
- Payment gateway is not configured; only COD is implemented.
- Do not merge recovery into main or deploy production until assets, authenticated checks, and preview are verified.

## Environment
See `.env.example` for variable names only. Never commit real keys or `.env` files.


## 2026-11-18 — seller product image lifecycle follow-up

- Added safe extraction of product image object paths. Cleanup is limited to HTTPS URLs matching this Supabase project's public `product-images` bucket and the authenticated seller/store folder; external or other sellers' URLs are never removed.
- Seller image replacement now attempts to remove the previous owned image only after the product save succeeds. If a newly uploaded image is abandoned or the product save fails, the new upload is cleaned up best-effort. Replacing a just-uploaded file also removes the prior temporary upload best-effort.
- Added tests for owned image path extraction and rejection of external, cross-seller, and malformed paths. Corrected filename extension matching after CI caught a regex escaping issue.
- Latest verification: GitHub Actions run `44249101598` passed lint, typecheck, tests, and production build. Latest Vercel Preview for branch `allify-recovery-2026-11-17` is READY at `https://allify-chattogram-qa997ykwx-allify.vercel.app` (commit `9ffef61c1b71afb3222e1123b83610ae2153d96c`).
- Still not verified in an authenticated browser. Storage bucket/policies may require the migration to be applied in the intended Supabase project; no live DB changes were made. Preview SSO protection remains enabled. No production deployment or merge to `main` was performed.


## 2026-11-18 — seller image upload interaction safeguards

- Disabled seller product save and cancel actions while an image upload is in progress, preventing a save from racing the upload or a cancel from abandoning an in-flight file.
- Disabled switching to a different product/new-product form during an upload. When switching forms after an upload completes, the previous uncommitted upload is removed best-effort.
- CI run `44251012796` completed successfully (lint, typecheck, tests, production build).
- Latest Vercel Preview is READY: `https://allify-chattogram-n13zyypu9-allify.vercel.app`, commit `55fad1036c53801da790f8d4abc80af050e1089c`.
- Authenticated browser QA and live Supabase storage-policy verification remain outstanding; no live database changes, production deployment, or merge to `main` were performed.


## 2026-11-18 — seller management empty-state handling

- Seller management now returns empty product/order collections without issuing PostgREST `IN ()` filters when an authenticated seller account has no stores yet. This avoids a query error for newly approved/role-assigned accounts with no linked store.
- Admin store activation/suspension already requires a returned row via `.select('id').single()`; reviewed and confirmed no change needed there.
- CI run `44251286489` passed lint, typecheck, tests, and production build.
- Vercel Preview READY: `https://allify-chattogram-9v2amhkmw-allify.vercel.app`, commit `356b20483dfabd652102f7be11622cfed869e4d0`.
- Authenticated browser QA and live Supabase verification remain outstanding. No production deployment, live DB change, or merge to `main`.


## 2026-11-18 — product/image partial-save feedback

- A product row may be saved successfully while the related `product_images` insert/update fails. The server function now reports this as a partial-success warning instead of making the seller think the entire product save failed.
- Seller UI cleans up the newly uploaded temporary file best-effort when image metadata persistence fails, and retains the product record so it can be edited and retried without creating a duplicate.
- CI runs `44251602518` and `44251626245` passed lint, typecheck, tests, and production build.
- Latest Preview READY: `https://allify-chattogram-hrtfl7k30-allify.vercel.app`, commit `d622d81b189249370ec41c498be6b1074af8ad42`.
- Authenticated browser QA and live Supabase storage/database verification remain outstanding. No production deployment, live DB mutation, or merge to `main`.
