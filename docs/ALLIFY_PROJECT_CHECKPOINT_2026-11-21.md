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


## One-hour autonomous execution — fresh verification (2026-11-21)
- Re-fetched PR #3: OPEN, mergeable, not merged; latest head `aedbd91c50ac9cd01496294fd1a0cf6e543a337a`.
- GitHub Actions run `44900553496` on the exact head completed SUCCESS. Job steps explicitly show Install dependencies, Build application, and Run tests all completed successfully.
- Vercel combined status for the exact head is SUCCESS. Latest Preview deployment `dpl_7HJVoAZ5b6Z1JNr4mHUPDG7Ua1A1` is READY at https://allify-chattogram-d7lkbsmr2-allify.vercel.app and points to the exact `aedbd91` commit. This remains Preview only.
- Vercel environment audit (values disclosed only for non-secret Supabase URL): production/general `VITE_SUPABASE_URL` is `https://htsvvotamlxlkncksssq.supabase.co`; branch-specific Preview `VITE_SUPABASE_URL` and `SUPABASE_URL` for `allify-order-lifecycle-2026-11-20` are `https://ltwobqpgxmkeylmpkogq.supabase.co`. The branch Preview is intentionally isolated to allify-test; it is not connected to Production.
- Vercel Production deployment remains READY on `main` at commit `6f3ba9e768de476ac9a2d89eda5b523087e8f760` and serves https://allify-chattogram.vercel.app. No Production deployment was made.
- Lovable project database status reports enabled (Supabase). One read-only identity probe succeeded and returned database `postgres` with database role `postgres` at 2026-11-21 17:50 +06. Subsequent metadata-audit SELECT was rejected before execution by the Lovable Free-plan MCP database action limit (retry window 5 minutes); no metadata audit was run and no data was changed.
- Lovable project remains `needs_attention / out_of_credits`; workspace plan remains Free. Supabase connector still denies access to configured Production project ref `htsvvotamlxlkncksssq`. No full database backup, Storage object export, or restore-test action is available in the connected tool surface.
- Static read-only source comparison confirms GitHub `main` still has the older order-lifecycle implementation, while PR #3 contains the protected cancellation workflow and associated security hardening. The Lovable published snapshot remains a separate demo-only checkout implementation. Do not assume these snapshots are interchangeable.
- The exact Preview build logs show successful Vite client, SSR and Nitro builds. Only non-blocking warnings were emitted: tsconfig-path plugin redundancy and a client chunk larger than 500 kB. No Preview runtime logs were returned in the sampled 50-minute window; that is not an end-to-end test.
- No source changes, database writes, migrations, PR merge, or Production deployment were performed during this verification pass.
- Release gates remain: complete restorable Production database backup plus separate Storage object backup; fresh Production schema/RPC/RLS/Storage preflight; reconcile source/deployment; signed-in buyer/seller/admin end-to-end verification. Do not merge PR #3 or deploy Production until these gates are satisfied.


