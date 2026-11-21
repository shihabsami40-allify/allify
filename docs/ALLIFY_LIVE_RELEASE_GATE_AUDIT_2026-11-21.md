# ALLIFY — Live Release Gate Audit
Updated: 2026-11-21

## Scope
Read-only live verification performed against the existing Lovable ALLIFY project, GitHub PR #3, and the existing Vercel project. No Production database writes, migrations, Storage mutations, PR merge, or Production deployment were performed.

## GitHub and CI
- Repository: `shihabsami40-allify/allify`
- PR #3: OPEN, mergeable, not merged.
- Branch: `allify-order-lifecycle-2026-11-20`
- Head: `329c7069380dd86bc1c6e3ba40eb10d4150a5887`
- GitHub Actions run `44901623913`: completed, conclusion `success`.
- Combined commit status: Vercel `success`.

## Vercel
- Latest Preview deployment: `dpl_4goMvnyFB9UmppcFxhMYJ5QTKNiu`
- Preview URL: https://allify-chattogram-cbpnovk9h-allify.vercel.app
- State: READY; target is Preview (target=null); commit is `329c706...`.
- Production domain: https://allify-chattogram.vercel.app
- Current Production deployment: `dpl_6Lw476BEvQS6yU1uh4AMv1eSMUWh`
- Production state: READY; target=production; branch `main`; commit `6f3ba9e768de476ac9a2d89eda5b523087e8f760`.
- Preview is not Production and does not verify live buyer/seller workflows.

## Lovable project
- Project ID: `123f5b35-4f29-4afa-8018-2e20465d2648`
- Database status: enabled (Supabase).
- Project agent status: `needs_attention / out_of_credits`; do not assume Lovable AI edits can proceed.

## Fresh read-only Production RPC privilege audit
The Lovable database read-only query returned:
| Function | authenticated EXECUTE | anon EXECUTE | PUBLIC EXECUTE |
|---|---:|---:|---:|
| `place_order(jsonb,text,text,text,text,text,boolean)` | false | false | false |
| `review_seller_application(uuid,boolean,text)` | true | false | false |
| `has_role(uuid,app_role)` | true | true | true |
| `owns_store(uuid)` | true | true | true |
| `sync_order_status_from_items()` | false | false | false |

Implications:
- Authenticated buyer checkout via `place_order` is currently blocked by missing EXECUTE permission.
- `has_role` and `owns_store` are directly executable by anon/PUBLIC. These helper functions need least-privilege grants and their behavior must be reviewed; the release SQL includes revocations from anon/PUBLIC and authenticated-only grants.
- Do not assume these issues are fixed until the migration is safely applied and the same live privilege query passes afterward.

## Release bundle review
- File: `supabase/releases/2026-11-20_allify_release.sql`
- The bundle includes the intended authenticated-only grant for `place_order`, revocations for `has_role` and `owns_store`, authenticated-only cancellation/review RPC grants, and postflight assertions.
- Bundle header explicitly says it has NOT been applied to Production and requires a restorable backup plus read-only preflight.
- Isolated `allify-test` rehearsal is not proof of Production compatibility.

## Blocking release gates
1. No verified full restorable Production database backup is available in the connected tools.
2. No separate verified export/backup of Production Storage objects is available.
3. No restore rehearsal has been performed.
4. Production migration preflight and postflight must be completed against the actual Production schema.
5. The checkout and helper-function grants must be corrected only after backup and preflight gates pass.
6. Lovable source and GitHub PR branch have known implementation differences; reconcile the final Production source before release.
7. Signed-in Buyer, Seller, and Admin end-to-end tests against a safe test backend remain required.

## Actions deliberately not taken
- No Production SQL write or migration.
- No Production Storage mutation.
- No PR merge.
- No Production deployment or environment-variable change.
- No substitution of either connected Supabase project (`onqadpqdontbdvecnvby` or `ltwobqpgxmkeylmpkogq`) for the Lovable-managed Production database.

## Next safe actions
1. Obtain a complete restorable Production DB backup and a separate Storage object backup through the supported Lovable/Supabase owner workflow.
2. Verify restore capability.
3. Re-run schema, migration-history, RLS, function-definition, and grant preflight against Production.
4. Apply the reviewed release pack only after all backup/preflight gates pass.
5. Re-run privilege postflight and role-based E2E tests.
6. Merge PR #3 and deploy to the existing Vercel Production project only after all release gates pass.

## Status
IN PROGRESS — CI and Preview build pass, but Production checkout grants, helper-function exposure, backup/restore evidence, source reconciliation, and role-based E2E verification remain release blockers.
