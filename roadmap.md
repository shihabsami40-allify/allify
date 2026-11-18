# ALLIFY MVP launch checklist

## Completed
- [x] Recovered project source into a protected recovery branch; main remains unchanged.
- [x] Public routes and demo buyer/seller/admin views are implemented.
- [x] Authenticated COD checkout and customer order history code are implemented.
- [x] CI lint, strict TypeScript, tests, and production build pass on the recovery branch.

## Not yet launch-ready
- [x] Added fallback SVG for missing product images and restored the ALLIFY SVG favicon.
- [x] Public catalog hides products belonging to suspended stores.
- [x] Cart stock-limit feedback and individual removal of unavailable products corrected.
- [x] Product-detail and product-card add-to-cart enforce existing stock and the 99-item cap.
- [x] Checkout and seller/admin status changes invalidate customer order-history cache.
- [x] Seller/admin app-layer cancellation actions are blocked pending a safe database stock-restoration implementation; regression test passes.
- [x] Latest documentation updates passed CI: runs 44238653991 and 44238657856.
- [ ] Restore remaining original catalog/hero image assets.
- [x] Reconnected the existing Vercel project `allify-chattogram` to `shihabsami40-allify/allify` (no duplicate project created).
- [x] Created a Vercel Preview deployment from `allify-recovery-2026-11-17` at commit `225c619da50be292bf008d89ed028a45abb6632b`; Vercel build completed and deployment state is `READY`.
- [ ] Complete authenticated browser QA of the Preview. Vercel project SSO protection is enabled for non-custom domains, and no runtime requests/logs have yet confirmed an app session. Do not disable protection merely to bypass QA.
- [ ] Test buyer/seller/admin flows with real authenticated test accounts.
- [ ] Validate COD checkout, stock decrement, cancellation/restoration, and status transitions using controlled test inventory. The existing database trigger still permits direct cancellation updates and the recovered database functions have no stock-restoration logic; treat this as a launch blocker until a reviewed, atomic, idempotent database migration closes the API bypass and restores inventory safely. Do not test against live inventory.
- [ ] Review security and permissions in a test environment.
- [ ] Verify the preview on desktop and mobile in an authorized session; build success alone does not confirm application runtime behavior.
- [ ] Only then review/merge recovery changes and release to production.
- [ ] Configure online payments later; current checkout is COD-only.

## Initial admin setup
- [ ] Create the first owner admin role through a safe one-time process after owner account signup; do not grant admin to arbitrary users.
