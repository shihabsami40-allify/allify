# ALLIFY recovery status

## 2026-11-18 — missing demo product image fallback

- Preview inspection found that demo records referenced local `/images/products/*.jpg` paths that are not present in the repository's public assets; direct requests to sample paths returned HTTP 404.
- Updated `safeImageUrl` to allow only the shipped local placeholder asset and reject missing local image paths. Product cards and detail pages now fall back to the existing `/images/products/placeholder.svg` rather than attempting known-missing local files; secure HTTPS seller-uploaded images remain supported.
- Added regression tests for the shipped placeholder and missing demo image paths.
- GitHub Actions run `44290351233` passed lint, strict typecheck, tests, and production build on commit `a2c6008c06855af0c6ce65bbcea242e3332c3137`.
- Latest preview source prior to this image fix was reachable and returned HTTP 200 for the homepage; sample missing demo image paths returned 404 and the placeholder returned 200. Authenticated browser QA remains outstanding.
- A manual Preview deployment of the image fix was blocked by Vercel's API deployment quota (over 100 deployments for the day; retry after 24 hours). No Production deployment was attempted.


## 2026-11-18 — cancellation workflow CI and source review follow-up

- Latest branch HEAD: `3b6383ba663072d37a22c43a0e2dd4d9302fc6e2`.
- GitHub Actions run `44289444333` completed successfully: Lint, Typecheck, Tests, and Production Build all passed.
- Reviewed the checkout stock-decrement path against the new cancellation restoration path: checkout locks product rows, decrements stock, and increments `sold_count`; cancellation restores stock and reverses `sold_count` in the same transaction as the item status update.
- Migration `0016` remains source-only. The direct authenticated Data API cancellation guard and the protected RPC are effective only after the migration is applied to the intended Supabase project. PostgreSQL execution, migration-order validation against the live schema, and controlled test-data verification remain outstanding.
- No live database changes, test orders, inventory mutations, production deployment, or `main` branch changes were made.


## 2026-11-18 — atomic order-item cancellation with stock restoration (source only)

- Added migration `0016_atomic_order_item_cancellation.sql` and registered it in the Drizzle journal.
- Cancellation now has a dedicated authenticated RPC. It locks the order item, checks admin/store ownership and demo status, accepts only pending or confirmed items, restores stock and reverses sold_count in the same transaction, then marks the item cancelled. Repeated requests for an already-cancelled item are idempotent; cancelled items cannot be reopened.
- Direct Data API cancellation remains blocked; only the protected RPC can set the internal transaction flag needed by the database trigger.
- Seller/admin server actions now route cancellation through the RPC. The UI transition map exposes cancellation only before shipment.
- Added regression tests for transition rules and migration security/atomicity invariants.
- IMPORTANT: this migration is source-controlled only and has NOT been applied to Supabase. It has not yet been executed against PostgreSQL or verified against the live project schema. Do not enable production cancellation or launch until the migration is reviewed, applied to the intended project, and exercised with controlled test data. No live stock, order, or database rows were changed.


Source: Lovable project revision 2374410ebdb39a274e68fc9cade5cd64fb4dd54b
Recovery branch: allify-recovery-2026-11-17
Latest source update: atomic order-item cancellation and stock restoration workflow; GitHub Actions run 44289444333 passed lint, strict typecheck, tests, and production build.

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


## 2026-11-18 — admin demo-data protection

- Admin order status updates now load the related order's `is_demo` flag and reject demo-order changes server-side; the admin UI labels demo orders as read-only.
- Admin store activation/suspension now updates only rows with `is_demo=false`. Product moderation verifies the product's store and rejects demo-store products server-side; the UI labels and disables moderation controls for demo products.
- CI runs `44251973297` and `44252003498` passed lint, strict typecheck, tests, and production build.
- Latest Vercel Preview READY: `https://allify-chattogram-qsw4xz0zn-allify.vercel.app`, commit `c40e06a5054dbee23df09c78818d6a40e859f272`.
- These are application/server-function protections, not a replacement for database RLS/trigger hardening. Authenticated browser QA and live Supabase verification remain outstanding. No production deployment, live DB mutation, or merge to `main`.


