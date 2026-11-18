import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

const migration=readFileSync(resolve(process.cwd(),'drizzle/migrations/0010_restrict_suspended_store_product_writes.sql'),'utf8').toLowerCase();

describe('suspended seller product write RLS',()=>{
 it('replaces the permissive owner insert policy and requires an active non-demo store',()=>{
  expect(migration).toContain('drop policy if exists "products owner insert"');
  expect(migration).toContain('create policy "products owner insert"');
  expect(migration).toContain('public.owns_store(store_id)');
  expect(migration).toContain("s.status = 'active'");
  expect(migration).toContain('s.is_demo = false');
 });
 it('checks both old-row access and new-row validity on product updates',()=>{
  expect(migration).toContain('drop policy if exists "products owner update"');
  expect(migration).toContain('create policy "products owner update"');
  expect(migration).toContain('for update to authenticated');
  expect(migration).toContain('using (');
  expect(migration).toContain('with check (');
  expect(migration).toContain("public.has_role(auth.uid(), 'admin')");
 });
 it('also restricts product deletion for suspended and demo stores',()=>{
  expect(migration).toContain('drop policy if exists "products owner delete"');
  expect(migration).toContain('create policy "products owner delete"');
  expect(migration).toContain('for delete to authenticated');
  expect(migration).toContain('public.owns_store(store_id)');
  expect(migration).toContain("s.status = 'active'");
  expect(migration).toContain('s.is_demo = false');
  expect(migration).toContain("public.has_role(auth.uid(), 'admin')");
 });
});
