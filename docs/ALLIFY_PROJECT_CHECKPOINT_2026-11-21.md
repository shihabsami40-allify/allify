# ALLIFY — Consolidated Project Checkpoint
Updated: 2026-11-21

## Product and launch scope
- Bengali-first, Chattogram-district multi-vendor marketplace.
- Initial launch limited to Chattogram district; possible district expansion later.
- Seller registration and storefronts initially free to attract vendors.
- Buyer accounts, product browsing/categories, seller stores, cart, checkout, cash-on-delivery/local delivery, seller dashboard, admin dashboard, Bangla/English toggle, BDT.
- Initial product focus: clothing, shoes, watches, bags, daily necessities and related consumer goods.
- Current instruction: prioritize only essentials required for buyers and sellers to use the marketplace; defer nonessential polish/features to later phases. Do not restart or redo earlier work.

## Systems and identifiers
- GitHub repository: shihabsami40-allify/allify
- Production source branch: main (must remain main; do not switch production to allify-recovery-2026-11-17).
- Vercel project: allify-chattogram
- Vercel project ID: prj_HrrHA2oTczJFEKdKUB9hAOsJ8DEV
- Vercel team ID: team_1E9SV4Mb4dfNaTz6p9DZraCA
- Production domain: https://allify-chattogram.vercel.app (verified on project)
- Lovable project: Allify Chattogram
- Lovable project ID: 123f5b35-4f29-4afa-8018-2e20465d2648
- Lovable workspace: oI7FOdqVEmMEJwHmxXpn
- Lovable latest known saved version: 2474013; commit 24740138edea698f794c036b3b126c274fed3d6c
- Lovable latest known status: published, but needs_attention / out_of_credits; do not assume further Lovable AI edits are possible.

## Completed work recorded
- Core marketplace UI and flows have been built in the Lovable/GitHub project: buyer accounts, products, categories, stores, cart/checkout, seller/admin dashboards and bilingual/BDT support.
- Security and order lifecycle work is assembled in PR #3, branch allify-order-lifecycle-2026-11-20.
- PR #3 title: fix: make order cancellation atomic and synchronize order status.
- Latest known PR head at checkpoint creation: f1d41d594907555c067c8172502c721e268d9194; subsequent live verification on 2026-11-21 found the PR head advanced to be4425f313eeff079040a2b8a10458b917554a3e.
- PR changes include atomic cancellation with stock restoration and parent order status synchronization; order/item/demo-order guards; seller-owned active non-demo product image Storage policies and image bucket limits (5 MiB JPEG/PNG/WebP); delivery detail/product metric/demo stock/seller application insert guards; serialized seller applications; protected seller-application review RPC with duplicate-store prevention; suspended seller product/image restrictions; RLS optimization; helper grants tightened; foreign-key indexes; admin sample-data labels/locks; release SQL preflight/postflight assertions.
- Release bundle: supabase/releases/2026-11-20_allify_release.sql (migrations 0004–0019 in one transaction).
- Isolated Supabase test project allify-test (project ID ltwobqpgxmkeylmpkogq) passed transactional rehearsal of the release pack; tests covered demo checkout rejection, normal COD checkout stock/sold updates, cancellation stock restoration and idempotency, seller application approval/rejection and duplicate prevention, delivery/product metric/order/demo/storage/suspended seller/RLS/grant/index checks. Test writes were rolled back.
- GitHub Actions build check for the latest PR head was reported successful in the prior checkpoint (run 44686441246); PR metadata also reports run 44686045885 passed. Re-check latest CI before any merge.

## Latest deployment facts (2026-11-21 check)
- Vercel has READY Preview deployments from PR branch; newest observed deployment dpl_FNY9UeYEGRxCQBpjcgjwNfz9g33z, URL https://allify-chattogram-bbcbtjip1-allify.vercel.app, commit 6d960e67dc362f84f8605166bdd4055bdff43a07. Build logs show Vite/Nitro build and deployment completed successfully.
- The preview deployment is not Production (target null). It is not proof of a working buyer/seller production launch.
- The verified project domain is allify-chattogram.vercel.app. Prior project setting showed SSO protection enabled for all except custom domains; confirm current access policy before public launch. Do not disable SSO indiscriminately.
- Latest production deployment record observed was READY on main at commit 6f3ba9e768de476ac9a2d89eda5b523087e8f760. Do not promote preview to production until database prerequisites and end-to-end tests pass.
- A Cloudflare Preview Build for a different latest PR head had previously failed; do not assume Cloudflare deployment is healthy. Vercel preview build is a separate successful build.

