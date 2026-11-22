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


## External deployment checks and PR mergeability — 2026-11-22
- On PR head `d42710999b844cf99a411ae4f168845c8321982d`, GitHub Actions build/test run `44978680142` passed and the exact-head Vercel Preview reached READY.
- GitHub check-runs also show two separate Cloudflare Workers Builds failures: service `allify` and service `allifychattogram`. The Cloudflare check summaries expose build IDs, but the detailed dashboard logs are not accessible through the current authorized connector. These failures are distinct from the successful Vercel Preview and GitHub Actions build; do not claim Cloudflare deployment success.
- The Vercel Preview Comments check is successful with no unresolved feedback.
- Raw GitHub PR API reports OPEN, unmerged, `mergeable=true`, `mergeable_state=unstable`. Branch-protection endpoint returned 403 to the integration; repository rulesets query returned an empty list. Whether the Cloudflare checks are required merge gates is therefore unverified. Do not merge.
- PR #3 description was refreshed to show the current code/test evidence, Cloudflare failures and Production release gates.
- No Cloudflare configuration, DNS, deployment target, credentials or secrets were changed.


## Order-transition policy coverage — 2026-11-22 (current run)
- Continued from the verified PR #3 head and preserved all prior work.
- Added `src/lib/order-transitions.ts` as the shared pure policy for item-level order status changes.
- Replaced the duplicated transition guard in both Seller and Admin order-update handlers with the shared policy. This keeps both roles aligned and rejects unsupported direct jumps or changes from terminal states.
- Added `src/test/order-transitions.test.ts`: five permitted transitions and thirteen rejected transitions, including no-op, skipped/backward transitions, terminal-state changes and unknown states.
- Commits: `b8067ea656fb941a45cadab8a3017da94b1a6dce` (policy), `9de6b9f1d85d7b94b68cba0c1590fccda51fd0b4` (tests), `a73fba29970505aa5e15878259eb79c646f67017` (Seller/Admin integration).
- No database, Storage, Supabase configuration, Production deployment, alias, billing or credential changes were made.
- Exact-head CI and Vercel Preview verification for `a73fba29970505aa5e15878259eb79c646f67017` were pending at checkpoint write time; do not treat this commit as verified until both are rechecked.
- Next: confirm exact-head workflow, Vercel Preview and PR check state; then continue repository-only Buyer checkout/accessibility/security tests while Production access and backup gates remain blocked.


### Exact-head verification — shared order transition improvement
- Final code-and-checkpoint commit for this run: `17b8e66168de35547daffa5fcbe2aa267cf3c515`.
- GitHub Actions run `44985528156` completed SUCCESS. Dependency installation, application build and Vitest all succeeded; workflow URL: https://github.com/shihabsami40-allify/allify/actions/runs/44985528156.
- Exact-head Vercel Preview deployment `dpl_AkUq5RrzQWWL2kRkDU9dpXjrUiwj` reached READY for the same commit: https://allify-chattogram-e438e6jdq-allify.vercel.app (Preview only; target is not Production).
- Combined commit status reports Vercel success. PR #3 remains OPEN and unmerged; mergeability was true on recheck.
- These checks validate install/build/tests and Preview build only. They do not replace signed-in Buyer/Seller/Admin E2E or Production verification.


## Checkout accessibility improvement — 2026-11-22 (current run)
- Added explicit accessible names to the Buyer checkout recipient, phone, delivery-area, address, optional-note and save-address controls.
- Checkout success feedback now uses a polite live status region; error feedback uses an alert region; the initial loading message is announced as a status.
- This is a UI-only accessibility improvement. It does not change checkout validation, RPC arguments, order data, schema, or Production configuration.
- Code commit: `c5b066f6b0c64283125c813da98896a7785bc082`.
- Accessibility code commit `c5b066f6b0c64283125c813da98896a7785bc082` was included in final verified PR head `56e770dc051afb987a92294bd40ffaabb6bfe391`; GitHub Actions run `44985640186` passed install/build/Vitest, and exact-head Vercel Preview `dpl_AFMaR3VXNNdsEDP2B59VrSozyjA9` reached READY. The checkpoint-only commit that follows is separately revalidated.


## Seller product numeric validation — continued run
- Added `src/lib/product-input.ts` with a pure validator for product price, optional comparison price and integer stock before the seller product insert.
- Validation uses the same bounds as the existing seller product-update handler: price and optional comparison price must be finite, greater than zero and no more than 100,000,000; stock must be an integer from 0 through 100,000.
- Integrated the validator into the Seller product-create path so invalid values are rejected before any database insert is attempted.
- Added Vitest coverage for valid values, omitted comparison price, zero stock, invalid/empty/non-finite/negative/over-limit prices, fractional/negative/over-limit stock and invalid comparison prices.
- Commits: `17a2f37e8ca2a8a90058dcbf1dce6d8726ef51e5` (validator), `cc2381d704ba881e1de7ed8a8caa1dc64004f94c` (tests), `0ad67bc0ea94fb04eb97631368075aa4954c3147` (Seller integration).
- No database, Storage, Supabase configuration, Production deployment, alias, billing or credential changes were made.
- Exact-head CI and Vercel Preview verification for the code and checkpoint commits is pending and must be rechecked before claiming verification.
- Next: verify exact-head build/tests/Preview, then continue repository-only Buyer/Seller/Admin QA and source-of-truth checks. Production gates remain unchanged.