## Final launch completion pass — fresh audit (2026-11-21)
- PR #3 rechecked: OPEN, mergeable, not merged; latest head before this checkpoint update was `35256e33bdda2758c1249b28c79057cc2e1d0dd9`; 18 changed files.
- GitHub Actions run `44901094061` for that exact head completed SUCCESS; Install dependencies, Build application and Run tests all passed. Combined Vercel status SUCCESS.
- Exact-head Vercel Preview deployment `dpl_GRA1CGRAgV7NiwMXYiZDJvP9kDN8` is READY at https://allify-chattogram-nqpys5fo4-allify.vercel.app. Target remains Preview (null), not Production.
- Lovable project remains published but `needs_attention / out_of_credits`; workspace Free.
- One fresh read-only Lovable database audit succeeded against the Lovable-managed database `postgres`. It confirmed the expected core marketplace tables exist: categories, delivery_areas, order_items, orders, product_images, products, seller_applications, seller_stores, user_roles. RLS is enabled on all eight checked sensitive tables (delivery_areas, order_items, orders, product_images, products, seller_applications, seller_stores, user_roles). The product-images bucket is public with 5 MiB limit and JPEG/PNG/WebP MIME allowlist. Drizzle migration journal exists; Supabase/public schema migration journals queried were absent.
- CRITICAL live checkout grant finding: `place_order(jsonb,text,text,text,text,text,boolean)` is SECURITY DEFINER, but authenticated EXECUTE=false and anon EXECUTE=false. Seller review RPC authenticated EXECUTE=true and anon=false. This explains a real checkout blocker unless corrected. The release pack contains the intended authenticated-only grant and postflight assertion, but it has NOT been applied.
- No backup-list/export/restore capability was exposed in available Lovable tools. No complete restorable Production database backup or separate Storage-object backup has been created or verified. Do not apply release migrations without this.
- Source/deployment discrepancy remains: Lovable published snapshot is a different demo-only checkout implementation; PR #3 branch contains the RPC-backed checkout and hardened order lifecycle. The current Vercel Preview is branch-isolated to test Supabase ref `ltwobqpgxmkeylmpkogq`, while general/Production Vercel `VITE_SUPABASE_URL` is configured for `htsvvotamlxlkncksssq`. Do not treat Preview as connected to Production.
- No buyer/seller/admin signed-in browser E2E was run in this pass; no real test accounts were created. CI and isolated migration rehearsal are not substitutes for these tests.
- No DB writes, migrations, Storage mutations, PR merge, Production deployment, or environment changes were performed.
- Release gates remain: obtain verified complete Production DB + Storage backup/restore; resolve authorized owner access to the configured Production Supabase ref; apply only reviewed release pack after preflight; verify authenticated `place_order` grant and other RLS/RPC/storage policies; reconcile deployed source and backend; run signed-in Buyer/Seller/Admin E2E; only then merge and deploy Production.

## Latest session update — 2026-11-21 (buyer cancellation)
- Added buyer-side cancellation UI in `src/routes/$page.tsx`; only pending, non-demo line items show the action.
- Added `drizzle/migrations/0020_buyer_order_cancellation.sql`; updated `supabase/releases/2026-11-20_allify_release.sql` with the same function and a postflight assertion.
- RPC authorization now permits a buyer to cancel only their own pending item (and retry an already-cancelled item idempotently). Sellers/admins retain their existing pending/confirmed cancellation permissions. Demo orders remain blocked.
- Applied the migration only to isolated test project `ltwobqpgxmkeylmpkogq`; transactional tests passed for unauthorized-user denial, buyer pending cancellation, stock/sold-count restoration, idempotent retry, buyer denial on confirmed item, seller cancellation of confirmed item, and parent-order status synchronization. All fixture rows rolled back; verification returned 0 auth users and 0 `TEST-BC-*` orders.
- Test project confirms `cancel_order_item(uuid)`: authenticated EXECUTE=true, anon EXECUTE=false. Supabase security advisor reports the expected authenticated SECURITY DEFINER RPC warning; this function intentionally needs a protected definer context to restore stock atomically.
- Latest PR #3 head after code/release commits: `9efdb61c16c0a06c48fd1aa3006d28331cd4f22a`. GitHub Actions run `44904086214` completed SUCCESS; Vercel status SUCCESS. Exact-head Preview `dpl_8mPezuAiwkRrpgGSkkSoaF8Rm6BL` is READY at https://allify-chattogram-g67c6u00o-allify.vercel.app; target remains Preview, not Production.
- Audit documentation was refreshed in commit `d496c0b7c6e73e642cbb23db08bc5c2139b37d43`; its docs-only Preview/CI must be rechecked separately.
- Production database, Storage, PR merge, Production deployment, and environment variables remain untouched. Production backup/access, live grant preflight, source reconciliation, and signed-in Buyer/Seller/Admin browser E2E remain release blockers.

