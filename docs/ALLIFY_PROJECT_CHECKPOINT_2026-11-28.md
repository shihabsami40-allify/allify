# ALLIFY project checkpoint — 2026-11-28

Updated: 2026-11-28 (Bangladesh time)

## Repository and PR state verified at run start

- Repository: https://github.com/shihabsami40-allify/allify
- Default branch: `main`.
- Latest verified main head: `4d007351798e83d28b83e3dc05a6aa47dce419da` — `fix: read Supabase API keys from JSON values`.
- PR #3 is MERGED (merge commit `ca62b4efc4bcd6552ea35c7c04494f9384db7e9c`). Its historical body has stale status text; live PR metadata is authoritative.
- PR #79 is MERGED (merge commit `7595c5a8c04c2b5adbf0c4a1e0588a11f758fb36`); it introduced the current forgot-password and reset-password UI on main.
- PR #77 remains OPEN but is based on an older main and duplicates the password-reset flow already present on main; do not merge it as a separate feature.
- PR #48, #56 and #76 remain OPEN and unmerged; their older branches are not release-authoritative.
- New PR #81: https://github.com/shihabsami40-allify/allify/pull/81 — open, mergeable, based directly on the verified main head.

## Current run code improvement

Branch: `security/2026-11-28-password-reset-privacy`

- Code commit: `ea9db327dff989e694853709c3987b80ce334575`.
- Formatting correction: `6b3a220485289cdba60799e9874cee125c83aa17`.
- Added `src/lib/password-reset-feedback.ts` with one privacy-preserving Bengali response for every password-reset request outcome.
- Updated the forgot-password handler to avoid displaying raw Supabase Auth, SMTP/provider, rate-limit or network error details.
- Added `src/test/password-reset-feedback.test.ts` covering successful, unknown-account, rate-limit, provider and network outcomes.
- Added the helper and test to the focused ESLint command.
- The same neutral response is used for successful and failed requests to avoid exposing whether an email address belongs to an account. The copy is conditional: the link is sent only if the request is accepted.

## Exact-head verification

- Initial CI run [46099689646](https://github.com/shihabsami40-allify/allify/actions/runs/46099689646) failed only on Prettier formatting in the new test file. The issue was corrected in commit `6b3a220485289cdba60799e9874cee125c83aa17`.
- Final code-head CI run [46099745343](https://github.com/shihabsami40-allify/allify/actions/runs/46099745343) completed SUCCESS: dependency installation, ESLint, application build and Vitest all passed.
- Exact-head Vercel Preview deployment [dpl_FaBw5QKmTiHZVSbT9r1B9RC1yFkd](https://vercel.com/allify/allify-chattogram/FaBw5QKmTiHZVSbT9r1B9RC1yFkd) is READY at https://allify-chattogram-kwfnj2vzk-allify.vercel.app (Preview only).
- PR #81 Vercel Preview Comments check is SUCCESS. No unresolved Preview comments were reported.
- PR #81 remains unmerged. No Production deployment or alias was changed by this run.

## Main branch checks observed during this run

- Main head `4d007351798e83d28b83e3dc05a6aa47dce419da` has successful GitHub check-runs: `build`, `deploy`, `Workers Builds: allify` and `Workers Builds: allifychattogram`.
- Current Vercel Production deployment observed READY on that main commit: `dpl_EHY2mKsDLorWjBzoSijoEAH68KWV`. Existing Production URL: https://allify-chattogram.vercel.app. This run did not promote, alias, or deploy to Production.

## Source-of-truth and Production blockers

### Lovable published source

- Project: `123f5b35-4f29-4afa-8018-2e20465d2648`.
- Published snapshot: `24740138edea698f794c036b3b126c274fed3d6c`, last edited 2026-11-20.
- Current Lovable project status: `needs_attention / out_of_credits`.
- The published source remains materially different from the GitHub mainline candidate. Do not overwrite either source automatically.

### Supabase

- Configured Production ref is exactly `htsvvotamlxlkncksssq`.
- A read-only project lookup returned no project metadata. The accessible project list contains only `onqadpqdontbdvecnvby` (Allify) and `ltwobqpgxmkeylmpkogq` (allify-test); neither is the configured Production project.
- Do not substitute either accessible project for Production.
- No verified restorable full Production database backup, separate Storage-object export, or restore rehearsal is available.
- Production schema/RLS/grant preflight and signed-in Buyer/Seller/Admin E2E against the configured Production project remain blocked.

## Remaining release gates

1. Complete role-based Buyer, Seller and Admin E2E on an authorized isolated test environment.
2. Expand checkout/order lifecycle regression tests, including mixed-vendor checkout, duplicate retries, cancellation and stock restoration.
3. Continue seller product/image upload validation and admin approval/removal authorization review.
4. Review password-reset redirect allow-list and real email delivery on the exact configured Production project once owner-authorized access is available.
5. Complete accessibility and security/RLS review.
6. Reconcile the Lovable-published source with the GitHub mainline candidate deliberately; do not auto-overwrite.
7. Obtain a verified restorable full Production database backup and separate Storage-object export, with restore evidence, before any Production change.

## Safety

- No Production database write, migration, Storage mutation, Production deployment/alias change, PR merge, billing/paid-plan change, credential/secret creation or publication, or external customer/vendor contact was performed in this run.
- No secrets or credentials are recorded in this checkpoint.
- No owner action is needed for repository-only work.
- Before Production-specific verification/release, the owner must authorize read-only access to the exact configured Production Supabase project and verify restorable database and Storage backups. Never send credentials in chat.

## Next safe work

- Continue from PR #81's latest verified head; do not repeat the password-reset feedback tests.
- Continue repository-only Buyer/Seller/Admin regression coverage, accessibility and security checks.
- Re-check live main, PRs, CI and Vercel Preview before every subsequent change.