### Seller product validation — verification result
- Code commit `0ad67bc0ea94fb04eb97631368075aa4954c3147` passed GitHub Actions run `44986014656`: dependency installation, application build and Vitest all SUCCESS. Run: https://github.com/shihabsami40-allify/allify/actions/runs/44986014656.
- Final checkpoint head before this verification note, `254fa3deb7998149f21a3b9c3d664e60b31fcbbc`, has exact-head Vercel Preview READY: https://allify-chattogram-bzhruq6v3-allify.vercel.app. Deployment: `dpl_2tjnbYxdJ8LGM4xoU71Gq8bBtrjR`.
- Exact-head GitHub checks on `254fa3deb7998149f21a3b9c3d664e60b31fcbbc`: build SUCCESS and Vercel Preview Comments SUCCESS.
- PR #3 remains OPEN and unmerged. GitHub reports `mergeable=true` but `mergeable_state=unstable` at the latest check; recheck after all status contexts settle. No merge attempted.
- Preview is not Production. All Production access, backup, source reconciliation and signed-in role-based E2E gates remain NOT CLEARED.


## Product pricing validation refinement — 2026-11-22
- Tightened `validateSellerProductNumbers` so an optional comparison/list price must be strictly greater than the sale price; equal or lower comparison prices are rejected with a Bengali validation message.
- Added Vitest coverage for equal and lower comparison-price cases. Existing checks for invalid/non-finite/over-limit prices and integer stock remain in place.
- Commits: helper `6d864dfe78097e165ff0dbb3b6582cfef3f9bbd9`; tests `279f3e2f72e64b44f13a1c4cad33b137a244a087`.
- Exact-head GitHub Actions run `44986400719` completed SUCCESS: dependency installation, application build and Vitest all passed.
- Exact-head Vercel Preview deployment `dpl_DQA9Ltmzum1eR5ZffhsTz8xEmoA4` reached READY at https://allify-chattogram-jnxnvkvwt-allify.vercel.app (Preview only; target is not Production). Combined Vercel commit status is success.
- PR #3 remains OPEN, unmerged and mergeable. No Production database, Storage, deployment, alias, billing, credential or source-reconciliation action was performed.


## Buyer cart persistence hardening — 2026-11-22 (current run)
- Added `src/lib/cart-validation.ts` with `sanitizeStoredCart` to treat browser localStorage as untrusted input before restoring the Buyer cart.
- The sanitizer drops malformed product snapshots, invalid/non-finite or non-positive prices, invalid stock, invalid quantities, quantities above stock, demo-store products and duplicate product IDs; it caps restored carts at 50 distinct lines.
- Integrated sanitization into the cart restore path and rewrites the localStorage snapshot with only accepted lines. Server-side checkout RPC remains the authoritative price/stock/order validator; this client guard is not a replacement for it.
- Added `src/test/cart-validation.test.ts` for valid lines, malformed payloads, invalid product data, quantity boundaries, demo/duplicate items and the 50-line cap.
- Commits: `1c9e5d91cccd68ad39d94c6780be9db4754ceff0` (sanitizer), `b7032324b5f6783e8b69740f1c0436229a16deb0` (tests), `031e14e5e506b7aa1f3cb16990846d7979f5adbe` and `91abad719fa180d5f9936aceda473a18af0b5139` (Buyer integration/type narrowing).
- Exact-head CI and Preview verification are pending at checkpoint authoring; verify the latest branch head before treating this change as complete.
- No database, Storage, Production deployment/alias, billing, credential or PR-merge operation was performed.


### Buyer cart persistence hardening — exact-head verification
- Final code commits: `1c9e5d91cccd68ad39d94c6780be9db4754ceff0` (sanitizer), `b7032324b5f6783e8b69740f1c0436229a16deb0` (tests), `031e14e5e506b7aa1f3cb16990846d7979f5adbe` and `91abad719fa180d5f9936aceda473a18af0b5139` (integration).
- Final checkpoint head before this verification note: `cfb4bf943c043708f8d0209be58eed9561941e19`.
- GitHub Actions run `44986576387` completed SUCCESS; dependency installation, application build and Vitest all passed: https://github.com/shihabsami40-allify/allify/actions/runs/44986576387.
- Exact-head Vercel Preview deployment `dpl_EffXXhhdZELwyYtGxhbTM4bWQo8Q` reached READY at https://allify-chattogram-92uajq89c-allify.vercel.app (Preview only; Vercel target is not Production). Combined Vercel status is success.
- PR #3 remains OPEN, unmerged and mergeable on the verified head. This is a client-side persisted-cart hygiene layer only; checkout RPC remains authoritative for price, stock and order creation.
- No Production DB/Storage mutation, Production deployment/alias change, PR merge, billing or credential operation was performed.


