# ALLIFY project checkpoint — 2026-11-24

Updated: 2026-11-24

## Verified repository and release candidate

- Repository: https://github.com/shihabsami40-allify/allify
- Default/Production branch: `main`
- Candidate branch: `allify-order-lifecycle-2026-11-20`
- Pull request: https://github.com/shihabsami40-allify/allify/pull/3 — OPEN, unmerged, GitHub reports mergeable.
- Verified candidate head before this checkpoint update: `ba9f1de740167283d6314264a6b9355c11358127` (`docs: record seller product validation alignment`).
- Current `main` head: `6f3ba9e768de476ac9a2d89eda5b523087e8f760`.
- The branch endpoint reports the candidate branch is not protected. Do not treat PR mergeability as release approval.

## Exact-head CI and Preview evidence

- GitHub Actions run [45120422103](https://github.com/shihabsami40-allify/allify/actions/runs/45120422103) completed SUCCESS for exact head `ba9f1de740167283d6314264a6b9355c11358127`.
- Verified job steps: dependency install, focused ESLint, application build and Vitest all completed successfully.
- Exact-head Vercel Preview deployment [dpl_9PE17g6CLGueR6maP8J7nX1QvS4L](https://vercel.com/allify/allify-chattogram/9PE17g6CLGueR6maP8J7nX1QvS4L) is READY at https://allify-chattogram-i44b81geq-allify.vercel.app. It is a Preview deployment, not Production.
- Vercel Preview Comments check is SUCCESS with zero unresolved comments.
- The existing Vercel Production deployment [dpl_6Lw476BEvQS6yU1uh4AMv1eSMUWh](https://vercel.com/allify/allify-chattogram/6Lw476BEvQS6yU1uh4AMv1eSMUWh) is READY on `main` at `6f3ba9e768de476ac9a2d89eda5b523087e8f760`; configured project domain is https://allify-chattogram.vercel.app. This deployment status does not prove live Buyer/Seller/Admin workflows or database compatibility.
- On the exact candidate head, Cloudflare check-runs `Workers Builds: allify` and `Workers Builds: allifychattogram` both FAILED. The checks expose Cloudflare build IDs, but detailed dashboard logs are unavailable through the authorized connector. Do not conflate these failures with the successful GitHub Actions/Vercel checks.

## Source-of-truth reconciliation

- Lovable project: `123f5b35-4f29-4afa-8018-2e20465d2648`; published snapshot `24740138edea698f794c036b3b126c274fed3d6c`; last edited 2026-11-20; status `needs_attention / out_of_credits`.
- GitHub PR candidate remains materially different from the Lovable-published snapshot. The previously verified behavior difference remains important: GitHub candidate checkout calls the idempotent COD `place_order` RPC; Lovable-published checkout is demo-only. No automatic source overwrite or Lovable edit was attempted.
- Keep the GitHub candidate as the reviewed source for continued repository-only work; do not copy the Lovable snapshot over it.

## Production backend and safety blockers

- Configured Production Supabase ref: `htsvvvotamlxlkncksssq`.
- Read-only `get_project` against the configured ref returned a permission-denied response. No database query, migration or write was attempted.
- Connected Supabase project `onqadpqdontbdvecnvby` is not Production; isolated `allify-test` project `ltwobqpgxmkeylmpkogq` is not Production. Never substitute either project for the configured backend.
- No verified restorable full Production database backup, separate Storage-object export or restore rehearsal is available.
- Production read-only schema/RLS/grant preflight and signed-in Buyer/Seller/Admin end-to-end tests remain outstanding.
- No Production database/Storage mutation, Production deployment or alias change, PR merge, credential/secret operation, billing change or external customer/vendor contact occurred.

## Work completed in this run

- Re-verified repository metadata, branch head, PR #3, exact-head CI, exact-head Vercel Preview, current Vercel Production deployment, Lovable project status and configured Supabase access.
- Corrected stale README migration instructions so the early baseline migrations are not presented as a complete or automatically authorized Production release path.
- Documented the actual `0004`–`0029` release bundle and mandatory backup, restore, preflight, source-reconciliation and role-E2E gates.
- Marked Cloudflare as a separate, currently failing deployment path rather than implying Vercel success validates Cloudflare.
- Added `bun run lint` to the documented local verification sequence.
- This update changes repository documentation only; it does not modify runtime code or any database.

## Next safe work

1. Continue focused repository-only QA on Buyer checkout, Seller product/store workflows, Admin review/order lifecycle, accessibility and security.
2. Diagnose the two Cloudflare failures only if the authorized Cloudflare dashboard logs or another supported read-only path become available.
3. Keep Production release blocked until the configured backend is accessible with owner authorization, a restorable DB + Storage backup is proven, preflight passes, sources are reconciled and role-based E2E passes.
4. Recheck CI and Preview for the documentation commit created with this checkpoint before treating that new head as verified.

## Owner action genuinely required

The only Production-specific owner action currently required is to grant authorized read-only access to the exact configured Production backend and verify/provide a restorable database backup plus separate Storage-object backup/restore evidence. No password or secret should be sent in chat.