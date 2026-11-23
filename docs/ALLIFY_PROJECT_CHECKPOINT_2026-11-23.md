# ALLIFY — Run Checkpoint
Updated: 2026-11-23

## Repository state at checkpoint
- Repository: shihabsami40-allify/allify
- Candidate branch: allify-order-lifecycle-2026-11-20
- PR #3: OPEN, unmerged. Current head at checkpoint creation: 8a89764738c8b288b843946fafaa0ca657d96303.
- Production base remains main at 6f3ba9e768de476ac9a2d89eda5b523087e8f760.
- PR mergeability was true after the latest commit; no merge was attempted.

## Work performed in this run
- Added a regression test to src/test/cart-validation.test.ts proving product IDs are deduplicated after whitespace normalization. The sanitizer trims IDs before checking the seen-ID set; this test prevents a future regression where whitespace variants could enter the same stored cart.
- First test commit 09b5889551856cfe117581def148186e7e4b4e36 exposed a Prettier formatting error caused by an extra blank line before the new test. The first formatting-only follow-up 8a89764738c8b288b843946fafaa0ca657d96303 did not remove the correct blank line and its CI still failed. Read the second exact job log, removed the extra blank line, and committed the actual fix as ba399ab12fa3397d119ee823a1124f777656989f.
- No runtime application behavior or database schema was changed.

## Verification at checkpoint creation
- First commit CI run 45105441053 failed only at the focused ESLint/Prettier step (one trailing blank-line error); application build and Vitest were skipped. The issue was corrected in the next commit.
- The intermediate commit 8a89764738c8b288b843946fafaa0ca657d96303 failed the same Prettier rule; run 45105505365 is FAILURE, and its logs confirmed the same extra blank line.
- Final formatting correction commit ba399ab12fa3397d119ee823a1124f777656989f: no GitHub Actions build check had appeared yet at the last query; verify before treating it as passing. Its exact-head Vercel Preview deployment dpl_7FX4KBXEpJK4yVvv2RPEh292hf9X was still BUILDING at last check.
- Vercel Preview Comments check for the corrected commit completed SUCCESS with zero unresolved comments.
- Cloudflare Workers Builds check for the previous test commit 09b5889551856cfe117581def148186e7e4b4e36 was IN_PROGRESS; its dashboard logs are not available through the current connector. No Cloudflare readiness claim is made for the corrected commit.

## Safety and release gates
- No Production database or Storage write, migration, backup/restore, Production deployment/alias change, PR merge, billing change, credential/secret operation, or external customer/vendor contact occurred.
- Configured Production Supabase ref remains htsvvotamlxlkncksssq; authorized read access is blocked. Do not substitute another Supabase project.
- No verified restorable Production database backup, separate Storage-object export, or restore rehearsal is available.
- Lovable-published source remains materially different from the GitHub candidate; do not overwrite either source automatically.
- Signed-in Buyer/Seller/Admin end-to-end tests, mixed-vendor checkout transaction tests, Production read-only schema/RLS/grant preflight, source reconciliation, and Cloudflare failure-log diagnosis remain outstanding.

## Next safe actions
1. Verify corrected commit CI and exact-head Vercel Preview.
2. If either check fails, inspect its logs and fix only the demonstrated issue on this branch.
3. Continue repository-only Buyer/Seller/Admin workflow regression review and accessibility/security tests.
4. Keep Production changes, PR merge, and release blocked until exact Production identity/access, verified DB + Storage backups, source reconciliation, security preflight, and role-based E2E gates are satisfied.


## Follow-up correction — 2026-11-23
- Re-read the exact failed CI log rather than assuming the first whitespace correction worked. The error at cart-validation.test.ts line 79 was an extra blank line between tests, not the file-ending newline.
- Removed that extra blank line in commit `ba399ab12fa3397d119ee823a1124f777656989f`. This is the current candidate head at the time of this checkpoint update.
- Exact-head Vercel Preview is still BUILDING; GitHub Actions check-runs for this latest commit have not yet exposed a build job. Do not claim success until the checks complete.
- PR #3 is OPEN and unmerged. No Production or external irreversible action occurred.