## Seller product image validation hardening — 2026-11-22
- Reviewed Seller upload flow against Storage migrations `0006`, `0007`, and `0016`. Clarification: the existing object path `user_id/store_id/filename` is compatible with the policy's `storage.foldername(name)` length of 2, because the filename is not counted as a folder. No path/policy change was needed.
- Added `src/lib/product-image-input.ts` to validate supported MIME types (JPEG/PNG/WebP), reject empty/non-finite/invalid sizes, and enforce the 5 MB limit before creating the product/uploading the object.
- Integrated the helper into Seller product creation and added `src/test/product-image-input.test.ts` for supported types, exact size boundary, unsupported formats, empty/invalid sizes and over-limit files.
- This is client-side input validation for usability; Supabase bucket MIME/size configuration and Storage RLS remain the enforcement boundary. MIME metadata can be spoofed by a hostile client, so production must retain server-side/bucket checks.
- Commits: `fef9999e0e2ce898f01b60c283bb0650b2dc8a1d` (helper), `8037890e03909136802b002dd7bddc8dd63b86ba` (tests), `9cccbc2b084ab6d9d2c183e55d8b124e76a34793` (Seller integration).
- Exact-head CI/Preview verification pending; verify latest branch head and checks before release claims.
- No migration, database, Storage object, Production deployment/alias, PR merge, billing or credential operation was performed.

- Exact Seller integration commit `9cccbc2b084ab6d9d2c183e55d8b124e76a34793` GitHub Actions run `44986727233` completed SUCCESS: dependency installation, build and Vitest passed. The image-validation test commit `8037890e03909136802b002dd7bddc8dd63b86ba` run `44986720777` also completed SUCCESS.
- Checkpoint head `a612105d87491af4d9c89c04f82bcee2ff895b03` has a READY Vercel Preview deployment `dpl_GY2Bx92x1N2QQ5EEo6oEMgkZDrTC`: https://allify-chattogram-hyxpnhdye-allify.vercel.app. Preview only, not Production.
- PR #3 remains OPEN, unmerged and mergeable after checks. No Production or database/storage changes were made.


## Seller/Admin stale-write feedback hardening — 2026-11-22
- Reviewed the Seller product update, Admin product moderation, and Admin order-item status update calls.
- Found that Supabase UPDATE requests without selecting affected rows can return no error even when a row no longer matches the expected ID/store/current-status filters. The UI could then optimistically show a successful update that did not happen.
- Updated these paths to request the changed row ID and explicitly handle a zero-row result with a Bengali refresh/retry message. Admin cancellation now also checks the protected RPC's boolean result.
- Existing server-side RLS, triggers and RPCs remain authoritative; this is client-side stale-state/error feedback, not an authorization replacement.
- Commit: `804857b57e267799afa41cb2577df5c5d9c5c092`.
- No database, Storage object, Production deployment/alias, PR merge, billing or credential operation was performed. Exact-head CI/Preview verification pending.


## Seller/Buyer order stale-state feedback — 2026-11-22
- Extended the stale-write audit to Seller order lifecycle actions and Buyer cancellation.
- Seller non-cancellation status updates now require the expected item ID, owning store ID, and previously observed status to match, then select the affected row; a zero-row result is surfaced as a refresh/retry error instead of an optimistic success.
- Seller and Buyer cancellation now both verify the protected `cancel_order_item` RPC returned boolean `true`; an unexpected false/null response is not shown as success.
- The database RPC and RLS/triggers remain authoritative. This is UI feedback hardening only; no database, Storage, Production, or role permissions changed.
- Commit: `5dd404275a093457d7c3c2b897c9e447e8ade084`.
- PR #3 remains open/unmerged. Exact-head CI and Preview verification pending.
- Seller application submission currently has a client-side pending-application guard; the review RPC serializes approval attempts per applicant and rejects an existing store. Do not treat the client-side guard as a database uniqueness guarantee: no server-side unique-pending-application constraint has been verified in the reviewed migration set.