## 2026-11-18 — safer checkout error handling

- Checkout now translates known RPC failures (sign-in, invalid delivery details, unavailable area/product, and insufficient stock) into clear Bengali guidance.
- Unknown backend errors now show a generic safe message instead of exposing raw database/PostgREST details to customers. The local cart is still retained on failure; it is cleared only after a successful order number is returned.
- Added regression tests for stock/area messages and for suppressing internal database details. CI runs `44252363948`, `44252378392`, and `44252398488` passed lint, strict typecheck, tests, and production build.
- Latest Preview READY: `https://allify-chattogram-dgtgp8nc4-allify.vercel.app`, code/test commit `83f1558cf4fc634675031bae7d61212f388b92a3`.
- Authenticated browser checkout remains untested; this does not validate live RPC/database behavior. No live DB mutation, production deployment, or merge to `main`.


## 2026-11-18 — seller application duplicate guard

- The authenticated seller application server function now checks for an existing owned store and a pending application before inserting a new application. This prevents ordinary repeat submissions and gives a clear Bengali reason; the application form now displays that server feedback.
- CI runs `44252803421` and `44252824422` passed lint, strict typecheck, tests, and production build.
- Preview for the server-function change: `https://allify-chattogram-55p24grpc-allify.vercel.app` (READY, commit `08837b98b1a891e958e3f3d1d84ad1a7f5a1dc61`). UI feedback commit `fdd88d08d1b23394bac1b69370e1b1c8652b8645` is separately deployed as a Preview build; its final state is checked separately.
- This is an application-level duplicate guard. A database unique partial index/RPC would be needed to eliminate simultaneous-request races; no live DB migration was attempted. No production deployment or merge to `main`.


## 2026-11-18 — latest public-page and seller-state review

- Corrected the homepage copy to distinguish demo sample listings from active real seller listings; active non-demo products may be ordered subject to availability and delivery area.
- Browse results now distinguish catalog loading failures from a genuinely empty search result. Product detail distinguishes catalog errors from a missing product. Store detail distinguishes loading errors, missing stores, and stores with no products.
- Seller dashboard now explains when a store is suspended and disables product add/edit controls while suspended.
- Latest verified recovery-branch commit: `e979d7f9704fc0a72e08f7d9644cc06034a16bc7` (`Explain suspended seller product editing restrictions`).
- GitHub Actions run `44255489341` completed successfully: lint, strict typecheck, tests, and production build.
- Latest Vercel Preview deployment `dpl_oQzG5RnvtipktKaNzPbubbRRurSc` is READY at `https://allify-chattogram-i2vfcir8a-allify.vercel.app`, sourced from the same recovery-branch commit.
- The authenticated browser QA gate is still open; READY means deployment completed, not that buyer/seller/admin workflows have been browser-tested.

## Outstanding database hardening — do not bypass

- The recovered `0003_order_status_lifecycle.sql` trigger still permits direct authenticated Data API cancellation transitions from pending/confirmed to cancelled. The app currently blocks these transitions, but that is not a database boundary.
- No atomic, idempotent stock-restoration routine exists for cancellations. Treat cancellation as a launch blocker until a reviewed migration closes the direct-API path and safely restores stock.
- The product RLS update policy also permits an owner to update their own product rows without requiring the store to remain active. The seller UI disables editing for suspended stores, but direct Data API writes may bypass that UI restriction. Review and enforce the suspended-store restriction in the database after authorized live-schema inspection.
- The secure marketplace migration's demo-stock trigger blocks internal stock updates for demo-store products. Do not infer that all demo-order or order-lifecycle concerns are solved by that trigger alone.
- Supabase read-only inspection for the intended project remains permission-denied. Do not guess live schema state, write a speculative migration, or substitute the separately connected project.
- `main`, Production, and live database state remain untouched.


## 2026-11-18 — admin demo-product moderation hardening