## Additional run — 2026-11-23 (order-status regression)
- Re-verified PR #3 and the candidate branch before continuing. PR #3 remains OPEN and unmerged; current head is `bb67515f1da8db532af2901c4ad1d202223c791e`.
- Added a focused Vitest case in `src/test/order-status.test.ts`: an unexpected item status must not mask a recognized `delivered` item when deriving the parent order status. The existing implementation already handles this correctly; the new test locks that behavior in.
- Commit: `bb67515f1da8db532af2901c4ad1d202223c791e` (`test: cover unknown order status alongside valid items`). No production code, database schema, or data changed.
- Exact-head GitHub Actions run `45105706159` was IN_PROGRESS at checkpoint update; dependency installation was still running, with lint/build/Vitest pending. Verify final conclusion before claiming CI pass.
- Exact-head Vercel Preview deployment `dpl_7gytkYrP8E9C2yjvjSueXba5Y3Si` was BUILDING at checkpoint update: https://allify-chattogram-9vt5hmrf2-allify.vercel.app. Verify READY before claiming deployment success.
- PR #3 currently reports `mergeable=false` after the new commit; this is a temporary or unresolved GitHub mergeability result and must be investigated before any future merge decision. No merge was attempted.
- The prior exact-head commit `e903abc75cf880f7b01925590d875453d06ad911` had successful GitHub Actions run `45105602813`, including install, ESLint, application build, and Vitest.
- Production Supabase access, verified DB + Storage backups, Lovable/GitHub source reconciliation, role-based signed-in E2E, and Cloudflare diagnosis remain blocked/outstanding as above. No Production action, merge, credential, billing, or external contact occurred.

