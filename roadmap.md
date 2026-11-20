# ALLIFY MVP launch checklist

## Completed
- [x] Recovered project source into a protected recovery branch; main remains unchanged.
- [x] Public routes and demo buyer/seller/admin views are implemented.
- [x] Authenticated COD checkout and customer order history code are implemented.
- [x] CI lint, strict TypeScript, tests, and production build pass on the recovery branch (latest full run is being rechecked after migration 0018).

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
- [x] Test-environment anonymous helper permissions reviewed and restricted; public catalog access preserved.\n- [x] Test-environment RLS auth evaluation optimized and three uncovered foreign-key indexes added.\n- [x] Test-project multiple-permissive-policy review completed; categories, delivery areas, and product-images now each have a single SELECT policy.\n- [x] Scope the exposed has_role helper to auth.uid() to prevent cross-account role probing (migration 0022, isolated test project).\n- [ ] Finish end-to-end authenticated SECURITY DEFINER RPC authorization tests.
- [x] Remove duplicate BEFORE UPDATE guard trigger on order_items (migration 0023; isolated test project).\n- [x] Remove duplicate permissive legacy Storage upload/delete policies in the isolated test project (migration 0020).
- [ ] Verify the preview on desktop and mobile in an authorized session; build success alone does not confirm application runtime behavior.
- [ ] Only then review/merge recovery changes and release to production.
- [ ] Configure online payments later; current checkout is COD-only.

## Initial admin setup
- [ ] Create the first owner admin role through a safe one-time process after owner account signup; do not grant admin to arbitrary users.


## Recovery branch hardening — 2026-11-20
- Added migration 0019 to split overlapping admin/owner write policies from public SELECT policies. Test-project Performance Advisor no longer reports multiple-permissive-policy warnings.\n- Added migration 0017 to restrict anonymous execution of four internal SECURITY DEFINER helpers while retaining authenticated policy access and public catalog reads.
- Added migration 0018 to optimize auth.uid() evaluation in RLS and add three missing FK indexes. Test-project Performance Advisor no longer reports auth RLS init-plan or unindexed-FK findings.
- Removed duplicate ALLIFY checks workflow; the consolidated ci.yml workflow covers both main and recovery branch.
- Production, main, and the authoritative legacy database remain untouched. Browser QA, real buyer/seller/admin accounts, original catalog image recovery, backup/restore rehearsal, and legacy-schema migration compatibility remain outstanding.
