# ALLIFY — Chattogram Digital Bazaar

Bengali-first multi-vendor marketplace for Chattogram, Bangladesh.

## Current implementation

- Bengali-first responsive storefront and home page
- Category browsing, product search and product detail views
- Local browser cart and authenticated COD checkout using the server-side `place_order` RPC
- Email/password sign-up, sign-in, customer account and order history
- Seller application workflow and seller product publishing
- Admin seller-application review through the protected `review_seller_application` RPC
- Admin controls for marketplace categories and Chattogram delivery areas/fees
- Seller stock and product visibility controls; admin product moderation and order-item status controls
- Chattogram delivery areas and BDT pricing
- Seed/demo catalog and demo labels

## Important launch limitations

This is a functional MVP, not yet verified as a fully launch-ready commercial marketplace. As of 2026-11-24, the Vercel production deployment is READY, production environment-variable entries are configured with comments identifying Supabase project ref `onqadpqdontbdvecnvby`, the admin account has an assigned admin role, all 19 public tables have RLS enabled, and the live database contains 8 categories and 27 delivery areas. Seller applications, stores, products and orders are currently empty. Do not claim end-to-end checkout, seller image upload, or order lifecycle testing as complete until each is tested in a real signed-in buyer/seller/admin browser session. The admin order screen updates individual order items; the production `sync_order_status_from_items` trigger/function is present and its status-derivation logic has been reviewed. End-to-end order lifecycle testing is still outstanding. Never allow public signup to self-assign admin.

The GitHub Actions build currently runs with Bun. A successful build confirms compilation, not complete end-to-end behavior.

## Database migrations and Production release safety

The files `drizzle/migrations/0002_product_image_bucket.sql` and `drizzle/migrations/0003_order_status_lifecycle.sql` are early baseline migrations. Their presence in the repository is **not** authorization to apply or reapply them; inspect the exact database's migration state read-only first.

The current GitHub release candidate is `supabase/releases/2026-11-20_allify_release.sql`, which consolidates migrations `0004`–`0029` with preflight and postflight assertions. It has been rehearsed on the isolated `allify-test` project only. It has **not** been applied to Production. Do not use this bundle against Production until all of the following are independently verified:

1. The configured Production backend identity and owner-authorized access.
2. A recent, restorable full database backup, a separate export of Storage objects, and a successful restore rehearsal.
3. A fresh read-only schema, RLS, grants and migration-state preflight on that exact Production project.
4. Signed-in Buyer, Seller and Admin end-to-end tests against the intended release source.
5. Reconciliation of the Lovable-published source with the GitHub candidate.

The current Vercel project environment-variable records identify `onqadpqdontbdvecnvby` as the Production backend. The connected Supabase project `onqadpqdontbdvecnvby` is the project used for the current production configuration; the isolated test project `ltwobqpgxmkeylmpkogq` remains separate and must not be substituted. The older Lovable-managed ref recorded in historical notes is stale for this deployment. A GitHub commit or Vercel/Cloudflare deployment does not apply database migrations automatically. Before any risky production DDL, take and verify a restorable database backup and separately export Storage objects.

## Integrations

- Cash on delivery only; no online payment gateway is configured.
- No courier API or production email/SMS integration is configured.
- Seller image uploads use the `product-images` public Supabase Storage bucket. The production bucket accepts JPG, PNG and WebP up to 5 MB. Production Storage policies now validate the three-part user/store/product path and active store ownership for seller upload/update; public image URLs are readable by design. A real signed-in seller upload has not yet been end-to-end tested.
- Missing local product images fall back gracefully in the UI.

## Stack

- TanStack Start, React, TypeScript, Tailwind CSS
- Supabase Auth and PostgreSQL
- Bun package manager and lockfile

## Security

- Never commit `.env`, credentials, access tokens, or Supabase service-role keys.
- The unsafe first-user admin-claim function was removed from the live database and by migration `0001_remove_first_admin_claim.sql`.
- The initial admin role has been assigned to the verified account in the current connected project. Do not add a public signup/admin-claim RPC or grant admin to another account without explicit owner authorization.
- All 19 public tables were verified to have RLS enabled on 2026-11-24. Continue reviewing policies and SECURITY DEFINER RPC authorization before launch.

## Build and test

```sh
bun install --frozen-lockfile
bun run lint
bun run build
bun run test
```

## Cloudflare Workers deployment (secondary; currently unverified)

Cloudflare is a separate deployment path from the existing Vercel project. On PR #3 head `ba9f1de740167283d6314264a6b9355c11358127`, the Cloudflare Workers Builds checks for services `allify` and `allifychattogram` both reported failure, while GitHub Actions and the Vercel Preview succeeded. The authorized connector exposes the build IDs but not the detailed Cloudflare dashboard logs. A successful Vercel build does not prove Cloudflare is healthy. Do not claim Cloudflare readiness or change its configuration without reviewing those logs.

If Cloudflare remains the intended secondary deployment path, the reference setup is:

The production build uses the Nitro Cloudflare preset. Connect this GitHub repository to Cloudflare Workers Builds (no ZIP upload is needed):

- Repository: `shihabsami40-allify/allify`
- Production branch: `main`
- Build command: `bun run build`
- Deploy command: `bun run deploy`
- Build output is generated by Nitro; do not set a separate static output directory.

Set these public build-time variables in the Cloudflare build settings using the Supabase project's public URL and publishable key:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Also set these Worker runtime variables for server-side Supabase requests:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`

Only use the Supabase publishable/anon key in the browser. Never put a service-role key in build variables or client code. The Supabase URL and publishable key must come from the connected project; do not guess them.

Cloudflare account authorization and connecting the GitHub repository are account-owner actions. After the first setup, pushes to `main` can trigger deployment automatically. Account authorization, GitHub-to-Cloudflare connection, production variables and first deployment require the account owner. Free-plan limits apply; check current Cloudflare limits before a public launch.
