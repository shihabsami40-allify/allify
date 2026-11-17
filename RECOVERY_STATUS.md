# ALLIFY recovery status

Source: Lovable project revision 2374410ebdb39a274e68fc9cade5cd64fb4dd54b
Recovery branch: allify-recovery-2026-11-17

## Recovered
- Text source, route, test, configuration, and migration files from the Lovable revision have been added to this branch.
- The existing main branch was not changed.
- No database migration or production deployment was run.

## Database verification
- The Lovable project's own environment configuration points to Supabase project ref `htsvvotamlxlkncksssq`.
- The existing Vercel project's `VITE_SUPABASE_URL` and `SUPABASE_URL` values were independently checked and point to the same `htsvvotamlxlkncksssq` project.
- The separately connected Supabase dashboard project `onqadpqdontbdvecnvby` is a different project, not the database currently configured for the Lovable/Vercel app.
- The Lovable-managed database contains 13 public tables and existing marketplace records (including 24 products, 6 stores, 6 orders, and 2 seller applications at the time of inspection). The separate `onq...` project has a different, smaller schema and is not being substituted.
- No database data was moved, changed, or deleted. Do not switch environment variables or apply migrations without a deliberate schema/data migration plan.

## Still required before a safe deployment
- Restore the 18 binary assets listed in the Lovable project (favicon, product images, and catalog/hero images). They were not copied because the available file reader exposes binary files as lossy text, which cannot safely be committed as image bytes.
- Run a clean install, production build, tests, and authenticated buyer/seller/admin checks against the intended database.
- Resolve outstanding security findings and confirm the real order/payment flow before public launch. The current checkout component is explicitly demo-only and stores demo orders in the browser; real-store checkout is not enabled.
- Connect the Vercel project to the intended GitHub repository/branch only after the source tree is complete and build-tested. The existing Vercel project currently has no linked Git repository, and its latest production deployment is in ERROR state.

## Environment
See .env.example for required variable names only. Never commit .env or real keys.
