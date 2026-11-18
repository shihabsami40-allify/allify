# ALLIFY MVP launch checklist

## Completed
- [x] Recovered project source into a protected recovery branch; main remains unchanged.
- [x] Public routes and demo buyer/seller/admin views are implemented.
- [x] Authenticated COD checkout and customer order history code are implemented.
- [x] CI lint, tests (16), and production build passed on recovery branch.

## Not yet launch-ready
- [x] Added a fallback SVG for missing product images and restored the ALLIFY SVG favicon.
- [ ] Restore remaining original catalog/hero image assets.
- [ ] Test buyer/seller/admin flows with real authenticated test accounts.
- [ ] Validate COD checkout, stock decrement, cancellation/restoration, and status transitions using controlled test inventory.
- [ ] Review security and permissions in a test environment.
- [ ] Verify a preview deployment and confirm it works on desktop and mobile.
- [ ] Only then review/merge recovery changes and release to production.
- [ ] Configure online payments later; current checkout is COD-only.

## Initial admin setup
- [ ] Create the first owner admin role through a safe one-time process after owner account signup; do not grant admin to arbitrary users.
