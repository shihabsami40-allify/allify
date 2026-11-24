# ALLIFY — Chattogram Digital Bazaar

Bengali-first multi-vendor marketplace for Chattogram, Bangladesh.

## Current implementation

- Bengali-first responsive storefront and home page
- Category browsing, product search and product detail views
- Local browser cart and authenticated COD checkout using the server-side `place_order` RPC
- Email/password sign-up, sign-in, customer account and order history
- Seller application workflow and seller product publishing
- Admin seller-application review through the protected `review_seller_application` RPC
- Seller stock and product visibility controls; admin product moderation and order-item status controls
- Chattogram delivery areas and BDT pricing
- Seed/demo catalog and demo labels

## Important launch limitations

This is a functional MVP codebase, not yet a fully launch-ready commercial marketplace. Before taking real orders, complete the deployment and live browser tests, set production environment variables, apply the pending migrations, create the first admin through a trusted Supabase dashboard/service-role process, and verify RLS and order workflows using customer, seller and admin accounts. The admin order screen updates individual order items; confirm the parent order status synchronization against the live database before launch. The initial admin must never be self-claimed through public signup.

The GitHub Actions build currently runs with Bun. A successful build confirms compilation, not complete end-to-end behavior.

## Database migrations and Production release safety

The files `drizzle/migrations/0002_product_image_bucket.sql` and `drizzle/migrations/0003_order_status_lifecycle.sql` are early baseline migrations. Their presence in the repository is **not** authorization to apply or reapply them; inspect the exact database's migration state read-only first.

The current GitHub release candidate is `supabase/releases/2026-11-20_allify_release.sql`, which consolidates migrations `0004`–`0029` with preflight and postflight assertions. It has been rehearsed on the isolated `allify-test` project only. It has **not** been applied to Production. Do not use this bundle against Production until all of the following are independently verified:

1. The configured Production backend identity and owner-authorized access.
2. A recent, restorable full database backup, a separate export of Storage objects, and a successful restore rehearsal.
3. A fresh read-only schema, RLS, grants and migration-state preflight on that exact Production project.
4. Signed-in Buyer, Seller and Admin end-to-end tests against the intended release source.
5. Reconciliation of the Lovable-published source with the GitHub candidate.

The configured Production backend is the Lovable-managed project ref `htsvvvotamlxlkncksssq`. The authorized Supabase connector currently denies access to that ref. The connected Supabase project `onqadpqdontbdvecnvby` and isolated test project `ltwobqpgxmkeylmpkogq` are separate projects and must never be treated as Production. Do not substitute either one. A GitHub commit or Vercel/Cloudflare deployment does not apply database migrations automatically.

## Integrations

- Cash on delivery only; no online payment gateway is configured.
- No courier API or production email/SMS integration is configured.
- Seller image uploads use the `product-images` public Supabase Storage bucket. Apply migration `0002_product_image_bucket.sql` before enabling uploads; the bucket accepts JPG, PNG and WebP up to 5 MB. Public image URLs are readable by design; upload/delete paths are restricted to the signed-in seller's user folder.
- Missing local product images fall back gracefully in the UI.

## Stack

- TanStack Start, React, TypeScript, Tailwind CSS
- Supabase Auth and PostgreSQL
- Bun package manager and lockfile

## Security

- Never commit `.env`, credentials, access tokens, or Supabase service-role keys.
- The unsafe first-user admin-claim function was removed from the live database and by migration `0001_remove_first_admin_claim.sql`.
- Bootstrap the initial admin only through a trusted dashboard/service-role process after confirming the exact Auth user's UUID. Never add a public signup/admin-claim RPC and never guess the account UUID. The app currently cannot verify an admin account until that role is assigned.
- Review row-level security policies before launch.

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