## Additional run — 2026-11-23 (home-page demo purchase guard)
- Re-verified PR #3 before editing. PR remains OPEN, unmerged, and mergeable; branch head before this run was `7928d1d3811a83d5586bb6015cc755860c049af9`.
- Confirmed the exact `7928d1d...` commit's GitHub Actions run `45105739282` completed SUCCESS and its exact-head Vercel Preview `dpl_Edy2kgrb4CAFQw6jQF3z56db4pwA` is READY at https://allify-chattogram-lzjqzenwl-allify.vercel.app (Preview only).
- Found a buyer UX inconsistency: the homepage product-card handler allowed a demo-store product to be written into localStorage, although the shared cart sanitizer and checkout already reject demo products. Added shared `canPurchaseProduct` guard, unit tests for real/demo/out-of-stock cases, and applied the guard to homepage button state and click handler.
- Commits (same branch, in order): `b0eae945f42825d661d452a0f3bd650832857563` (shared guard), `ec3a88c457cbac27c80cd344ce085228c9a0a861` (tests), `55bedba421ad06a68eba93e772d1e29ab38d0e29` (homepage integration).
- No database, Storage, Production code, or customer data changed.
- At checkpoint update, latest-head GitHub Actions build check for `55bedba...` was QUEUED (run link https://github.com/shihabsami40-allify/allify/actions/runs/45105916232); Vercel Preview deployment `dpl_EFJi9vzT173qpiyfsUPfkxAg4xoU` was QUEUED. Recheck before claiming either passed/ready.
- PR #3 current head is `55bedba...`, OPEN and unmerged. Keep merge blocked until production identity/access, restorable DB + Storage backups, source reconciliation, security preflight and signed-in Buyer/Seller/Admin E2E gates are cleared.

## Lint correction — 2026-11-23
- Exact CI log for run `45105916232` identified only Prettier formatting issues: leading blank line and wrapped return expression in `src/lib/cart-validation.ts`, plus one extra trailing blank line in `src/test/cart-validation.test.ts`. No application build or test failure had occurred; those steps were skipped after lint failed.
- Applied formatting-only corrections in commits `72e0326d0170eb63c30b990741e23e9828c86802` and `083004adf99f3b8ca3b113be0f8081ff69647e52` (replace with actual commit SHAs immediately below).
- Follow-up CI run `45105998111` isolated one remaining Prettier issue: two blank lines between the cart sanitizer and purchase-guard describe blocks. Removed the extra separator in commit `e0e7f4a7fdbd5f69a189b1553d6b9ce31ba1770b`; re-run CI before marking the change verified.

## Final verification — 2026-11-23
- Corrected candidate code/test commit `e0e7f4a7fdbd5f69a189b1553d6b9ce31ba1770b` is covered by GitHub Actions run `45106044246`, completed SUCCESS: ESLint, application build, and Vitest all passed. Link: https://github.com/shihabsami40-allify/allify/actions/runs/45106044246
- Exact current PR head at verification: `8cc9e8ed4c5ffdc1e2888bf28ce576bd46beb632`, which only updates this checkpoint after the verified code commit. PR #3 remains OPEN, unmerged, mergeable.
- Exact-head Vercel Preview deployment `dpl_BVEpfMRb3SqPyLSCrPyBDxYjbnG8` is READY: https://allify-chattogram-c0ibyvs8q-allify.vercel.app (Preview only).
- The demo-product homepage guard, its three focused tests, and formatting correction are included in the verified code. No Production database, Storage, alias, or customer data was changed.

## Seller product-input hardening — 2026-11-23
- Re-verified PR #3 and current branch before work. The prior candidate code commit `e0e7f4a7fdbd5f69a189b1553d6b9ce31ba1770b` had passing CI and a READY Preview; latest PR head was the checkpoint-only commit `ae63a3644f99e9bdd2a7a68df2c32205eac2b153`.
- Reviewed seller product creation and update validation. Found `Number(value)` would coerce booleans and arrays into numbers (e.g. `true` -> 1), which is inappropriate for price/stock input validation.
- Updated `src/lib/product-input.ts` to accept only number or non-empty string inputs for price, stock and comparison price, retaining existing numeric range/integer checks. Added regression cases in `src/test/product-input.test.ts` for boolean/array/object inputs.
- Commits: `5ed4d1b66a4c106fc0087db5b249902ddc06c8d7` (validation hardening), `895cc1a57b764d166f407e70848763e50c9b08d7` (tests).
- Exact-head GitHub Actions run `45119291176` completed SUCCESS, including dependency install, ESLint, app build and Vitest: https://github.com/shihabsami40-allify/allify/actions/runs/45119291176
- Exact-head Vercel Preview deployment `dpl_AUfaQqJRVrsaFaR33EKjsrqejbTV` is READY: https://allify-chattogram-9odjpejvp-allify.vercel.app (Preview only).
- PR #3 remains OPEN, unmerged and mergeable at head `895cc1a...`. No Production DB/Storage or deployment changes occurred.
- Production release gates remain unresolved: configured Production Supabase access denied; no verified restorable DB+Storage backup; Lovable/GitHub source divergence; role-based signed-in Buyer/Seller/Admin E2E and Production read-only security preflight outstanding.

## Seller product edit validation — 2026-11-23
- Re-verified branch and PR #3 before work: latest head `b9623db97f6e45ab98a4384cbe20181d3ce66fb7`, PR OPEN, unmerged, mergeable.
- Reviewed `updateSellerProduct` and found it used direct `Number(value)` coercion for seller edits, unlike the stricter product-creation validator. Boolean values could be coerced to numeric values.
- Updated seller edit handling to reuse `validateSellerProductNumbers` for price and stock changes, retaining allowed-field checks and store-scoped database update.
- Commit: `a0516aefe612670d5b8cd4933dadf30536595c99` (`fix: reuse strict numeric validation for seller edits`).
- Exact-head GitHub Actions run `45119438228` was IN_PROGRESS at checkpoint time (dependency installation running; ESLint/build/Vitest pending): https://github.com/shihabsami40-allify/allify/actions/runs/45119438228. Do not mark verified until it completes successfully.
- Exact-head Vercel Preview `dpl_BcwJCHQnJHGbQCFnrR6KmNBD9VQZ` was BUILDING at checkpoint time: https://allify-chattogram-nfwvylrgq-allify.vercel.app. Preview only; verify READY before claiming deployment success.
- No Production DB/Storage, credentials, production alias, or customer data were changed.

## Seller product-image Storage path hardening — 2026-11-23
- Re-verified PR #3 before changes: prior head `975f7a308fe831648206272a1e5737c35efd46a7`, OPEN and unmerged. Reviewed seller upload path construction against Storage RLS policies in migrations `0006`–`0009` and `0016`.
- Added `buildSellerProductImagePath` to centralize the required `user_id/store_id/file` path layout, reject empty or slash-containing path segments, reject unsupported MIME types and invalid timestamps, and map the three accepted MIME types to explicit extensions.
- Updated seller product creation to use the helper and fail safely if path construction is invalid. Added tests for all supported MIME types, RLS-compatible folder structure, path-segment rejection, unsupported MIME and invalid timestamp.
- Commits: `e32ca7810304a7a5a3cbb205ee8b0acae8e6280b` (helper), `1fc45c2df24e716ad60ce36d1ca68be80c2fdd1e` (tests), `3d6f314b387dabcc3b0619750e895a654070a3b4` (seller upload integration).
- At checkpoint time, exact code-head Actions run `45119581435` was IN_PROGRESS at ESLint after successful dependency installation; Build and Vitest were pending: https://github.com/shihabsami40-allify/allify/actions/runs/45119581435. Verify final status before claiming CI pass.
- Exact code-head Vercel Preview deployment `dpl_85tFohmhK43Sz1rurfwDfoM664fP` was BUILDING: https://allify-chattogram-ntszxz9xy-allify.vercel.app. Preview only; verify READY before claiming deployment success.
- PR #3 remains OPEN and unmerged. No Production database, Storage objects/policies, credentials, production alias, or customer data were changed.

## CI formatting correction — seller image path tests — 2026-11-23
- First lint run `45119581435` failed only on five Prettier formatting differences in `src/test/product-image-input.test.ts`; application build and Vitest were skipped. Exact log was reviewed; no functional lint issue was reported.
- Applied formatting-only correction in commit `58ed0432e86b4d7edb807c5b5bb2806c3de60f84`. The corrected exact-head CI run had not yet appeared at checkpoint time; do not mark the feature verified until CI succeeds.
- Preview for the feature code head `3d6f314...` was READY at https://allify-chattogram-ntszxz9xy-allify.vercel.app. The corrected commit still requires exact-head CI/Preview confirmation.

## Seller dashboard inline price/stock edit UX hardening — 2026-11-23
- Re-verified PR #3 at head `d5f423134270233a6c095ea5f9e22875a6176dd2`, OPEN and unmerged before this task.
- Reviewed Seller Dashboard inline product editing. Invalid stock values were left visible in the input even though they were rejected by the update handler; price values above the server-side maximum were also left visible. This made the displayed form state misleading after a rejected edit.
- Updated the inline price/stock blur handlers to restore the last saved value whenever input is invalid, and only call the existing store-scoped update handler for valid changed values. Price upper bound now matches the shared validator.
- Commit: `8720ac7d49c6fc74722d63cadee9498f8c665a90` (`fix: restore invalid seller price and stock edits`).
- At checkpoint time, no Actions run had yet appeared for this exact code commit; latest previous verified CI is `45119664433` on prior commit `d5f4231...`: https://github.com/shihabsami40-allify/allify/actions/runs/45119664433. Do not claim this new UI change is CI-verified until exact-head checks complete.
- Exact-head Vercel Preview deployment `dpl_FJQc7tLfK35areygDjqquXVwi64X` was BUILDING: https://allify-chattogram-lvi3u2m3n-allify.vercel.app. Preview only; verify READY before claiming deployment success.
- PR #3 remains OPEN and unmerged. No Production database, Storage objects/policies, credentials, production alias, or customer data were changed.

## Seller product creation failure cleanup and deletion-safety review — 2026-11-23
- Re-verified PR #3 at head `bb4f3ceaf287c414950cdb783ab80f16e89c4caa`: OPEN, unmerged, mergeable. Exact-head Actions run `45119773562` completed SUCCESS; Preview for that head was READY.
- Fixed a failure-cleanup risk in seller product creation. Previously the catch handler attempted Storage-object removal even when deleting the newly-created product row had failed or affected no row, potentially leaving a live `product_images` reference to a missing object. Cleanup now scopes deletion to the seller's store, requests the deleted row, and removes the uploaded Storage object only after the product-row deletion is confirmed. If deletion or Storage cleanup cannot be confirmed, the UI preserves the primary error and reports the cleanup warning; it does not knowingly remove an image still referenced by a product row.
- Added `isProductDeletionConfirmed` and regression tests for confirmed deletion, no returned row, and database error.
- Commits: `ee9f1f39312e997cbfe2738492fefd7b8e7a99db` (cleanup decision helper), `7887cb5643e3796331e193f9884fcbce9bc911fb` (tests), `95a402a40f4552a414a9a5c6a95ed7487aaf9904` (seller create cleanup integration).
- Exact code-head Actions run `45120008273` is in progress; install, ESLint and app build completed successfully; Vitest is still running. Test-only commit run `45120001965` completed SUCCESS. Verify exact-head CI and Vercel Preview before calling this change fully verified.
- Product deletion was deliberately not added. Schema review confirms `order_items.product_id` uses `ON DELETE SET NULL`, while buyer cancellation/stock restoration rejects order items whose `product_id` is null. Deleting a product tied to an order could therefore break later cancellation/stock restoration. `product_images` rows cascade with product deletion, but Storage objects are separate and are not removed by that FK. Existing seller UI offers hide/publish instead of delete; retain this non-destructive approach until a complete archive/retention workflow is designed and tested.
- Seller image replacement UI is not currently implemented. Do not delete old image rows or Storage objects until a safe replacement sequence is implemented and tested.
- No Production DB/Storage, credentials, production alias, customer data, or Lovable source was changed.
- Production release gates remain blocked: configured Production Supabase access denied; no verified restorable DB+Storage backup; Lovable/GitHub source divergence; role-based signed-in Buyer/Seller/Admin E2E and Production read-only security preflight outstanding.

## Seller product field validation alignment — 2026-11-23
- Database schema defines Bengali product title length as 2–120 characters, English title up to 120, description up to 3000, price greater than zero and below 10,000,000, and stock as an integer 0–100,000.
- Seller UI previously allowed Bengali title up to 160 characters and price up to 100,000,000, while the update handler used the same oversized title/price limits. These values could pass client validation but fail database constraints.
- Added shared `validateSellerProductTitle` (trims and enforces 2–120 characters), used it for both new product creation and seller inline title updates; constrained English title and description before insert; aligned price validation and inputs to the actual numeric/database range; added regression tests.
- Commits: `38a5155b88a702214d9187d80451cda3286dcafd` (shared validation), `3a7e2cd9d80e74c01a0a3ede7a3eb592669a9883` (tests), `6f34e75c512b9739a152fc7ff0bae0aaa87881af` (first UI integration), `0bea67b45e147fd883a97766337e7422c9833f8c` and `5da13d95d6f3c64a9ebfe0fecba30827a16f986c` (format/build correction attempts), `702f7decf4782b99a78deafcddcaf9d2495c2338` (final route syntax correction).
- Earlier CI failures were inspected: Prettier formatting errors and one stray literal `\\n` in the route file. Both were corrected. Final exact-code-head Actions run `45120364007` completed SUCCESS: install, ESLint, application build and Vitest all passed.
- Exact-code-head Vercel Preview deployment `dpl_DsAn4kuxwHaTKovBJfVJgSQxkJkN` is READY: https://allify-chattogram-i18fse1m6-allify.vercel.app (Preview only).
- No Production DB/Storage changes, Production deployment/alias changes, credentials, customer data, PR merge, or billing changes.