## Follow-up hardening — 2026-11-21
- Added allowlist and client-side validation to seller product updates in `src/routes/$page.tsx`: only title, price, stock, and status fields are accepted; title length, positive finite price, integer stock bounds, and allowed product statuses are checked before the Data API update.
- Commit: `2fe545e8628ee48da2efa9198a17c13dfa7f3c22` (`fix: validate seller product edits before database update`).
- At checkpoint update time: GitHub Actions run `44905195973` was in progress at dependency installation; exact-head Vercel Preview `dpl_AkNrJwiQFv2gYosVV8dPGGBFdgmP` was BUILDING. Recheck both before calling this change verified.

## Follow-up hardening — 2026-11-21 (order transitions and buyer labels)
- Buyer order history now displays localized Bengali status labels instead of raw internal status keys.
- Seller and admin order handlers now validate each transition against the item's current state: pending → confirmed/cancelled; confirmed → shipped/cancelled; shipped → delivered. Invalid jumps and terminal-state changes are rejected before issuing a Data API update.
- Non-cancellation updates include the current status in the update filter to reduce stale-state/race overwrites. Cancellation continues through the atomic cancel_order_item RPC.
- Commit: dde23b3c3eb0bca2459ab69d0f7a1a268052c4e9 (fix: enforce valid order status transitions in dashboards).
- Exact-head GitHub Actions run 44905507985 completed SUCCESS (install, build, test all successful); exact-head Vercel Preview dpl_7Wtz4UfscfJCR36GTEY6Xf1hJDZS is READY at https://allify-chattogram-fgxjh6kn3-allify.vercel.app. Deployment target is Preview, not Production.
- PR #3 remains open. Production database/Storage, merge, environment variables, and Production deployment remain untouched.
## Checkout validation hardening — 2026-11-21
- Checkout now validates cart size (1–50), unique product IDs, integer quantities (1–99), demo-product exclusion, recipient length (2–100), Bangladesh mobile format, active delivery-area selection, address length (5–300), and note length (max 500) before calling the order RPC.
- Checkout submit now prevents duplicate submissions while a request is already in progress; submitted text values are trimmed and normalized.
- Checkout form controls now mirror the server-side field limits and use numeric input mode for the mobile number.
- Exact code commit: 5c9061ebea4760859b5bccc5d95f8521c6d5a7ca (ui: align checkout field limits with order validation). GitHub Actions run 44905629384 completed SUCCESS (build and tests); exact-head Vercel Preview dpl_HQxFqwBXQNtutAM6JoxcZHMDY4yR is READY at https://allify-chattogram-dyry0jcth-allify.vercel.app.
- This is client-side validation for clearer feedback; the database RPC remains authoritative for stock, product availability, delivery-area validity, and order creation. No Production changes were made.
## Checkout idempotency hardening — 2026-11-21
- Found that the UI called the legacy seven-argument place_order RPC, while the isolated test DB had an eight-argument idempotent overload; the release pack did not yet include that newer contract. Reconciled the app, migration and release pack.
- Added drizzle/migrations/0021_idempotent_checkout_requests.sql: nullable checkout_request_id, unique customer/request index, advisory transaction lock, retry returns the already-created order number, duplicate product line rejection, and stricter null/format checks.
- Checkout now creates a stable request UUID for an unchanged cart + buyer + delivery details and reuses it on retry after an uncertain network response; successful checkout clears the key.
- Included migration 0021 and postflight assertions in supabase/releases/2026-11-20_allify_release.sql.
- Applied migration only to isolated test project ltwobqpgxmkeylmpkogq. Verified authenticated EXECUTE=true, anon EXECUTE=false, unique index exists, advisory retry lock present, duplicate item guard present. Transactional negative tests confirmed duplicate products and null phone are rejected. No fixtures or orders were created.
- Security advisor reports expected authenticated SECURITY DEFINER RPC warnings, including place_order and cancel_order_item; anon execution is false for the new idempotent signature. These warnings are documented, not silently ignored.
- Code/release migration commits: 53831f9e44ef3fc9b828ca914df75a6bd40b96eb (migration 0021), 75fdadad81570ed16acc59163c762e10c372d2fa (frontend idempotency key), 8c6f76a707b98c4fa261fbfdfe392dd61838f2d2 (release pack). Build/Preview checks for the combined latest head pending at checkpoint update.
- Production was not accessed or modified; the test project's schema is not proof of Production schema compatibility. Production backup/preflight gates remain.

