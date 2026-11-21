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


## Latest execution session — live Production audit (2026-11-21)
### GitHub / CI / Lovable
- PR #3 rechecked live: OPEN, mergeable, not merged; 28 commits, 18 files; current head `17804aeb2cc18bb640146a87d40029051a5b0201`.
- GitHub Actions for that exact head: run `44898061638`, completed SUCCESS.
- Combined commit status: Vercel SUCCESS.
- Lovable project `123f5b35-4f29-4afa-8018-2e20465d2648`: published; agent status `needs_attention`, reason `out_of_credits`; workspace plan FREE. No Lovable agent edits or DB export were possible.
- Lovable `.env` identifies Supabase project ref `htsvvotamlxlkncksssq`. Supabase account project listing does not include this ref; direct get_project returned permission denied. Do not assume another project is the app's production backend.

### Critical Production backend identity/schema discrepancy
- Supabase account project named `Allify`, ref `onqadpqdontbdvecnvby`, status ACTIVE_HEALTHY, is accessible read-only.
- This accessible `Allify` project does NOT match the Lovable app's configured Supabase ref `htsvvotamlxlkncksssq`. Its public schema is the legacy model (`profiles`, `stores`, `products`, `orders`, etc.), not the release pack's expected schema (`seller_stores`, `seller_applications`, `delivery_areas`, etc.).
- `list_migrations` on accessible `Allify` returned an empty list. The isolated `allify-test` project ref `ltwobqpgxmkeylmpkogq` has migrations `0000`–`0024` and the expected marketplace schema. This confirms test environment is not evidence that the app's actual configured Production database is aligned.
- Direct `get_project(htsvvotamlxlkncksssq)` returned permission denied. Production identity/ownership/access must be resolved before any release action.
- Accessible legacy `Allify` project audit found 4 exposed SECURITY DEFINER RPCs executable by both anon and authenticated: `is_admin()`, `lookup_order(text,text)`, `owns_store(uuid)`, and `place_marketplace_order(text,text,text,text,jsonb)`. Supabase Security Advisor reports the same 4 anon and 4 authenticated findings. Do NOT apply ad-hoc revokes to this possibly non-app backend.
- Existing policies on legacy `order_items`, `products`, `stores` call `owns_store` / `is_admin`; any grant fix needs function-body and call-path review to avoid breaking the app.
- Legacy `product-images` bucket is public, 5 MiB, MIME allowlist JPEG/PNG/WebP; object count is 0. No Storage files were available to back up.
- Supabase performance advisor reported 7 auth-initplan warnings, 7 unused-index informational notices and one multiple-permissive-policy warning; these are not launch blockers and should be reviewed later.

### Backup / Release decision
- No connected Supabase backup/export/restore or Storage object download/list action was found. A query result or schema listing is NOT a full backup.
- No production migration, SQL write, privilege change, Storage mutation, PR merge, or Production deploy was performed.
- **HARD STOP:** Do not apply PR #3 release bundle to `onqadpqdontbdvecnvby`; its schema is incompatible and it is not the Supabase ref configured in Lovable. Do not attempt to access `htsvvotamlxlkncksssq` through another project ID.
- The new preview from previous session remains READY at `https://allify-chattogram-gyp2417d4-allify.vercel.app`; current commit Vercel status is success, but exact current Preview deployment URL was not re-resolved in this session.
- Production Vercel remains on main's previously recorded commit `6f3ba9e768de476ac9a2d89eda5b523087e8f760`; no production deploy was made.

## Next exact actions
1. Resolve the correct configured backend ref `htsvvotamlxlkncksssq` and obtain read-only/backup access to that exact Production project; Lovable FREE/out-of-credits and Supabase permission denial currently block this.
2. Obtain a complete database backup plus Storage object backup and verify restore before any writes.
3. Audit the actual configured Production schema, migration history, function grants, RLS and Storage policies; compare with test project migrations `0000`–`0024` and release bundle.
4. Continue safe code/Preview review independently; do not merge PR #3 or deploy Production until backend identity, backup, schema and release gates are verified.

- Additional Lovable roadmap evidence (project source, latest visible project commit `24740138edea698f794c036b3b126c274fed3d6c`): checkout is still demo-only/browser-local and real-store carts are explicitly unavailable; signed-in buyer/seller/admin end-to-end tests remain unchecked because no real seller store/admin account exists. This is a launch-critical frontend/integration gap, even though backend test migrations have extensive transactional rehearsal.


## Latest step-by-step execution — live verification (2026-11-21)
### STEP 1 — Production backend identity: still BLOCKED
- Live Lovable project read at commit `24740138edea698f794c036b3b126c274fed3d6c`; its `.env` contains Supabase project ref `htsvvotamlxlkncksssq` (only ref recorded; no secrets copied).
- Live Supabase `list_projects` still returns only `onqadpqdontbdvecnvby` (Allify legacy) and `ltwobqpgxmkeylmpkogq` (allify-test). Configured ref `htsvvotamlxlkncksssq` is absent; direct `get_project` for that ref returned permission denied previously.
- Lovable workspace is FREE; project is published but `needs_attention / out_of_credits`. No DB export/backup tool is exposed by available Lovable actions.
- Do not use either connected Supabase project as a substitute for the app's configured backend.

### STEP 2 — Backup & recovery: NOT STARTED / BLOCKED
- No full Production DB backup or Storage object export has been created or verified.
- No restore test performed. No Production writes performed.

