# ALLIFY project checkpoint — 2026-11-27

Updated: 2026-11-27 (Bangladesh time)

## Repository state verified at run start

- Repository: https://github.com/shihabsami40-allify/allify
- Default branch: `main`.
- Latest `main` head at run start: `af1967bfe22941c0566c1a7220f54650873a6149` — “Show products immediately on category pages”.
- PR #3 is **MERGED** (merge commit `ca62b4efc4bcd6552ea35c7c04494f9384db7e9c`). Its historical body contains stale text; live PR metadata is authoritative.
- PR #48 remains open and unmerged. Its branch is 11 commits ahead and 24 behind current main; do not merge the stale branch directly.
- PR #56 remains open and unmerged. Its branch was based on an older main head; its order-transition guard is carried forward in the current-mainline candidate below.
- Mainline checkpoint document currently available on `main`: `docs/ALLIFY_PROJECT_CHECKPOINT_2026-11-24.md`. Later checkpoints existed on prior PR branches, not on current main.

## Current-mainline reconciliation work

- New branch: `automation/2026-11-27-checkout-order-safety`, based directly on the verified main head above.
- PR #76: https://github.com/shihabsami40-allify/allify/pull/76 — open, unmerged, mergeable after GitHub recalculation.
- Code commit: `376a67541462ef9686e195e0abaaa88b6688f0c9`.
- Reapplied checkout idempotency changes directly on current main, preserving newer homepage/category changes:
  - Added `src/lib/checkout-request.ts` to sort checkout items by product ID before fingerprint serialization.
  - Fingerprint still includes buyer, item quantities, recipient, phone, delivery area, address, note and saved-address preference.
  - Updated checkout handler in `src/routes/$page.tsx`.
  - Added `src/test/checkout-request.test.ts` for cart reordering and order-affecting field changes.
  - Added helper/test to focused ESLint script.
  - Formatted the existing localized-number helper so the expanded lint command passes.
- Carried forward the order-transition own-property guard:
  - `src/lib/order-transitions.ts` now checks the current status is an own key before reading the transition table.
  - Added regression cases for `toString`, `constructor`, `__proto__`, and `hasOwnProperty`.
- No runtime database schema or Production data was changed.

## Exact-head CI and Preview evidence

- GitHub Actions run [45930952825](https://github.com/shihabsami40-allify/allify/actions/runs/45930952825) completed **SUCCESS** for code commit `376a67541462ef9686e195e0abaaa88b6688f0c9`.
- Verified steps: dependency installation, ESLint, application build and Vitest all passed.
- Exact-head Vercel Preview deployment [dpl_68iQ3urNrQP6ykevpuLGb5ar9xp6](https://vercel.com/allify/allify-chattogram/68iQ3urNrQP6ykevpuLGb5ar9xp6) is **READY** at https://allify-chattogram-5xlioahyr-allify.vercel.app (Preview only).
- PR #76 Vercel bot comment confirms Preview READY with zero unresolved Preview comments.
- The current main Production deployment is observed READY on commit `af1967bfe22941c0566c1a7220f54650873a6149` at https://allify-chattogram.vercel.app. This run did not create a Production deployment or change aliases.
- The latest main GitHub Actions run [45765162693](https://github.com/shihabsami40-allify/allify/actions/runs/45765162693) failed at ESLint; build and tests were skipped. The job-log endpoint returned 404, so the exact main-branch lint failure has not been diagnosed. The current PR #76 exact-head workflow passes all steps.
- Cloudflare workflow run [45765162652](https://github.com/shihabsami40-allify/allify/actions/runs/45765162652) reports overall success, but its “Deploy to Cloudflare Workers” step was **skipped**. Do not interpret this as a completed Cloudflare deployment. No Cloudflare deployment is asserted for PR #76.

## Source-of-truth and Production blockers

- Lovable project `123f5b35-4f29-4afa-8018-2e20465d2648` remains published but `needs_attention / out_of_credits`; latest published snapshot remains `24740138edea698f794c036b3b126c274fed3d6c`, last edited 2026-11-20.
- Previously verified source difference remains material: Lovable published checkout is demo-only; GitHub main uses authenticated `place_order` RPC. No overwrite, edit or publish was attempted.
- Configured Production Supabase ref is exactly `htsvvotamlxlkncksssq`. Read-only project lookup returned permission denied again. Do not substitute `onqadpqdontbdvecnvby` or the isolated test project.
- No verified restorable full Production database backup, separate Storage-object export or restore rehearsal is available.
- Signed-in Buyer/Seller/Admin E2E and exact-Production schema/RLS/grant preflight remain outstanding.
- No Production database/Storage write or migration, Production deployment/alias change, PR merge, billing change, credential/secret operation, or external customer/vendor contact occurred.

## Next safe work

1. Continue repository-only checkout, order lifecycle, seller product/image and admin approval regression coverage.
2. Diagnose the current main ESLint failure through a supported log path; do not assume it is the same issue fixed on PR #76.
3. Add/verify role-based UI accessibility and security checks without requiring Production data.
4. Keep PR #76 unmerged pending review; do not merge PR #48 or #56 automatically.
5. Keep Production blocked until exact-project owner-authorized access, verified restorable database and Storage backups, source reconciliation, security preflight and signed-in role E2E are available.

## Owner action genuinely required

- No owner action is needed for repository-only work.
- Before Production-specific verification or release, the owner must authorize read-only access to the exact configured Production Supabase project and verify a restorable full database backup plus separate Storage-object backup/restore evidence.
- Never send credentials or secrets in chat.
