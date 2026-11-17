# ALLIFY recovery status

Source: Lovable project revision 2374410ebdb39a274e68fc9cade5cd64fb4dd54b
Recovery branch: allify-recovery-2026-11-17

## Recovered
- Text source, route, test, configuration, and migration files from the Lovable revision have been added to this branch.
- The existing main branch was not changed.
- No database migration or production deployment was run.

## Still required before a safe deployment
- Restore the 18 binary assets listed in the Lovable project (favicon, product images, and catalog/hero images). They were not copied because the available file reader exposes binary files as lossy text, which cannot safely be committed as image bytes.
- Confirm the intended Supabase project. The Vercel project's existing environment variables currently point to project ref htsvvotamlxlkncksssq, while the separately connected Supabase dashboard project is onqadpqdontbdvecnvby. Do not switch either configuration until ownership, schema, and data are verified.
- Run a clean install, production build, tests, and authenticated buyer/seller/admin checks.
- Resolve outstanding security findings and confirm the real order/payment flow before public launch.

## Environment
See .env.example for required variable names only. Never commit .env or real keys.