## Additional security hardening — 2026-11-21
- Read-only inspection of the isolated `allify-test` database found that the legacy seven-argument `place_order(jsonb,text,text,text,text,text,boolean)` overload remained executable by authenticated users alongside the new request-ID overload.
- The current checkout UI calls only the eight-argument request-ID overload. Leaving the legacy overload enabled would permit authenticated callers to bypass retry idempotency.
- Updated `drizzle/migrations/0021_idempotent_checkout_requests.sql` and the consolidated release SQL to revoke the legacy overload from PUBLIC, anon, and authenticated; retained authenticated-only execution for the request-ID overload.
- Updated release postflight assertion to fail if the legacy overload remains executable.
- Applied only the REVOKE statement to isolated test project `ltwobqpgxmkeylmpkogq`; verified legacy overload effective EXECUTE is false for authenticated/anon/PUBLIC, while request-ID overload remains authenticated=true, anon=false, PUBLIC=false.
- No Production database was accessed or changed. Latest branch CI/Preview must be rechecked after these commits.

## Anonymous Data API least-privilege hardening — 2026-11-21
- Audited all public-schema RLS tables and found the isolated test database still granted the `anon` role broad table-level operations (including INSERT/UPDATE/DELETE) even though RLS policies restricted row access.
- Added migration `0022_minimize_anon_table_grants.sql`: revoke all anonymous table privileges across the public schema, then grant SELECT only on the public catalog tables (`categories`, `delivery_areas`, `products`, `seller_stores`, `product_images`). Existing RLS policies continue to filter visible rows.
- Applied migration 0022 only to isolated `allify-test` project. Re-queried effective grants: exactly those five public catalog tables retain SELECT; no anonymous INSERT/UPDATE/DELETE/TRUNCATE/etc. remain.
- Added the same SQL and postflight assertions to the consolidated release bundle. Production was not touched.
- New commits: migration `ebb3f5c`; release bundle `159c73e`. CI and Preview for the latest head must be rechecked.


## Authenticated TRUNCATE privilege hardening — 2026-11-21
- Read-only audit of isolated `allify-test` found authenticated API role retained table-level `TRUNCATE` on all 11 public tables, including `user_roles`, `seller_stores`, orders and products. RLS does not govern TRUNCATE, so row policies alone cannot protect these tables from this table-wide operation.
- Added `drizzle/migrations/0023_revoke_authenticated_truncate.sql`: revoke TRUNCATE on all public-schema tables from `authenticated` and fail migration if any such grant remains.
- Applied migration only to isolated project `ltwobqpgxmkeylmpkogq`; post-check returned `remaining_authenticated_truncate_grants = 0`.
- Added the same revoke and a release postflight assertion to `supabase/releases/2026-11-20_allify_release.sql`; updated release pack label to `0004-0023`.
- Production remains untouched. Re-run CI and exact-head Preview checks after these commits. This isolated-test result is not evidence that Production has the same grants or that the Production release is ready.


