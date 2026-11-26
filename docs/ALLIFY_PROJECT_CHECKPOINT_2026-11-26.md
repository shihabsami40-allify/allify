# ALLIFY checkpoint — 2026-11-26

Updated: 2026-11-26

## Repository state verified at run start
- Repository: `shihabsami40-allify/allify`.
- Latest `main` commit at run start: `16277a4dd30ac177a4977b0bfeeead6ef59cda78` — `Hide category tiles from ALLIFY home page (#53)`.
- PR #3 is closed and merged. Its current body contains stale historical text claiming it is open; use live PR metadata and merge commit, not that stale paragraph.
- PR #48 remains open and unmerged on `automation/2026-11-25-checkout-idempotency`, head `e633361c5d646ce792f0e9f2acfe1efd4ee4b33b`, based on older main `adfd4b1724db5f202734c4ef5dc3458bf43f63bc`. Do not assume it includes subsequent main UI changes.
- Latest main commit's combined GitHub status exposes Vercel success only; no GitHub Actions run was returned for that exact main commit.

## Current deployment evidence
- Vercel project: `allify-chattogram`.
- Latest observed main deployment is READY and marked target `production`, deployment `dpl_3RuL71udQQ82fYHrC812HDdWqY8M`, on commit `16277a4dd30ac177a4977b0bfeeead6ef59cda78`.
- This was an existing Git-linked deployment; this run did not create a Production deployment or change aliases.
- PR #48 Vercel Preview `dpl_546CFhZZaxAQEVEpmx7J6okY7kvf` is READY at https://allify-chattogram-6uyxdda59-allify.vercel.app.
- Cloudflare bot comments on PR #48 report failed builds for both `allify` and `allifychattogram` at commit `e633361`; detailed logs are not available through connected tools. Vercel readiness does not clear Cloudflare.

## Repository-only improvement in this checkpoint
- New branch: `fix/order-transition-prototype-keys-2026-11-26`, based on the exact latest main commit above.
- New PR #56: https://github.com/shihabsami40-allify/allify/pull/56 (open, ready for review, not merged).
- `src/lib/order-transitions.ts` now checks that a current status is an own key of the transition table before reading it. This prevents inherited object keys from being treated as valid states or causing a runtime TypeError.
- Regression tests added for `toString`, `constructor`, `__proto__`, and `hasOwnProperty`.
- Code/test commits: `f99e246649094f166dfff4610e1caffdea9acdc5` and `297ebed6a31f6c3924cf88d402f152d9f663530d`.
- The first GitHub Actions run `45741518075` failed at ESLint because the existing `src/lib/product-input.ts` had Prettier formatting errors. This was unrelated to the new transition guard. The file was reformatted in commit `b379035c3481132a9c56fa83f6cbedfc51971341`; a fresh CI run is pending.
- Vercel Preview for the preceding checkpoint head `7b44fff0b891e7232bc16502817ff42fc72f8f3b` is READY: deployment `dpl_7SY8e2TeLj5YLZKPUroDQz9M7Ck7`, https://allify-chattogram-l8hr18ja1-allify.vercel.app. A new Preview is expected for the lint-fix commit.

## Production and source-of-truth blockers
- Configured Production Supabase ref remains exactly `htsvvotamlxlkncksssq`; read-only access was retried and denied. The user prompt's extra-v variant was not used as a substitute.
- Do not substitute `onqadpqdontbdvecnvby` or isolated test project `ltwobqpgxmkeylmpkogq` for Production.
- No verified restorable full Production database backup, separate Storage-object export, or restore rehearsal is available.
- Lovable published source remains materially different from GitHub main: Lovable checkout is demo-only, while GitHub main uses the authenticated `place_order` RPC. Lovable project is out of credits; no source overwrite or publish was attempted.
- Signed-in Buyer/Seller/Admin E2E and exact-Production schema/RLS/grant preflight remain unverified.
- No Production database or Storage write/migration, Production deployment/alias change, PR merge, billing change, credential/secret operation, or external customer/vendor contact occurred in this run.

## Next safe work
1. Verify the fresh PR #56 CI and Vercel Preview at the latest head; inspect and fix any remaining failure only on this candidate branch.
2. Continue repository-only order lifecycle, checkout, Seller product/image, Admin approval and accessibility/security regression tests.
3. Reconcile PR #48 against current main without overwriting newer UI work; keep it unmerged until reviewed.
4. Keep Production blocked until exact project owner-authorized access, verified restorable DB and Storage backups, source reconciliation, security preflight, and signed-in role E2E are available.

## Owner action genuinely required
- No owner action is needed for repository-only work.
- Before Production-specific checks or release, the owner must authorize read-only access to the exact configured Production Supabase project and verify a restorable full database backup plus separate Storage-object backup/restore record. Never send credentials or secrets in chat.