- Exact code commit `5dd404275a093457d7c3c2b897c9e447e8ade084` passed GitHub Actions run `44989403324`; checkpoint head `923f4cca5506ac9119c06ff39b58424fff386dec` passed run `44989413839` (dependency install, application build and Vitest SUCCESS).
- Exact checkpoint-head Vercel Preview deployment `dpl_7dzo65AW73KkS24UcQk2mt8dkaci` reached READY at https://allify-chattogram-80qbrvkjl-allify.vercel.app (Preview only; target is not Production). PR #3 remains OPEN and unmerged.
- Separate Cloudflare Workers Builds checks on the prior exact head `6b748a02698144104c31bc19858ae83094d9bba2` were still failing for services `allify` and `allifychattogram`; current head check runs must be inspected independently. Do not infer Cloudflare deployment success from Vercel.

## Database-enforced pending seller-application uniqueness — 2026-11-22
- Added migration `0028_one_pending_seller_application_per_user.sql` with a partial unique index on `seller_applications(user_id)` for non-null users whose application status is `pending`. This closes concurrent duplicate-submit races that the existing client-side check cannot prevent.
- Migration deliberately performs a preflight duplicate check and raises an exception instead of deleting, merging, or silently rejecting legacy rows. If legacy duplicate pending rows exist, an authorized administrator must explicitly review them before migration can proceed.
- Added `src/lib/seller-application-error.ts` and tests to map PostgreSQL unique-violation code `23505` to clear Bengali pending-application feedback; integrated this into the Seller application submit flow.
- Commits: `0ea624db475e0a0af3f05907bc09379ebb5fe398` (migration), `94803255c2e37faac86116e4d4cc53a654012cad` (error mapper), `0f7c25bd4264c3fcff5ceb748f80cdf8d110acae` (tests), `7954b6e009103d3c98a6291e7d91e900cf6dfe1e` (integration).
- Important: migration is committed to the PR only. It has NOT been applied to Production or any database. Production DB read access and verified restorable backup remain prerequisites for preflight/application.
- Cloudflare audit clarification: the two Workers Builds failures observed in check-runs belong to old commit `6b748a02698144104c31bc19858ae83094d9bba2`; their check summaries expose build IDs/service names but no diagnostic log text through the available GitHub response. The checked-in Cloudflare deploy workflow runs on pushes to `main` or manual dispatch, not on this PR branch. Do not represent those historical failures as current PR-head build failures; detailed Cloudflare logs still require authorized dashboard access.
- Current PR branch continues to use Vercel Preview plus GitHub CI as verification; no Cloudflare deploy, Production mutation, PR merge, or credential change was performed.

## Admin seller-application review decision hardening — 2026-11-22
- Review of migration `0014_guard_seller_application_review.sql` found that `p_approve IS NULL` was not rejected explicitly. In PL/pgSQL, `IF NOT p_approve` does not enter the rejection branch for NULL, so an undefined decision could fall through into the approval path.
- Added migration `0029_require_explicit_seller_review_decision.sql` to reject NULL decisions at the database boundary while preserving Admin authorization, per-applicant advisory locking, existing-store check, atomic store/role/application updates, and explicit EXECUTE grants.
- Admin UI now also verifies that the approval RPC returns a non-empty store UUID before showing approval success. Rejection continues to expect a successful null result.
- Commit: `62efaec95ae4fe74ad5b076ab749b6e701abd163` (SQL guard); `960b89543d37b1476a617cf3075ab086afb71161` (UI result verification).
- Migration is committed to PR branch only; it has NOT been applied to any database. Production access/backup prerequisites remain unchanged.
- Validation scope: source-level review only until the migration is applied in an authorized isolated test database and exercised with Admin/non-Admin, true/false/NULL decisions, concurrent approvals, existing-store applicants, and already-reviewed applications.

## Seller application status visibility and lifecycle QA — 2026-11-22
- Audited the initial schema and migrations `0010`, `0012`, `0015`, `0016`, and Storage migrations `0006`–`0008`.
- Confirmed in source that `seller_stores_owner_unique` enforces one non-null owner per store; application insert trigger forces pending status/clears admin review fields, serializes per-user submissions, rejects an existing pending application or existing store; application review RPC adds Seller role and creates the store in one transaction; store update trigger protects ownership, status, demo flag, rating and slug; suspended/non-demo checks protect product and product-image table writes; Storage upload/update requires an active non-demo owned store.
- Intentional policy distinction: product image object deletion remains allowed for the owner after suspension so old objects can be cleaned up. This is not upload/update permission.
- Found a Seller UX gap: after successful submission, the applicant did not immediately see the newly created pending record in local state, and the Seller landing page continued to show the application form rather than a clear review-pending state.
- Updated submission to request and verify the inserted application row, add it to local state, and show a pending-review notice instead of a duplicate submission form. Rejected applications can still reapply; approved users see their store dashboard when the store data is available.
- Commit: `12ab527731ff8601d54629cc1291870ca3c6cc2b`.
- This is source/migration review and UI behavior hardening, not a live database test. Migrations `0028` and `0029` remain unapplied; no database or Storage changes were made.
