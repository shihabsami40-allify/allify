import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

const migration=readFileSync(resolve(process.cwd(),'drizzle/migrations/0012_serialize_seller_application_submissions.sql'),'utf8').toLowerCase();

describe('seller application concurrency guard',()=>{
 it('serializes submissions for the same user before checking for an existing pending application',()=>{
  const lock=migration.indexOf('pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0))');
  const pendingCheck=migration.indexOf("where user_id = new.user_id and status = 'pending'");
  expect(lock).toBeGreaterThan(-1);
  expect(pendingCheck).toBeGreaterThan(lock);
 });
 it('rejects missing applicant IDs and existing stores while preserving pending-only defaults',()=>{
  expect(migration).toContain('if new.user_id is null then');
  expect(migration).toContain("new.status := 'pending'");
  expect(migration).toContain('new.admin_note := null');
  expect(migration).toContain('new.reviewed_at := null');
  expect(migration).toContain('where owner_id = new.user_id');
 });
 it('does not grant clients direct execution of the trigger function',()=>{
  expect(migration).toContain('revoke all on function public.guard_application_insert() from public, anon, authenticated');
 });
});
