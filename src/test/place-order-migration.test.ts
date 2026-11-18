import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

const migration=readFileSync(resolve(process.cwd(),'drizzle/migrations/0004_fix_place_order_internal_guard.sql'),'utf8').toLowerCase();

describe('COD order database patch',()=>{
 it('keeps the internal guard enabled through the protected order-total update',()=>{
  const totalUpdate=migration.indexOf('update public.orders\n  set subtotal');
  const clearInternal=migration.lastIndexOf("perform set_config('app.internal', '', true)");
  expect(totalUpdate).toBeGreaterThan(-1);
  expect(clearInternal).toBeGreaterThan(totalUpdate);
 });
 it('rejects demo stores in the locked product lookup',()=>{
  expect(migration).toContain('and s.is_demo = false');
  expect(migration).toContain('for update of p');
 });
});
