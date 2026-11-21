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
- Latest known PR head: f1d41d594907555c067c8172502c721e268d9194; PR open, not merged at checkpoint.
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
