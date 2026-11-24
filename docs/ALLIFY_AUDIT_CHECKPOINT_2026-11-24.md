# ALLIFY audit checkpoint — 2026-11-24 (reconciled)

Updated: 2026-11-24

## Purpose
This note consolidates the current verified state so completed work is not repeated. It supplements (does not replace) earlier dated checkpoints. Read the live PR, branch head, deployments and Supabase project state again before any future change.

## Repository and deployments — verified 2026-11-24
- Repository: `shihabsami40-allify/allify`.
- Candidate branch: `allify-order-lifecycle-2026-11-20`.
- PR #3: OPEN, unmerged, GitHub reports mergeable. Do not infer release approval from mergeability.
- Candidate head at audit: `0db21cbfbeffd692b21bf8846dfbd43ad2e0a173`.
- Exact-head GitHub Actions run `45315437464`: completed SUCCESS.
- Exact-head Vercel Preview: READY, `https://allify-chattogram-jisrtxveu-allify.vercel.app`, deployment `dpl_1LyNxwUCsV9Gy9urHX6q9TzXXsDh`. Preview only.
- Current Vercel Production deployment: READY on `main`, commit `6f3ba9e768de476ac9a2d89eda5b523087e8f760`, deployment `dpl_6Lw476BEvQS6yU1uh4AMv1eSMUWh`, domain `https://allify-chattogram.vercel.app`.
- Two Cloudflare Workers Builds checks failed on the earlier verified candidate head recorded in the 2026-11-24 checkpoint. No current-head Cloudflare success is asserted; dashboard build logs are not accessible via the connected tools.
- Latest PR file inventory includes the checkout/order lifecycle, cart validation, seller product/store/image validation, seller application error handling, order transition/status helpers and tests, security migrations, and the reviewed release SQL bundle. Do not recreate these features/tests without first checking the existing files.

## Supabase projects — current read-only observations
### Connected project named Allify
- Ref: `onqadpqdontbdvecnvby`; status ACTIVE_HEALTHY; region ap-south-1.
- Public schema has exactly 6 tables: profiles, categories, stores, products, orders, order_items. RLS enabled on all 6.
- Migration history returned empty.
- Security advisor reports 4 public SECURITY DEFINER functions callable by anon and 4 callable by authenticated: is_admin, lookup_order, owns_store, place_marketplace_order. Treat these as review findings; do not blindly revoke because some legacy checkout behavior may depend on them.
- This connected project is NOT the configured Production ref. Do not silently substitute it for Production.

### Isolated project named allify-test
- Ref: `ltwobqpgxmkeylmpkogq`; status ACTIVE_HEALTHY; region ap-south-1.
- Public schema has 13 tables: profiles, user_roles, categories, delivery_areas, seller_applications, seller_stores, products, product_images, carts, cart_items, addresses, orders, order_items. RLS enabled on all 13.
- Migration history has 34 entries, through `0029_require_explicit_seller_review_decision` (including the named buyer cancellation/idempotency migrations).
- This is a populated test database, not Production. Current sample/test rows exist; do not treat them as customer data or migrate blindly.
- Security advisor reports 7 authenticated-callable SECURITY DEFINER functions (anon is not reported for these) and leaked-password protection disabled. Review function intent and Auth setting before any release; do not indiscriminately revoke authenticated RPCs required by the app.

### Configured Production backend
- Vercel Production `VITE_SUPABASE_URL` was previously verified to point to `https://htsvvotamlxlkncksssq.supabase.co`.
- Exact Supabase project lookup for `htsvvotamlxlkncksssq` remains permission-denied through the connected Supabase tool. The user can open the dashboard in a browser, but that does not grant this integration database access.
- Do not replace this ref with either connected project unless an explicit, verified owner decision is made after schema/data/backup review.

## Completed work — do not repeat without a failing verification
- Candidate code includes idempotent COD checkout, order cancellation/stock restoration and parent-order status synchronization, buyer cart/product demo purchase guards, strict seller product input validation for create/edit, image path validation and safer failed-create cleanup, seller application protections, shared seller/admin order-transition rules, and associated Vitest regression coverage.
- Candidate CI currently passes at exact head and exact-head Vercel Preview is READY.
- Production Vercel deployment is already published on main.
- Read-only project/table/migration/security checks above have been completed in this audit.
- No Production DB or Storage mutation, backup/restore, Production alias change, PR merge, credential operation, or billing change was performed.

## Remaining release gates
1. Obtain authorized read-only access to the exact configured Production project `htsvvotamlxlkncksssq`.
2. Produce and verify a restorable full Production database backup AND a separate Storage-object export; rehearse restore or otherwise prove recoverability.
3. Perform read-only Production schema, RLS, grants, RPC, Storage and data preflight against the actual Production project.
4. Reconcile GitHub candidate source with the materially different Lovable-published source; do not overwrite either automatically.
5. Complete signed-in Buyer, Seller and Admin end-to-end tests, including mixed-vendor checkout and order cancellation/stock restoration.
6. Diagnose Cloudflare failures if Cloudflare remains an intended deployment target.
7. Only after all gates pass, review and authorize migration, PR merge and Production release.

## Safety rules
- No destructive migration, schema rewrite, project substitution, PR merge, or Production promotion without explicit authorization and verified backups.
- Never request or place passwords, service-role keys, secret keys or access tokens in chat.
- Before any task, inspect this note plus the live PR, branch head, CI, deployments and project state; mark already-verified work complete and continue only from the first unresolved gate.