## API role DDL/sequence least-privilege hardening — 2026-11-21
- Continued the isolated allify-test grant audit after removing anonymous writes and authenticated TRUNCATE. Found API roles still held table-level TRIGGER/REFERENCES grants across public tables, and both anon/authenticated had USAGE on public.order_no_seq.
- Confirmed the app's checkout flow obtains order numbers only through the SECURITY DEFINER place_order RPC; clients do not need direct sequence privileges. The function owner retains sequence access.
- Added migration 0024_revoke_unneeded_api_ddl_and_sequence_grants.sql: revoke TRIGGER and REFERENCES from anon/authenticated across public tables, and all direct public sequence privileges from both API roles. Added catalog-based postflight assertions.
- Applied migration only to isolated test project ltwobqpgxmkeylmpkogq. Verification shows no API-role TRIGGER/REFERENCES grants, no sequence grants, and effective checks for authenticated order sequence USAGE, anon order sequence USAGE, authenticated orders TRIGGER and REFERENCES all return false.
- Authenticated DML permissions remain as expected for RLS-governed application flows; anon retains SELECT only on the five public catalog tables. No Production database was accessed or changed.
- Added migration and release postflight to consolidated release pack; pack label now 0004-0024. CI and exact-head Preview pending after latest commit.


## Future API default privilege hardening — 2026-11-21
- Audited PostgreSQL default ACLs after tightening current grants. Found postgres-owned future public objects would otherwise regain broad anon table DML, API TRIGGER/REFERENCES, sequence grants, MAINTAIN, and default function EXECUTE.
- Added migrations 0025 and 0026 to tighten defaults for objects created by role postgres: remove anon's default table privileges, remove API TRUNCATE/REFERENCES/TRIGGER/MAINTAIN and sequence grants, and revoke default function EXECUTE from PUBLIC/anon/authenticated. Intended application RPCs must now receive explicit grants in their migrations.
- Applied both migrations only to isolated allify-test project ltwobqpgxmkeylmpkogq. Post-check shows no postgres default API sequence grants, no anon default table privileges, no API default MAINTAIN, and no PUBLIC/anon/authenticated default function EXECUTE. Existing app DML grants remain as currently required under RLS.
- Added both migrations and postflight assertions to consolidated release SQL; bundle label now 0004-0026. These default-ACL changes apply to postgres-created objects only; the Supabase-managed supabase_admin defaults were not changed.
- Production remains untouched. Latest branch CI and Preview checks are pending.


## Global default RPC EXECUTE hardening — 2026-11-21
- Transactional probe of a newly created public function exposed PostgreSQL's global default EXECUTE grant to PUBLIC; the schema-scoped revoke in migration 0026 alone did not cancel this global grant. Corrected by adding migration 0027, which revokes EXECUTE globally for functions created by postgres and asserts both global and public-schema default ACLs.
- Applied only to isolated allify-test project. Created a temporary function inside a transaction, verified anon EXECUTE=false and authenticated EXECUTE=false, then rolled the transaction back; no probe function remains.
- Bundled migration 0027 and its postflight assertion into the release SQL; pack label now 0004-0027. This means new intended RPCs must be granted explicitly by their migrations.
- Note: schema-specific default ACLs owned by Supabase-managed supabase_admin were not modified. Production remains untouched.


## Release SQL postflight correction and validation — 2026-11-21
- Re-reviewed the complete consolidated release SQL after adding migrations 0023–0027 and found two issues in the assembled postflight block: the new assertions had been inserted before DECLARE/BEGIN, and the checkout assertion still expected the retired seven-argument place_order RPC to be executable.
- Corrected the DO block structure so declarations precede BEGIN and all assertions execute inside the block. Corrected checkout grant assertion to require authenticated EXECUTE only on the new eight-argument idempotent RPC and no EXECUTE for anon or either role on the legacy seven-argument overload.
- Executed the corrected postflight block against isolated allify-test in a transaction, temporarily dropping the obsolete first-admin claim function to simulate migration 0017, then rolled the transaction back. All postflight assertions passed; no test schema/data change persisted.
- Latest exact-head Preview commit before this correction was READY and GitHub CI passed (run 44907283795). New commits from these release SQL fixes are awaiting CI/Preview.
- Production remains untouched; full release pack has not been applied to Production.