- Reviewed the admin server functions and found a secondary admin hide action that could update a product without first checking whether its store was a demo store. The visible dashboard already uses the separately guarded moderation function, but the unused/alternate server action still needed defense-in-depth.
- Updated `adminAction` so its `hide` branch loads the product's store and rejects missing/demo stores before changing product status.
- Commit: `4a808d64dff7b4a890d6141a85086322394874e1` (`Prevent admin hide action from modifying demo products`).
- GitHub Actions run `44256375986` passed lint, strict typecheck, tests, and production build.
- Vercel Preview for this commit is READY: `https://allify-chattogram-8jbzyoi0j-allify.vercel.app`.
- This is server-function hardening only; authenticated browser QA and database-level policy verification remain outstanding. No live DB changes, production deployment, or merge to `main`.


## 2026-11-18 — legacy dashboard order transition alignment

- Reviewed the legacy consolidated route `src/routes/$page.tsx`, which is still part of the source tree even though the primary route files use dedicated dashboards.
- Routed its admin product moderation and admin/seller order-status changes through the same guarded server functions used by the dedicated dashboards. This closes an alternate client-side mutation path.
- Removed pending/confirmed cancellation options from the legacy dashboard controls so its visible actions match the currently supported app transitions. Cancellation remains unavailable pending database-level stock-restoration design.
- Commits: `b50b731a34a514c10c60eeae93721b5a171b606c` (server-guarded legacy actions) and `b48c02d656dfe3e41c305f19acb6596914fdd579` (transition UI alignment).
- CI run `44257328584` passed lint, strict typecheck, tests, and production build. CI run `44257565120` also passed all four checks for the transition UI alignment.
- Latest Vercel Preview for `b48c02d6` is being verified separately; prior commit `b50b731a34` Preview is READY at `https://allify-chattogram-jo72ynkqy-allify.vercel.app`.
- No authenticated browser QA, live database mutation, production deployment, or merge to `main` was performed.


## 2026-11-18 — COD order RPC trigger compatibility review

- Source-level review found that the secured `orders_guard` trigger rejects non-status order updates unless the transaction-local `app.internal` flag is enabled. The recovered `place_order` RPC cleared that flag before updating `orders.subtotal` and `orders.total`, which can cause the checkout transaction to fail when this trigger is present.
- Prepared migration `0004_fix_place_order_internal_guard.sql` and registered it in the Drizzle journal. It keeps the internal flag enabled until protected order writes are complete and excludes demo stores in the locked product lookup (`s.is_demo = false`).
- Added static regression checks for the guard-flag ordering and demo-store exclusion. These tests verify migration source intent, not execution against PostgreSQL.
- **Not applied to Supabase.** Live schema/migration inspection for the intended project previously returned permission denied; the connected project must be authorized and the live migration state checked before applying. No real checkout, test order, stock change, database migration, production deployment, or merge to `main` was performed.
- GitHub Actions run `44258906618` passed lint, strict typecheck, tests, and production build for commit `e35d4bdaa0b8ee4b8c84180e4c85421959a21988`. Vercel Preview is READY at `https://allify-chattogram-n8jmfo80l-allify.vercel.app` for that commit. This verifies source/build only; it does not apply the SQL migration or validate checkout against PostgreSQL. The fix must not be described as live until the migration is applied and a controlled authenticated COD test is completed.


## 2026-11-18 — Direct order-cancellation guard

- Review confirmed migration `0003_order_status_lifecycle.sql` still permits seller-side direct API transitions from pending/confirmed to cancelled, while the application rejects cancellation because it does not restore stock.
- Added `0005_block_unrestored_order_cancellation.sql`: the database trigger now permits only pending → confirmed → shipped → delivered for non-admins. This closes the seller Data API bypass until an atomic stock-restoration workflow is designed and tested.
- Added static regression assertions for the allowed transitions and cancellation exclusion.
- **Not applied to Supabase.** Live schema/migration permissions remain unavailable; verify existing applied migration state and any historical data before applying. Admins remain privileged and may still change status through direct DB access. No production deployment or live data change.


## 2026-11-18 — Public catalog data minimization