## Production database facts and blockers
- Production DB is Lovable-managed; it is NOT either connected Supabase project. Do not mistake onqadpqdontbdvecnvby or ltwobqpgxmkeylmpkogq for production.
- Production checks previously confirmed required tables/columns/functions exist and the product-images bucket exists.
- Production privileges previously showed place_order(...7 args...) has authenticated_execute=false (also anon/public false). review_seller_application has authenticated_execute=true; sync_order_status_from_items has anon/authenticated/public execution false.
- Release SQL includes restoring intended authenticated-only access to place_order and related release changes.
- Production migrations have NOT been applied.
- User has not confirmed a recent restorable Lovable production backup. Tooling available here does not expose a backup-list/restore API; backup confirmation must precede production DB writes.
- Do NOT apply production migrations, change production env/deployment, or expose stale production without a recent restorable backup and production preflight.
- Storage objects are separate from DB backup; release pack changes Storage policies/settings, not existing file objects.

## Earlier live revalidation — 2026-11-21
- PR #3 is still OPEN, mergeable, not merged; 25 commits, 18 changed files. Latest verified head at that earlier check: `be4425f313eeff079040a2b8a10458b917554a3e`.
- Latest head CI: GitHub Actions run `44874380438` completed successfully; combined commit status reports Vercel success.
- A new Vercel Preview deployment for that exact head is READY: `dpl_9bvXM2xYa7LAgzhN7FJQXf64p9E4`, URL `https://allify-chattogram-fbrkiv49j-allify.vercel.app`, target is Preview (not Production).
- Current verified Production deployment remains READY on `main` at `6f3ba9e768de476ac9a2d89eda5b523087e8f760`; domain alias `allify-chattogram.vercel.app`.
- No PR review submissions or inline review threads were returned.
- Lovable Production database query action was blocked by the workspace Free-plan action limit; the attempted read-only privilege query was NOT executed. Tool reported retry availability in 49 minutes. No DB write was attempted.
- Lovable project still reports `needs_attention / out_of_credits`. No supported backup-list/restore endpoint is exposed in the available Lovable tools. Keep all Production DB writes and release operations blocked pending a verified restorable backup and fresh preflight.
- The GitHub release pack exists at `supabase/releases/2026-11-20_allify_release.sql` (40,939 characters); its header explicitly states it has not been applied to Production and requires backup + read-only preflight.

## Other integration facts
- Supabase connector project onqadpqdontbdvecnvby is separate and not Vercel/Lovable production.
- Test project ltwobqpgxmkeylmpkogq is allify-test and active/healthy.
- Railway and Render connections were not confirmed; do not claim connected.
- Vercel Git integration had previously shown disconnected in team settings; current state needs verification before assuming automatic main-branch deployments are configured.
- Do not create a new Vercel project. Keep existing allify-chattogram and production branch main.

## Essential next work (strict priority)
1. Inspect latest PR #3 head, changed files, checks and mergeability; resolve only blockers needed for a minimum viable buyer/seller launch.
2. Verify existing Vercel Git connection and current Production/Preview deployment/access configuration; do not create a new project.
3. Inspect current Production DB schema/privileges and backup status through supported Lovable access. Do not write to production without confirmed restorable backup.
4. After backup confirmation, run release preflight and apply only required release migrations; verify postflight and authenticated checkout/seller/admin flows.
5. Deploy the verified main branch to the existing Vercel Production project and test public buyer browsing, account/auth, seller registration/store/product listing, COD checkout, order management, admin review, product images and mobile usability.
6. Defer nonessential features, visual polish and expansion until launch-critical flows are stable.

## User instructions and interaction constraints
- User wants the assistant to independently inspect and do available work; avoid asking them to repeat details or navigate technical settings unless a truly unavoidable manual confirmation is required.
- Be candid; never claim the site is live/complete until public Production and real buyer/seller flows are verified.
- Do not promise background work or a future unsolicited message; work only during active tool execution.
- Do not ask for passwords, API secrets or private keys.
- Do not risk production customer data to meet an arbitrary deadline.


## Latest session update — 2026-11-21
- PR #3 rechecked: OPEN, mergeable, not merged; 26 commits, 18 changed files. Latest branch head after checkpoint refresh commit: `5a7a6eb02379fa45494454845c9089866aadeb40`.
- Saved this refreshed checkpoint on the same branch. Checkpoint commit: `5a7a6eb02379fa45494454845c9089866aadeb40`.
- The previous PR head `be4425f313eeff079040a2b8a10458b917554a3e` had successful GitHub Actions run `44874380438` and a READY Vercel Preview.
- A new Preview build was automatically triggered by this checkpoint commit: deployment `dpl_9zVm1vhDCm3Q7G8w3YZSayGRUZAM`, URL `https://allify-chattogram-gyp2417d4-allify.vercel.app`; it was still BUILDING when last checked. Do not mark it READY until rechecked.
- Production remains on main commit `6f3ba9e768de476ac9a2d89eda5b523087e8f760`; no Production deployment or DB mutation made.
- A further read-only Production privileges query was attempted through Lovable but blocked by workspace Free-plan action limit; it did not execute. No database write was attempted.
- No production backup/restore capability was exposed in connected tools. No credentials were sought or exposed.

