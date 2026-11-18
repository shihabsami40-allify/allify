# ALLIFY MVP launch checklist

## Completed
- [x] Recovered project source into a protected recovery branch; main remains unchanged.
- [x] Public routes and demo buyer/seller/admin views are implemented.
- [x] Authenticated COD checkout and customer order history code are implemented.
- [x] CI lint, strict TypeScript, 20 tests, and production build passed on recovery branch (latest fixes included).

## Not yet launch-ready
- [x] Added fallback SVG for missing product images and restored the ALLIFY SVG favicon.
- [x] Public catalog hides products belonging to suspended stores.
- [x] Cart stock-limit feedback and individual removal of unavailable products corrected.
- [x] Checkout and seller/admin status changes invalidate customer order-history cache.
- [x] Latest changes passed lint, strict TypeScript, tests, and production build in CI.
- [ ] Restore remaining original catalog/hero image assets.
- [ ] Test buyer/seller/admin flows with real authenticated test accounts.
- [ ] Validate COD checkout, stock decrement, cancellation/restoration, and status transitions using controlled test inventory. Cancellation stock-restoration behavior is not yet verified; do not test against live inventory.
- [ ] Review security and permissions in a test environment.
- [ ] Verify a preview deployment and confirm it works on desktop and mobile.
- [ ] Only then review/merge recovery changes and release to production.
- [ ] Configure online payments later; current checkout is COD-only.

## Initial admin setup
- [ ] Create the first owner admin role through a safe one-time process after owner account signup; do not grant admin to arbitrary users.