- The public `getCatalog` server function previously selected every column from active `seller_stores` rows. The returned catalog therefore included fields not needed by public storefront UI, including `owner_id`, `phone`, and `address`.
- Added a `PublicStore` response type and restricted the public catalog query to storefront display fields only. Private owner/contact/address fields are no longer included in the catalog response.
- Added a regression test asserting the public store query uses an explicit field allowlist.
- GitHub Actions run `44259700176` passed lint, strict typecheck, tests, and production build for commit `49872602727f66ea278e4c12f642e46430546865`. Vercel Preview is READY at `https://allify-chattogram-ejsi8k7xe-allify.vercel.app`.
- This is source/build verification only; authenticated browser QA remains pending. No production deployment, live database mutation, or merge to `main`.


## 2026-11-18 — Product-page metadata

- Product detail routes now emit route-specific page titles based on the product slug instead of reusing one generic title for every product URL.
- Added a concise Chattogram/ALLIFY description for product-page search and social previews.
- GitHub Actions run `44260571383` passed lint, typecheck, tests, and production build for commit `b0ee8a74aeb4f91f996db85c892f9d1d20e4ac37`. Vercel Preview is READY at `https://allify-chattogram-4wpa59vfi-allify.vercel.app`.
- This is code/build verification only. Authenticated browser QA and live database migration/checkout verification remain outstanding. No production deployment or merge to `main`.


## 2026-11-18 — admin revenue report correction

- Admin report totals previously included cancelled real orders in the overall order-value figure, which could overstate sales value.
- Added a shared `orderReportTotals` calculation: real order count still includes cancelled orders for transparent order volume, but cancelled and demo orders are excluded from revenue; delivered value includes only delivered real orders.
- Added regression coverage for pending, cancelled, delivered, and demo orders.
- GitHub Actions run `44261190359` passed lint, strict typecheck, tests, and production build for commit `b8266826663320befb3e2eea4b5679b34a5d8d9f`.
- Vercel Preview is READY at `https://allify-chattogram-14xwehscd-allify.vercel.app` for the same commit.
- Authenticated browser QA remains pending; no live database changes, production deployment, or merge to `main`.


## 2026-11-18 — seller temporary image replacement cleanup fix

- When replacing an uncommitted seller image, the previous temporary object cleanup result was previously ignored. If removal failed, the UI could switch its tracked temporary path to the new upload, leaving the older object untracked.
- The seller dashboard now checks the previous-object removal result. If cleanup fails, it removes the just-uploaded replacement best-effort and retains the previous temporary image as the tracked selection; it does not silently advance the UI state.
- Added a regression test for this failure path.
- GitHub Actions run `44261816396` (implementation) and `44261829126` (regression test) both passed lint, strict typecheck, tests, and production build.
- Latest recovery-branch Preview for commit `79f6b1d323a1e0eba89d25e28c39eaa2c3f0887c` is READY: `https://allify-chattogram-92d7xiybn-allify.vercel.app`.
- This does not verify storage policies against live Supabase or authenticated browser behavior. No live database changes, production deployment, or merge to `main` were performed.


## 2026-11-18 — preserve temporary seller image on failed discard

- Seller dashboard previously ignored errors while discarding an uncommitted temporary product image before switching to another product form or cancelling the edit. This could leave an orphaned storage object while clearing the only tracked path.
- Temporary-image discard now checks the Storage removal result. If removal fails, it shows an error and keeps the current form and tracked image intact. Switching to a new product, another product, or closing the form waits for successful cleanup.
- The cancel action is also disabled while a product save is in progress to avoid racing an in-flight save.
- Added regression tests for cleanup failure and all three form-switch paths.
- GitHub Actions run `44262285708` (code) and `44262289643` (tests) both passed lint, strict typecheck, tests, and production build.
- Preview for code commit `ec40fe59f07564e389b8f3df800dad7312aba630` is READY at `https://allify-chattogram-f59re022n-allify.vercel.app`. Latest test commit `a158fdb36bcd8fe0e56e846557bd982b7a23e22e` Preview is still building at the time of this update.
- No live database changes, production deployment, or merge to `main` were performed. Authenticated browser QA and live Supabase Storage policy verification remain outstanding.