### STEP 3 — Security audit: PARTIAL / NOT RELEASE-APPROVED
- The accessible legacy Supabase project audit findings remain relevant only to that separate project; do not apply fixes there as if it were the configured Production backend.
- Actual configured Production RLS, function grants, triggers and Storage policies cannot be freshly queried until correct project access is available.

### STEP 4 — Release preparation
- PR #3 release bundle exists and its preflight expects marketplace schema including `seller_stores`, `seller_applications`, `delivery_areas`, `place_order(jsonb,text,text,text,text,text,boolean)` and related types.
- Test project `allify-test` has migrations `0000`–`0024`; this is test evidence only, not proof of Production compatibility.
- No Production migration applied.

### STEP 5 — Feature review: critical frontend/source discrepancy found
- Live Lovable source at commit `24740138edea698f794c036b3b126c274fed3d6c` has roadmap stating checkout is demo-only/browser-local and real-store carts unavailable; signed-in buyer/seller/admin E2E remain unchecked.
- Lovable `src/components/marketplace/checkout-view.tsx` explicitly blocks real orders and only saves demo orders in browser local storage.
- GitHub PR branch source `src/routes/$page.tsx` contains a different implementation with authenticated `supabase.rpc("place_order", ...)` COD checkout, buyer order history, seller onboarding/product image upload and admin seller-application review.
- These two source snapshots are materially different; do not assume the Lovable published app and PR branch Preview are the same build/source state. The configured backend ref mismatch also remains unresolved.
- No source files were changed in this session; no Lovable edits attempted because workspace has no credits.

### STEP 6 — QA
- GitHub Actions run `44898286317` for latest branch head `1e51627bd109d56e20a04053c04601fd605fcfaa` completed SUCCESS.
- This is CI evidence only; no browser E2E or signed-in real checkout test was run in this session.
- Production runtime error query for deployment `dpl_6Lw476BEvQS6yU1uh4AMv1eSMUWh` over the latest 50 minutes returned no matching error/fatal logs. This does not prove end-to-end health.

### STEP 7 — Preview / Production
- PR #3 remains OPEN, mergeable, not merged; 30 commits, 18 files; latest head `1e51627bd109d56e20a04053c04601fd605fcfaa`.
- Combined commit status: Vercel SUCCESS.
- Existing Preview `dpl_9zVm1vhDCm3Q7G8w3YZSayGRUZAM` is READY at `https://allify-chattogram-gyp2417d4-allify.vercel.app`, but source commit is `5a7a6eb02379fa45494454845c9089866aadeb40`, not the latest head.
- Existing Production `dpl_6Lw476BEvQS6yU1uh4AMv1eSMUWh` is READY on `main`, commit `6f3ba9e768de476ac9a2d89eda5b523087e8f760`; alias `https://allify-chattogram.vercel.app`.
- No PR merge, Production deployment, environment change, database write, or Storage mutation performed.

### Current next exact action
- Continue read-only source/release review and determine the supported way to regain authorized access to the exact Lovable-configured Supabase ref `htsvvotamlxlkncksssq`.
- Before a launch decision, reconcile the distinct Lovable published source (demo-only checkout) and GitHub PR branch (RPC-backed checkout), then verify which code is actually deployed to Preview and connected to the intended backend.
- Keep PR #3 unmerged and Production unchanged until backend identity, restorable backups, live preflight and real signed-in E2E all pass.


## Autonomous execution re-verification — 2026-11-21 17:43 +06
- Re-read the consolidated checkpoint and revalidated PR #3 through GitHub: OPEN, mergeable, not merged; base `main`; head `5b21acb3cefef8baba501edab1294b55857df22e`; 18 changed files. No submitted reviews or inline review threads were returned.
- GitHub Actions run `44898487307` for the exact head completed with conclusion `success`.
- Combined commit status reports Vercel `success`.
- Vercel Preview deployment `dpl_E6ABMfxmqrD2YBGraKU3brWnM7JZ` is `READY`, URL `https://allify-chattogram-g9ocizku3-allify.vercel.app`, exact source commit `5b21acb3cefef8baba501edab1294b55857df22e`. It is a Preview deployment (`target=null`), not Production.
- Production deployment `dpl_6Lw476BEvQS6yU1uh4AMv1eSMUWh` remains `READY` on `main` at `6f3ba9e768de476ac9a2d89eda5b523087e8f760`, alias `https://allify-chattogram.vercel.app`. No Production promotion or deployment was performed.
- Read-only source review confirmed the PR branch route calls authenticated `place_order` RPC for COD checkout, reads buyer order history, provides seller application/product/image-upload flows and admin seller-application review. This code-level presence is not proof of live backend connectivity or end-to-end success.
- Rechecked accessible Supabase project listing: only legacy `onqadpqdontbdvecnvby` and test `ltwobqpgxmkeylmpkogq` are visible. The Lovable-configured ref `htsvvotamlxlkncksssq` remains unavailable to the connected Supabase account. No backup/export/restore capability was exposed.
- Hard release gates remain unchanged: obtain owner-authorized access to the exact configured backend, a complete restorable database backup plus separate Storage-object backup, fresh live preflight, and signed-in buyer/seller/admin E2E. No DB writes, migrations, PR merge, or Production deployment were performed.
- No application source changes were made in this verification pass; only this checkpoint update records newly verified evidence.
