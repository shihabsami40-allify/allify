# ALLIFY checkpoint — 2026-11-26

Updated: 2026-11-26

## Repository state verified at run start
- Repository: `shihabsami40-allify/allify`.
- Latest `main` commit at run start: `16277a4dd30ac177a4977b0bfeeead6ef59cda78` — `Hide category tiles from ALLIFY home page (#53)`.
- PR #3 is closed and merged. Its current body contains stale historical text claiming it is open; use the live PR metadata and merge commit, not that stale paragraph.
- PR #48 remains open and unmerged on `automation/2026-11-25-checkout-idempotency`, head `e633361c5d646ce792f0e9f2acfe1efd4ee4b33b`, based on older main `adfd4b1724db5f202734c4ef5dc3458bf43f63bc`. Do not assume it includes subsequent main UI changes.
- Latest main commit's combined GitHub status exposes Vercel success only; it does not expose a GitHub Actions result for that commit.

## Current deployment evidence
- Vercel project: `allify-chattogram`.
- Latest observed main deployment is READY and marked target `production`, deployment `dpl_3RuL71udQQ82fYHrC812HDdWqY8M`, on commit `16277a4dd30ac177a4977b0bfeeead6ef59cda78`.
- This was observed as an existing Git-linked deployment; this run did not create a Production deployment or change aliases.
- PR #48 Vercel Preview `dpl_546CFhZZaxAQEVEpmx7J6okY7kvf` is READY at https://allify-chattogram-6uyxdda59-allify.vercel.app.
- Cloudflare bot comments on PR #48 report failed builds for both `allify` and `allifychattogram` at commit `e633361`; detailed logs are not available through the connected tools. Vercel readiness does not clear Cloudflare.

## Repository-only improvement in this checkpoint
- New branch: `fix/order-transition-prototype-keys-2026-11-26`, based on the exact latest main commit above.
- New PR #56: https://github.com/shihabsami40-allify/allify/pull/56 (draft, open, not merged).
- Code change: `src/lib/order-transitions.ts` now checks that a current status is an own key of the transition table before reading it. This prevents inherited object keys from being treated as valid states or causing a runtime TypeError.
- Regression tests added for `toString`, `constructor`, `__proto__`, and `hasOwnProperty`.
- Code/test commit: `297ebed6a31f6c3924cf88d402f152d9f663530d`.
- CI and Preview for this new PR are pending verification at checkpoint creation.

## Production and source-of-truth blockers
- Configured Production Supabase ref remains exactly `htsvvotamlxlkncksssq`; read-only access is denied.
- Do not substitute `onqadpqdontbdvecnvby` or isolated test project `ltwobqpgxmkeylmpkogq` for Production.
- No verified restorable full Production database backup, separate Storage-object export, or restore rehearsal is available.
- Lovable published source remains materially different from GitHub main: Lovable checkout is demo-only, while GitHub main uses the authenticated `place_order` RPC. Lovable project is out of credits; no source overwrite or publish was attempted.
- Signed-in Buyer/Seller/Admin E2E and exact-Production schema/RLS/grant preflight remain unverified.
- No Production database or Storage write/migration, Production deployment/alias change, PR merge, billing change, credential/secret operation, or external customer/vendor contact occurred in this run.

## Next safe work
1. Verify PR #56 CI and Vercel Preview at the exact final head; inspect any failure and fix only on the candidate branch.
2. Continue repository-only order lifecycle, checkout, Seller product/image, Admin approval and accessibility/security regression tests.
3. Reconcile PR #48 against current main without overwriting newer UI work; keep it unmerged until reviewed.
4. Keep Production blocked until exact project owner-authorized access, verified restorable DB and Storage backups, source reconciliation, security preflight, and signed-in role E2E are available.

## Owner action genuinely required
- No owner action is needed for the repository-only work in this run.
- Before Production-specific checks or release, the owner must authorize read-only access to the exact configured Production Supabase project and verify a restorable full database backup plus separate Storage-object backup/restore record. Never send credentials or secrets in chat.
