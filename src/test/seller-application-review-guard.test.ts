import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

const migration=readFileSync(resolve(process.cwd(),'drizzle/migrations/0013_guard_seller_application_review.sql'),'utf8').toLowerCase();

describe('seller application review database guard',()=>{
 it('prevents direct status changes outside the atomic review RPC',()=>{
  expect(migration).toContain("current_setting('app.review_application', true)");
  expect(migration).toContain('application status must be changed through the review action');
  expect(migration).toContain('create trigger seller_applications_update_guard');
 });
 it('keeps submitted applicant details immutable after submission',()=>{
  expect(migration).toContain("to_jsonb(new) - array['status','admin_note','reviewed_at']");
  expect(migration).toContain('submitted application details cannot be changed');
 });
 it('serializes reviews per applicant and checks existing stores before creating one',()=>{
  const lock=migration.indexOf('pg_advisory_xact_lock(hashtextextended(v_app.user_id::text, 0))');
  const storeCheck=migration.indexOf('where owner_id = v_app.user_id');
  const storeInsert=migration.indexOf('insert into public.seller_stores');
  expect(lock).toBeGreaterThan(-1);
  expect(storeCheck).toBeGreaterThan(lock);
  expect(storeInsert).toBeGreaterThan(storeCheck);
 });
 it('creates the store, seller role, and approved status in the same transaction',()=>{
  expect(migration).toContain("values (v_app.user_id, 'seller')");
  expect(migration).toContain("set status = 'approved'");
  expect(migration).toContain("set status = 'rejected'");
  expect(migration.indexOf('if not p_approve then')).toBeLessThan(migration.indexOf('if v_app.user_id is null then'));
  expect(migration).toContain("set_config('app.review_application', '1', true)");
  expect(migration).toContain('revoke execute on function public.review_seller_application(uuid, boolean, text) from anon, public');
  expect(migration).toContain('grant execute on function public.review_seller_application(uuid, boolean, text) to authenticated');
 });
});