## 2026-11-18 — product image storage policy hardening

- Added migration `0006_secure_product_image_storage.sql` and registered it in the Drizzle migration journal.
- Storage insert/update now require the exact `<user-id>/<store-id>/<file>` folder shape and verify the store belongs to the authenticated user, is active, and is not a demo store.
- Storage deletion verifies the same user/store ownership but intentionally does not require an active status, so a seller can clean up old images after a store is suspended.
- Added regression tests for upload ownership, update old/new object checks, and suspended-store cleanup.
- GitHub Actions run `44262582717` passed lint, strict typecheck, all tests, and production build for commit `3fd726e3fb34488814b9058ce72f3d212a705c6b`.
- Vercel Preview for that commit is READY at `https://allify-chattogram-bt3jzutjp-allify.vercel.app`.
- The migration is source-controlled only and has NOT been applied to Supabase. The connected Supabase project has not been changed. Authenticated Storage-policy behavior still needs verification after authorized migration application. No production deployment or merge to `main` was performed.


## 2026-11-18 — reset stale image URL when starting a new product

- A seller could cancel an edit after changing the image and then open a new-product form while the previous image URL remained in component state. The new-product action now clears the prior image URL and temporary upload tracking after cleanup succeeds, before opening a blank form.
- Added a regression assertion for the reset behavior. The first test attempt exposed an outdated assertion expecting the previous one-line handler; the assertion was updated to check the new guarded reset.
- GitHub Actions run `44263104581` passed lint, typecheck, tests, and production build for commit `5b7ae2211ab772981884f7d961b846f8099afbf7`. Vercel Preview is READY at `https://allify-chattogram-c7p9wyf9z-allify.vercel.app`.
- This is source/build verification only. No authenticated browser QA, live Supabase migration, production deployment, or merge to `main` was performed.


## 2026-11-18 — explicit product image bucket configuration

- Added migration `0007_harden_product_image_bucket_config.sql` to make the product image bucket configuration explicit and repeatable: public storefront reads, a 5 MB upload cap, and JPEG/PNG/WebP MIME types. The migration upserts the bucket settings so it also repairs drift if the bucket already exists.
- Recreates the named public-read policy intentionally; seller write/delete authorization remains governed by migration 0006.
- Registered migration 0007 in the Drizzle journal and added regression coverage for the bucket settings and public-read policy.
- GitHub Actions run `44263630732` passed lint, strict typecheck, tests, and production build for commit `8b46ac25a83c76ddffe5814e7fa0866245c0ab18`.
- Migration 0007 is source-controlled only and has NOT been applied to Supabase. No live database change, authenticated browser QA, production deployment, or merge to `main` was performed.


## 2026-11-18 — seller temporary image cleanup retry tracking

- The seller dashboard now tracks temporary Storage objects whose cleanup fails, including a newly uploaded replacement that cannot be removed after the previous temporary image cleanup fails.
- Discarding or switching product forms retries cleanup for both the selected temporary image and queued orphan paths. Successfully removed paths are cleared from tracking; failed paths remain queued and the current form is preserved.
- Failed cleanup after a product-save warning or failed save is also retained for a later retry instead of silently losing the object path.
- Added regression tests for rollback cleanup tracking, retry-queue behavior, form-switch safety, and cleanup failures after save/upload errors.
- GitHub Actions run `44264263493` passed lint, strict typecheck, tests, and production build for commit `6b0482fc006f65f6b1813df3f022c914b4247887`.
- This is code/build verification only. No authenticated browser QA, live Supabase changes, production deployment, or merge to `main` was performed.


## 2026-11-18 — block admin order cancellation until stock restoration exists

- Review found that migration 0005 restricted seller cancellation but retained the admin bypass. Because cancellation still has no atomic stock-restoration implementation, a privileged direct database update could mark an order item cancelled without restoring inventory.
- Added migration `0008_block_admin_order_cancellation.sql`: it rejects transitions to `cancelled` for every role, including admins, while retaining existing seller forward transitions and the admin's other status-management bypass.
- Registered migration 0008 and added regression tests ensuring the cancellation rejection runs before the admin exception and that forward transitions remain intact.
- Migration is source-controlled only and has NOT been applied to Supabase. No order, inventory, or production data was changed.


