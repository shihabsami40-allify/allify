import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

const migration=readFileSync(resolve(process.cwd(),'drizzle/migrations/0004_fix_place_order_internal_guard.sql'),'utf8').toLowerCase();
const cancellationGuard=readFileSync(resolve(process.cwd(),'drizzle/migrations/0005_block_unrestored_order_cancellation.sql'),'utf8').toLowerCase();

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
 it('blocks direct seller cancellation until stock restoration is implemented',()=>{
  expect(cancellationGuard).toContain("old.status = 'pending' and new.status = 'confirmed'");
  expect(cancellationGuard).toContain("old.status = 'confirmed' and new.status = 'shipped'");
  expect(cancellationGuard).toContain("old.status = 'shipped' and new.status = 'delivered'");
  expect(cancellationGuard).not.toContain("new.status in ('confirmed', 'cancelled')");
  expect(cancellationGuard).not.toContain("new.status in ('shipped', 'cancelled')");
 });
});

const adminCancellationGuard=readFileSync(resolve(process.cwd(),'drizzle/migrations/0008_block_admin_order_cancellation.sql'),'utf8').toLowerCase();

describe('admin order cancellation stock safety',()=>{
 it('blocks cancellation for admins as well as sellers until stock restoration exists',()=>{
  expect(adminCancellationGuard).toContain("if new.status = 'cancelled' then");
  expect(adminCancellationGuard).toContain('order cancellation is unavailable until stock restoration is implemented');
  expect(adminCancellationGuard.indexOf("if new.status = 'cancelled' then")).toBeLessThan(adminCancellationGuard.indexOf("if not public.has_role(auth.uid(), 'admin')"));
 });
 it('preserves forward admin status management while retaining seller lifecycle checks',()=>{
  expect(adminCancellationGuard).toContain("if not public.has_role(auth.uid(), 'admin') and not (");
  expect(adminCancellationGuard).toContain("(old.status = 'pending' and new.status = 'confirmed')");
  expect(adminCancellationGuard).toContain("(old.status = 'confirmed' and new.status = 'shipped')");
  expect(adminCancellationGuard).toContain("(old.status = 'shipped' and new.status = 'delivered')");
  expect(adminCancellationGuard).toContain('revoke all on function public.guard_order_item_update() from public, anon, authenticated');
 });
});
