# ALLIFY — Live Release Gate Audit
Updated: 2026-11-21 (latest revalidation)

## GitHub / PR
- Repository: `shihabsami40-allify/allify`
- PR #3: OPEN, mergeable, not merged.
- Branch: `allify-order-lifecycle-2026-11-20`
- Latest verified head: `f0fb69f9904caf20228b0370d57efac9a5645583`
- Latest GitHub Actions run: `44902078608`, completed successfully.
- Combined commit status: Vercel `success`.

## Vercel
- Exact-head Preview deployment: `dpl_8mPezuAiwkRrpgGSkkSoaF8Rm6BL`
- Preview URL: https://allify-chattogram-g67c6u00o-allify.vercel.app
- State: READY; target is Preview (Vercel API target `null`), not Production; source commit matches the latest PR head.
- Production domain: https://allify-chattogram.vercel.app
- Production remains on `main`, commit `6f3ba9e768de476ac9a2d89eda5b523087e8f760`.
- Preview build success does not establish Production readiness or signed-in E2E correctness.

## Production database and security — last verified live audit
The latest available read-only Production audit recorded:
| Function | authenticated EXECUTE | anon EXECUTE | PUBLIC EXECUTE |
|---|---:|---:|---:|
| `place_order(jsonb,text,text,text,text,text,boolean)` | false | false | false |
| `review_seller_application(uuid,boolean,text)` | true | false | false |
| `has_role(uuid,app_role)` | true | true | true |
| `owns_store(uuid)` | true | true | true |
| `sync_order_status_from_items()` | false | false | false |

Implications: authenticated checkout is blocked by the recorded `place_order` grant state; `has_role` and `owns_store` have excessive anon/PUBLIC execution grants. These values must be re-read after a safely authorized migration before claiming remediation.

## Release bundle
- Reviewed SQL: `supabase/releases/2026-11-20_allify_release.sql` (updated to include migration 0020 buyer order cancellation).
- It includes authenticated-only access for the relevant RPCs, revocations from anon/PUBLIC for helper functions, and preflight/postflight assertions.
- The bundle was rehearsed on the isolated `allify-test` project; that is not proof of Production compatibility.
- No Production SQL write or migration has been performed.

## Production identity / backup gates
- Configured Production Supabase ref is `htsvvotamlxlkncksssq`; it was not present in the connected Supabase project's accessible list, and direct project access was denied.
- Do not substitute either accessible project (`onqadpqdontbdvecnvby` legacy or `ltwobqpgxmkeylmpkogq` allify-test) for Production.
- No verified full restorable Production database backup, separate Storage-object backup, or restore rehearsal is available in the connected tools.
- Lovable project agent previously reported `needs_attention / out_of_credits`; do not assume Lovable AI edits are available.
- Production database writes, Storage mutations, PR merge, and Production deployment remain deliberately unperformed. The buyer-cancellation migration has only been applied to the isolated test project.

## Latest code work — 2026-11-21
- Added buyer-side cancellation UI to the account order list; the action is shown only for the buyer's pending, non-demo order items.
- Added `drizzle/migrations/0020_buyer_order_cancellation.sql` and included the same guarded function update in the consolidated release pack.
- Authorization: a buyer can cancel only their own pending item (or retry an already-cancelled item idempotently); seller/admin cancellation of pending or confirmed items remains available. Demo orders remain blocked.
- Isolated `allify-test` project applied the new migration. Transactional tests passed: unrelated user denied; buyer pending cancellation succeeds; stock and sold count restore; retry does not double-restore; buyer cannot cancel confirmed item; seller can cancel confirmed item; parent order status synchronizes. All test fixtures rolled back; final check shows 0 auth users and 0 `TEST-BC-*` orders.
- Test DB function grants verified: authenticated EXECUTE=true, anon EXECUTE=false. Security advisor still reports intentional authenticated SECURITY DEFINER RPC warnings; do not misread those as anon access.

## Source and test reconciliation
- Lovable published source and GitHub PR source have known implementation differences, including demo-only checkout in the published Lovable snapshot versus Supabase RPC checkout in the PR branch.
- Signed-in Buyer, Seller, and Admin E2E tests against a safe test backend remain outstanding.
- CI and Preview are passing, but they do not replace role-based browser tests.

## Next safe actions
1. Obtain a complete restorable backup of the actual Production database and a separate export of Storage objects; verify restore capability.
2. Obtain owner-authorized access to the configured Production project and re-run read-only schema, migration-history, RLS, function-definition, and grant preflight.
3. Reconcile the final production source and test signed-in Buyer/Seller/Admin flows against a safe backend.
4. Apply the reviewed release bundle only after backup and preflight gates pass; verify postflight grants and behavior.
5. Merge PR #3 and deploy to Production only after every release gate passes.

## Status
IN PROGRESS — latest PR head CI and Vercel Preview are READY. Production checkout/helper grants, verified backup/restore, Production access, source reconciliation, and role-based E2E remain blockers.