## 2026-11-18 — COD checkout request idempotency

- Review identified a duplicate-order risk if the COD order transaction commits but the client loses the response and retries.
- Added migration `0009_checkout_request_idempotency.sql`: orders gain a nullable customer-scoped request UUID with a unique index; the RPC serializes repeated calls carrying the same key and returns the original order number instead of creating a second order. The RPC retains row locking, stock validation/decrement, demo-store exclusion, and authenticated-only execution.
- Checkout now persists a request UUID against the signed-in customer and normalized cart contents, reuses it after a failed/uncertain response (including a page reload when browser storage is available), and clears it only after the RPC returns success.
- Added regression tests for the database uniqueness/lock/replay path and client key reuse.
- Migration is source-controlled only and has NOT been applied to Supabase. No test orders, inventory updates, production deployment, or merge to `main` were performed. Authenticated end-to-end checkout testing remains required after authorized migration application.
- GitHub Actions run `44265574016` passed lint, strict typecheck, all tests, and production build for the typed implementation; follow-up run `44265737533` also passed after adding the assertion that replay returns before stock mutation.
- Vercel Preview for the initial implementation commit is READY at `https://allify-chattogram-1xk1n72sd-allify.vercel.app`; it is not yet the final test-only revision. No authenticated browser QA was possible because Preview access is SSO-protected.


## 2026-11-18 — suspended-store product write hardening

- Replaced the permissive seller product insert/update/delete RLS policies. Store owners can now insert, update, or delete products only while their own store is active and non-demo; admin access is retained.
- This closes the direct authenticated Data API bypass where a suspended seller could write product rows despite the dashboard disabling product editing.
- Added migration `0010_restrict_suspended_store_product_writes.sql`, registered as Drizzle journal entry 8, plus regression tests for insert/update/delete policy conditions.
- Initial CI runs passed all checks; the follow-up that adds delete-policy coverage is pending. The migration is source-controlled only and has NOT been applied to Supabase. No live database rows, inventory, or orders were changed.
- Production and `main` remain untouched. Authenticated browser QA is still outstanding.


## 2026-11-18 — checkout retry payload binding

- Tightened client-side checkout idempotency: the persisted request key now includes the normalized cart plus recipient, phone, delivery area, address, and note.
- Retrying the same checkout payload reuses the original request ID; intentionally changing delivery details produces a distinct request ID instead of accidentally replaying an earlier order with a different address expectation.
- Added regression assertions for all delivery fields in the retry-key payload.
- CI is pending. No Supabase migration was applied and no live orders or inventory were changed.


## 2026-11-18 — demo order status database guard

- Added migration `0011_block_demo_order_status_updates.sql` to reject order-item status changes whenever the parent order is marked `is_demo = true`, including direct authenticated Data API updates by administrators.
- The trigger retains the existing cancellation block and the normal seller fulfillment transitions. It changes no demo rows; it only guards future updates after the migration is applied.
- Registered migration journal entry 9 and added regression tests for demo-order immutability and preserved lifecycle rules.
- CI is pending. Migration is source-controlled only and has NOT been applied to Supabase. No orders, stock, or live database rows were changed.


## 2026-11-18 — seller application concurrency guard

- Added migration `0012_serialize_seller_application_submissions.sql`. The application insert trigger now takes a transaction-scoped advisory lock keyed by applicant user ID before checking for an existing pending application.
- This closes the race where two simultaneous submissions could both pass the prior existence check. Existing pending-only defaults, admin-note reset, reviewed-at reset, and existing-store check are retained.
- Added regression tests and registered Drizzle journal entry 10.
- CI is pending. Migration is source-controlled only and has NOT been applied to Supabase. No applications or live database rows were changed.


## 2026-11-18 — seller application review integrity

