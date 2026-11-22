# ALLIFY — Project Checkpoint
Updated: 2026-11-22

## Product scope
- Bengali-first multi-vendor marketplace for Chattogram district, Bangladesh.
- Free seller onboarding at launch; buyer catalog, cart, authenticated COD checkout, order history/cancellation, seller dashboard, admin moderation, local delivery and BDT.
- Keep initial release focused on essential buyer/seller workflows. Defer nonessential polish.

## Repository and release candidate
- Repository: `shihabsami40-allify/allify`
- Candidate branch: `allify-order-lifecycle-2026-11-20`
- PR #3: https://github.com/shihabsami40-allify/allify/pull/3
- PR state at this checkpoint: OPEN, mergeable, not merged.
- Code/test commit verified in this run: `1ed8d8ac791a5c11be92160e37685e381928ce2e`
- PR contained 86 commits and 29 changed files at live recheck.
- Production branch remains `main`; do not merge or deploy without release gates.

## Work completed in this run
- Extracted the parent-order status derivation from `src/routes/$page.tsx` into pure helper `src/lib/order-status.ts`.
- Kept the existing lifecycle priority: pending, confirmed, shipped, delivered; an order becomes cancelled only when all items are cancelled; empty or unexpected states safely fall back to pending.
- Added `src/test/order-status.test.ts` with seven Vitest cases covering empty orders, all-cancelled orders, mixed-status precedence, delivered/cancelled mixtures and unknown states.
- The UI now imports the shared helper. This is a testability/refactoring improvement; it does not change database schema or Production data.

## Exact-head verification for the code/test commit
- GitHub Actions run `44978458542` completed SUCCESS for commit `1ed8d8ac791a5c11be92160e37685e381928ce2e`.
- Verified job steps: dependency installation, application build and Vitest all succeeded.
- Vercel Preview deployment `dpl_9ECtwwLDNS3fQjowSUrvvRHDooQG` reached READY for the same commit.
- Preview URL: https://allify-chattogram-3izqsf6h0-allify.vercel.app
- Combined commit status reports Vercel success.
- Preview READY and CI success are build/test evidence only. Signed-in Buyer/Seller/Admin browser E2E and real backend integration remain unverified.

## Production and backend safety gates
- Production Vercel deployment remains READY on `main`, commit `6f3ba9e768de476ac9a2d89eda5b523087e8f760`; Production alias remains https://allify-chattogram.vercel.app.
- No Production deployment, alias, environment variable, database, Storage object or PR merge was changed in this run.
- The app-configured Production Supabase ref is `htsvvotamlxlkncksssq`. A fresh read-only `get_project` attempt returned permission denied.
- The connected Supabase account still lists only `onqadpqdontbdvecnvby` (legacy Allify) and `ltwobqpgxmkeylmpkogq` (allify-test). Neither is the configured Production backend; do not substitute them.
- No verified full Production database backup, separate Storage-object export or restore rehearsal is available. No Production write/migration is permitted until project identity, owner-authorized access and restorable backup are all verified.
- Lovable project `123f5b35-4f29-4afa-8018-2e20465d2648` remains published at snapshot `24740138edea698f794c036b3b126c274fed3d6c`, but its agent status is `needs_attention / out_of_credits` and workspace plan is Free. No Lovable source mutation was attempted.
- Lovable published source and GitHub candidate source remain materially different. Lovable checkout is demo-only; GitHub candidate implements authenticated RPC checkout. Do not copy one source tree over the other without a deliberate reconciliation.

## Isolated test database observations
- `allify-test` remains the only connected isolated test project; its migration history includes the order lifecycle, buyer cancellation, idempotent checkout and privilege-hardening work. These results do not prove Production compatibility.
- Latest Security Advisor read reports seven authenticated-callable SECURITY DEFINER functions (including checkout, cancellation, seller-review and RLS helpers). This warning requires function-by-function authorization review; it is not, by itself, proof of anonymous access. Do not revoke needed RPC access blindly.
- Performance Advisor reports four unused-index informational findings. Do not drop indexes without workload evidence.
- No test or Production database writes were made in this run.

## Remaining work — priority order
1. Obtain owner-authorized read access to the exact configured Production Supabase project and verify its identity.
2. Obtain a complete restorable Production database backup and separate Storage-object export; verify recovery by a restore rehearsal.
3. Run fresh read-only Production schema, migration-history, RLS, function-definition, trigger, Storage and grant preflight.
4. Reconcile Lovable/GitHub source-of-truth and confirm which published application is intended for launch.
5. Run signed-in Buyer, Seller and Admin end-to-end tests against a safe test backend, including real COD checkout, order cancellation/stock restoration, seller application review and product image upload.
6. Only after every gate is satisfied, request explicit approval for Production migration, PR merge and deployment.

## User action required
- No action is needed for the completed code/test improvement.
- Release work remains blocked until the project owner restores authorized access to `htsvvotamlxlkncksssq` and supplies/verifies a restorable Production DB plus Storage backup. Do not request credentials in chat; use the platform's authorized access controls.

## Next run
- Start from the latest branch/checkpoint; recheck PR head, CI and Preview.
- Continue independent repository-only QA and tests while Production access/backup gates remain blocked.


## Security function and privilege review — 2026-11-22
- Performed read-only SQL inspection on isolated `allify-test` for the seven Security Advisor flagged RPC/helper functions and both `place_order` overloads.
- The seven intended authenticated-callable functions are `cancel_order_item`, `has_role`, `is_my_order`, `order_has_my_store`, `owns_store`, the eight-argument idempotent `place_order`, and `review_seller_application`.
- For those seven functions, effective privileges are `authenticated EXECUTE=true`, `anon EXECUTE=false`, and `PUBLIC EXECUTE=false`; each has a fixed `search_path=public`.
- The legacy seven-argument `place_order` overload remains present but has `authenticated EXECUTE=false`, `anon EXECUTE=false`, and `PUBLIC EXECUTE=false`.
- Function-body review confirmed: `has_role` binds the supplied user ID to `auth.uid()`; store/order helper functions scope lookups to `auth.uid()`; `cancel_order_item` checks signed-in identity and buyer/store-owner/admin authorization; `place_order` requires `auth.uid()`; `review_seller_application` requires the admin role.
- The Advisor warning is caused by these SECURITY DEFINER functions being callable by signed-in users; the read-only test-project grant check did not find anon or PUBLIC EXECUTE on them. Keep the warning visible and re-review if any function body/grant changes; do not blindly revoke required application RPCs.
- These findings apply only to `allify-test`, not the inaccessible configured Production database. No SQL, grant, schema or data change was made.
- The Performance Advisor still reports four unused-index informational findings; no index was dropped.
