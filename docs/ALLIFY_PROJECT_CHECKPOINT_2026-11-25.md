# ALLIFY project checkpoint — 2026-11-25

Updated: 2026-11-25 (Bangladesh time)

## Repository source of truth

- Repository: https://github.com/shihabsami40-allify/allify
- Default branch: `main`
- Verified current `main` head: `adfd4b1724db5f202734c4ef5dc3458bf43f63bc` — merge commit for PR #47.
- PR #3: **MERGED** on 2026-11-24; merge commit `ca62b4efc4bcd6552ea35c7c04494f9384db7e9c`. Earlier checkpoint text saying it remained open is stale and superseded.
- PR #47: **MERGED** on 2026-11-24; merge commit `adfd4b1724db5f202734c4ef5dc3458bf43f63bc`.
- Current repository-only candidate: [PR #48](https://github.com/shihabsami40-allify/allify/pull/48), branch `automation/2026-11-25-checkout-idempotency`, base `main`. It is open and GitHub reports it mergeable. Do not merge automatically.

## Work completed in this run

- Added `src/lib/checkout-request.ts` to create a stable checkout idempotency fingerprint.
- Product lines are sorted by product ID before fingerprint serialization. Reordering the same cart therefore keeps the same request key, while buyer, item quantities, recipient, phone, delivery area, address, note and saved-address preference remain part of the key.
- Updated the checkout handler in `src/routes/$page.tsx` to use the helper.
- Added `src/test/checkout-request.test.ts` with coverage for cart reordering, quantity changes and all order-affecting fields.
- Added the helper and test to the focused ESLint command in `package.json`.
- The first CI attempt exposed Prettier failures in the new helper and existing `src/lib/product-input.ts`; both were formatted in follow-up commits. No runtime validation rules were changed in `product-input.ts`.
- Latest code/test commit before this checkpoint record: `d155272140d1d22e842ee2f6303adba4090c256c`.

## CI and Preview evidence

- GitHub Actions workflow: **ALLIFY build check**, run [45535536458](https://github.com/shihabsami40-allify/allify/actions/runs/45535536458), run number 558. It was still in progress at checkpoint creation; Bun setup had not completed, so no lint/build/test success is claimed yet.
- Earlier run [45535424061](https://github.com/shihabsami40-allify/allify/actions/runs/45535424061) failed at ESLint. The logs identified formatting errors in the new helper and pre-existing `product-input.ts`; both were corrected before the current run.
- Exact code-head Vercel Preview [dpl_7qnXK5gHdZ3TWFA2bCxkCMW6jsbg](https://vercel.com/allify/allify-chattogram/7qnXK5gHdZ3TWFA2bCxkCMW6jsbg) is **READY** at https://allify-chattogram-jaqp9naut-allify.vercel.app. It is a Preview, not Production.
- Vercel's combined status for code head `d155272140d1d22e842ee2f6303adba4090c256c` is SUCCESS.
- The latest `main` head `adfd4b1724db5f202734c4ef5dc3458bf43f63bc` has a Vercel status failure linking to the team's build-rate-limit notice. No Vercel deployment was returned for that exact main SHA.
- The latest observed Vercel Production deployment remains READY on older `main` commit `6fafa655cfa67f364aa66b45eca41b38cc31e768`. Production was not changed.
- Do not treat Vercel Preview readiness as proof that GitHub Actions, Cloudflare, database compatibility or role-based workflows passed.

## Checkout and order-lifecycle review

- GitHub `main` checkout uses the authenticated `place_order` RPC with a client request ID; the database function is the authoritative source for item prices and stock.
- PR #47 added migration `drizzle/migrations/0033_product_only_checkout_pricing.sql` and changed the UI so ALLIFY stores product prices only; courier charges are handled separately in the courier merchant panel.
- PR #47's description says both checkout overloads were updated directly in a connected Supabase project. That statement does not establish that the connected project was the configured Production project; Production schema state remains unverified until project identity and access are confirmed.

## Lovable / GitHub source reconciliation

- Lovable project: `123f5b35-4f29-4afa-8018-2e20465d2648`; published snapshot `24740138edea698f794c036b3b126c274fed3d6c`; last edited 2026-11-20; published.
- Current Lovable project status is `needs_attention / out_of_credits`.
- Read-only inspection of the published `src/components/marketplace/checkout-view.tsx` confirms it is demo-only: real products are shown as unavailable for real orders, and demo checkout stores a browser-local demo order.
- GitHub `main` instead calls the authenticated `place_order` RPC for COD orders. These are materially different sources. No automatic overwrite, Lovable edit or publish action was attempted.

## Production backend and release blockers

- Configured Production Supabase ref: `htsvvotamlxlkncksssq`.
- Read-only `get_project` against that exact ref returned permission denied. No SQL query, migration, database write or Storage mutation was attempted against it.
- `onqadpqdontbdvecnvby` and `ltwobqpgxmkeylmpkogq` are not the configured Production ref. Any observations or changes previously associated with those projects must not be treated as proof of Production state.
- The previous checkpoint's appended live update referred to `onqadpqdontbdvecnvby`; it is explicitly not Production evidence and must not be used to clear Production release gates.
- No verified restorable full Production database backup, separate Storage-object export or restore rehearsal is available.
- Production schema/RLS/grant preflight and signed-in Buyer/Seller/Admin end-to-end tests remain outstanding.
- A real approved seller store and non-demo product are required for meaningful seller-image, checkout and order-lifecycle E2E tests. No Production test data was created.
- Cloudflare status for this candidate was not exposed by the available integrations. Earlier Cloudflare failures remain a separate unresolved deployment path; Vercel success does not clear them.

## Safety and release decision

- No Production database or Storage write/migration, Production deployment or alias change, PR merge, credential/secret operation, billing change or external customer/vendor contact occurred in this run.
- Keep PR #48 open for CI/review. Do not merge or deploy Production automatically.
- Production release remains blocked until the exact configured backend is accessible with owner authorization, a restorable database and separate Storage backup are verified, source reconciliation is decided, security preflight passes and role-based E2E succeeds.

## Next safe work

1. Finish and inspect the current PR #48 GitHub Actions run; fix any remaining lint, build or Vitest failures on the candidate branch.
2. Recheck the exact-head Vercel Preview after any fix.
3. Continue repository-only Buyer checkout, Seller store/product/image and Admin approval/order-lifecycle tests, plus accessibility and static security review.
4. Keep the configured Production Supabase ref isolated from all other projects; do not attempt Production changes while identity, authorization and restorable backups are unverified.

## Owner action genuinely required

No action is needed for the current repository-only work. Before any Production-specific verification or release, the owner must grant authorized read-only access to the exact configured Production Supabase project and provide/verify a restorable database backup plus a separate Storage-object backup/restore record. Do not send credentials or secrets in chat.