- Added migration `0013_guard_seller_application_review.sql` to prevent direct admin Data API status changes on seller applications; status transitions must pass through the atomic `review_seller_application` RPC.
- The trigger makes submitted application identity/details immutable after submission while allowing review metadata. The RPC serializes approval attempts per applicant, checks for an existing store, then creates the store, seller role, and approved status in one transaction.
- Rejection of demo applications without a user account remains supported.
- Added regression tests and registered Drizzle journal entry 11.
- GitHub Actions run `44267844473` passed lint, strict typecheck, tests, and production build; related test, journal, and docs runs `44267893944`, `44267853320`, and `44267898534` also passed. Migration is source-controlled only and has NOT been applied to Supabase. No seller applications, stores, or live rows were changed.


## 2026-11-18 — suspended seller product image row guard

- Review found that the legacy `product_images` table RLS policy still allowed a seller to write image rows for their own products even when the store was suspended or marked demo, bypassing the active-store restrictions added for product rows and Storage objects.
- Added migration `0014_restrict_suspended_store_image_rows.sql` to require an owned, active, non-demo store for seller image-row writes; admin access is retained.
- The Storage delete policy remains unchanged so owners can clean up their own old files after suspension.
- Added regression coverage and registered Drizzle journal entry 12.
- GitHub Actions runs `44268141074`, `44268146543`, `44268180733`, and `44268187697` passed lint, strict typecheck, tests, and production build. The initial test-only run `44268150720` failed because of a test assertion typo; it was corrected and the subsequent full run passed. Migration is source-controlled only and has NOT been applied to Supabase. No product images or live database rows were changed.


## 2026-11-18 — aggregate order status integrity

- Review found that the admin-only `orders` UPDATE policy still allowed direct updates to the parent order status, bypassing the guarded `order_items` lifecycle and potentially marking an order cancelled without restoring stock.
- Added migration `0015_derive_order_status_from_items.sql`: direct changes to aggregate order status and order snapshot/delivery fields are rejected. The trusted item-status sync trigger temporarily sets the transaction-local internal flag only around its parent-order status update, then restores the previous flag.
- The existing checkout RPC retains its internal update path for initial subtotal/total writes. Item-level cancellation remains disabled until a complete atomic stock-restoration workflow is implemented.
- Added regression tests and registered Drizzle journal entry 13.
- CI is pending. Migration is source-controlled only and has NOT been applied to Supabase. No orders, stock, or live database rows were changed.


## 2026-11-18 — seller order confirmation and lifecycle coverage

- Seller dashboard now asks for confirmation before applying a fulfillment status transition, matching the admin dashboard's confirmation behavior.
- Expanded marketplace rules tests to cover the allowed forward lifecycle and reject skipped, reverse, or cancellation transitions; added a regression assertion that seller actions use a confirmation prompt.
- GitHub Actions run `44270416176` passed lint, strict typecheck, tests, and production build.
- Source changes remain on `allify-recovery-2026-11-17`; no production deploy or live database mutation occurred.

## 2026-11-18 — clearer order status confirmation details

- Admin and Seller order status confirmation prompts now include the order number, product title, and quantity so staff can distinguish individual line items before changing status.
- Regression tests check that both dashboards include the line-item details in the confirmation.
- GitHub Actions run `44271343776` passed lint, typecheck, tests, and production build.
- Changes remain on the recovery branch. No production deployment or live database updates were made.


## 2026-11-18 — seller inventory visibility

- Seller product list now calls out zero-stock items (“স্টক শেষ”) and low stock (5 or fewer, but above zero) so merchants can spot products needing replenishment at a glance.
- Added regression coverage for both labels and the threshold condition.
- Source-only code update on recovery branch; no live inventory was changed and no authenticated browser QA was performed.


## 2026-11-18 — buyer-facing product stock visibility

- Product cards now show an explicit “স্টক শেষ” badge for zero-stock items and “স্টক কম” for stock from one to five. The sold-out add-to-bag control remains disabled and its title now explains why.
- Added regression coverage for both labels and the disabled sold-out action.
- Recovery branch only; no inventory values or live data were modified. Authenticated browser QA remains outstanding.
