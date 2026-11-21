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


## Revalidation — 2026-11-21 (later session)
- Latest reviewed PR branch commit before this audit: `b75476852ac627171753fcd7cb9b2aa9a0c31479`. CI run `44907622278` passed install/build/tests; exact-head Preview `dpl_9kcDP9Wfs8Vw1WQ7NDwdLpkwQVnd` reached READY at https://allify-chattogram-3mf6fb5ef-allify.vercel.app. PR #3 remains OPEN, mergeable, and unmerged.
- Repaired consolidated release SQL postflight assembly: all assertions now sit inside a valid DO DECLARE/BEGIN block. Fixed the checkout grant assertion to require authenticated EXECUTE only on the new eight-argument idempotent `place_order` overload and to deny anon/authenticated EXECUTE on the legacy seven-argument overload. Transactionally executed the corrected postflight block on isolated `allify-test`, simulating the preceding removal of `claim_first_admin`; all assertions passed and the transaction was rolled back.
- Audited Lovable snapshot `24740138edea698f794c036b3b126c274fed3d6c` against GitHub branch `b75476852ac627171753fcd7cb9b2aa9a0c31479`: Lovable has dedicated authenticated routes and marketplace components, while GitHub consolidates UI logic in `src/routes/$page.tsx`. Critical behavior difference: Lovable checkout is demo-only; GitHub branch uses idempotent `place_order` RPC for real COD checkout. The codebases are not synchronized; no automatic copy was made.
- GitHub branch is the source currently used by Vercel's GitHub deployment pipeline. Lovable workspace is `needs_attention / out_of_credits`; its separate published source is not treated as the candidate production release.
- Latest commit after this audit-note update will require fresh CI/Preview verification. Production remains unchanged and no PR merge was performed.


## Release bundle rebuild and full isolated rehearsal — 2026-11-21
- A deeper SQL-file audit found the consolidated release bundle had been assembled incorrectly: migration 0020 (buyer-owned cancellation) was omitted from the ordered migration sections, and the embedded 0021 idempotent checkout function was truncated. The file also contained duplicated SQL after an earlier COMMIT. Do not use the prior bundle revision.
- Rebuilt `supabase/releases/2026-11-20_allify_release.sql` from the ordered migration sources 0004–0027, including the complete 0020 buyer-cancellation function and complete 0021 idempotent checkout function, with one BEGIN/COMMIT and one postflight block.
- Applied the rebuilt full pack successfully to isolated `allify-test` project `ltwobqpgxmkeylmpkogq`. The preflight, all 24 migration sections, and final postflight completed; SQL returned `status=applied, migration_pack=0004-0027`. This is a test environment only, not Production.
- Security Advisor on the isolated test DB reports seven authenticated-callable SECURITY DEFINER RPC warnings (including intended checkout, cancellation, seller-review, and RLS helper RPCs). No anon exposure was indicated by these findings; keep authenticated execution only where explicitly required.
- Latest release-pack rebuild commit: `b4867143d594bb02521b7d2d008ddc94b3710b0a`. Latest workflow run at check time: `44911142783`, still in progress; Vercel commit status was success. Recheck exact-head CI and Preview before treating this revision as verified.
- Production DB, Storage, PR merge and Production deployment remain untouched. Full restorable Production DB/Storage backup, access to configured Production ref `htsvvotamlxlkncksssq`, and signed-in role E2E are still mandatory release gates.