## Remaining work inventory — ordered by launch priority
### P0 — Release blockers
1. Obtain and verify a complete, restorable backup of the Lovable Production database; separately export and verify Storage objects. Do not treat SQL snippets or selected-table exports as full backups.
2. Recheck Lovable Production DB privileges, RLS, schema drift, RPC grants, trigger/function definitions and bucket policies using read-only access when the action limit permits.
3. Reconcile release SQL migrations 0004–0019 against the actual Production schema and Lovable migration history. Confirm preflight/postflight assertions and exact execution order; do not apply until backup is verified.
4. Resolve the production checkout blocker: authenticated EXECUTE permission for `place_order` was previously false. Confirm release grants are correct and safely applied only after backup.
5. Recheck helper-function exposure: anon previously had EXECUTE on `has_role` and `owns_store`; verify revocations in the live DB after release.
6. Verify all intended seller/admin RPC permissions and RLS policy behavior; do not use broad grants or bypass controls.
7. Confirm Lovable plan/credits and supported way to access/export production data; if platform action limit/plan prevents this, document the exact manual blocker rather than attempting unsafe alternatives.

### P1 — Code, CI and Preview readiness
8. Recheck latest PR #3 checks and the latest Vercel Preview build; diagnose any build failure and fix on the existing branch.
9. Review all 18 changed files and release bundle for correctness, idempotency, migration ordering, least privilege and compatibility with live schema.
10. Add/fix automated tests for buyer/seller/admin authorization, COD checkout, stock updates, cancellation/refund semantics, order status lifecycle, seller approval and Storage access.
11. Test public product/store browsing, search/category, login/signup, seller application/store creation, product CRUD, cart, checkout, order history and admin review on Preview using safe test accounts/data.
12. Verify product image upload, MIME/size restrictions, ownership, deletion and public rendering; current Production Storage bucket previously had zero objects.
13. Verify responsive mobile layout, Bangla/English switching, BDT display, form validation and error/loading/empty states.
14. Check deployment access protection and custom-domain public accessibility without indiscriminately disabling SSO.
15. Verify Vercel Git integration and environment-variable mapping; do not expose or copy secrets into GitHub.

### P2 — Production launch and post-launch
16. After verified backup, approved migration plan, passing tests and a clear rollback plan, merge PR #3 to main.
17. Deploy through the existing Vercel project; verify the actual Production target and custom domain, not just a Preview URL.
18. Run live smoke tests for public browsing, authentication, seller onboarding, product listing/images, COD order placement, order lifecycle, customer order history and admin seller approval.
19. Verify production logs, function errors, database errors, Storage policies and basic monitoring after launch.
20. Confirm recovery procedure and document backup timestamp, restore test, migration commit, deployment ID and rollback steps.
21. Defer non-launch-critical enhancements, paid integrations, online payment gateways, advanced analytics, loyalty/referrals and district expansion until the core marketplace is stable.

## Latest session verification — 2026-11-21 (after prior checkpoint)
- Rechecked PR #3 live: OPEN, mergeable, not merged; 27 commits and 18 changed files. Current head is `a5f7752329a67e816b6ea5103656c64b4adcb35a`.
- GitHub Actions for that exact head completed successfully: run `44897967485`, conclusion `success`.
- Combined commit status reports Vercel `success`.
- Previously BUILDING Preview deployment `dpl_9zVm1vhDCm3Q7G8w3YZSayGRUZAM` is now `READY`; URL `https://allify-chattogram-gyp2417d4-allify.vercel.app`; branch `allify-order-lifecycle-2026-11-20`, commit `5a7a6eb02379fa45494454845c9089866aadeb40`. This is Preview only, not Production.
- The release SQL pack was inspected read-only; its header confirms it has NOT been applied to Production and explicitly requires a restorable backup and preflight.
- No Production DB query/write, migration, PR merge, or Production deployment was performed in this session.
- Current blocker remains verified full Production DB + Storage backup/restore and live DB preflight. Lovable plan/action limits and lack of a backup/restore action remain unresolved.

## Next exact action
Resume read-only release-bundle and migration review on PR #3, and retry Lovable Production read-only access/backup path only when supported. Do not merge or mutate Production until P0 items 1–6 are cleared.
