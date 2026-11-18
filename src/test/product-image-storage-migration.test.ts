import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

const migration=readFileSync(resolve(process.cwd(),'drizzle/migrations/0006_secure_product_image_storage.sql'),'utf8').toLowerCase();

describe('product image storage ownership policies',()=>{
 it('requires a direct user/store/file path and an owned active non-demo store for uploads',()=>{
  expect(migration).toContain('array_length(storage.foldername(name), 1) = 2');
  expect(migration).toContain("s.owner_id = (select auth.uid())");
  expect(migration).toContain("s.status = 'active'");
  expect(migration).toContain('s.is_demo = false');
 });
 it('checks both old and new object ownership for updates',()=>{
  const update=migration.slice(migration.indexOf('create policy "sellers update'),migration.indexOf('drop policy if exists "sellers delete'));
  expect(update).toContain('using (');
  expect(update).toContain('with check (');
  expect(update.match(/s.owner_id = \(select auth.uid\(\)\)/g)?.length).toBe(2);
 });
 it('allows an owner to remove files from a suspended store but not another store',()=>{
  const deletion=migration.slice(migration.indexOf('create policy "sellers delete'));
  expect(deletion).toContain("s.owner_id = (select auth.uid())");
  expect(deletion).not.toContain("s.status = 'active'");
  expect(deletion).not.toContain('s.is_demo = false');
 });
});

const bucketConfig=readFileSync(resolve(process.cwd(),'drizzle/migrations/0007_harden_product_image_bucket_config.sql'),'utf8').toLowerCase();

describe('product image bucket configuration',()=>{
 it('enforces public image reads, a 5 MB limit, and supported image MIME types',()=>{
  expect(bucketConfig).toContain("values ('product-images', 'product-images', true, 5242880");
  expect(bucketConfig).toContain("array['image/jpeg','image/png','image/webp']");
  expect(bucketConfig).toContain('on conflict (id) do update');
  expect(bucketConfig).toContain('create policy "product images are publicly readable"');
  expect(bucketConfig).toContain('using (bucket_id = \'product-images\')');
 });
});
