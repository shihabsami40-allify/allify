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


const demoStatusGuard=readFileSync(resolve(process.cwd(),'drizzle/migrations/0011_block_demo_order_status_updates.sql'),'utf8').toLowerCase();

describe('demo order status immutability',()=>{
 it('blocks direct status changes to demo order items before admin or seller transition checks',()=>{
  expect(demoStatusGuard).toContain('from public.orders o');
  expect(demoStatusGuard).toContain('where o.id = old.order_id and o.is_demo = true');
  expect(demoStatusGuard).toContain('demo order status cannot be changed');
  expect(demoStatusGuard.indexOf('demo order status cannot be changed')).toBeLessThan(demoStatusGuard.indexOf("if new.status = 'cancelled' then"));
  expect(demoStatusGuard).toContain('revoke all on function public.guard_order_item_update() from public, anon, authenticated');
 });
 it('retains cancellation blocking and normal seller fulfillment transitions',()=>{
  expect(demoStatusGuard).toContain('order cancellation is unavailable until stock restoration is implemented');
  expect(demoStatusGuard).toContain("(old.status = 'pending' and new.status = 'confirmed')");
  expect(demoStatusGuard).toContain("(old.status = 'confirmed' and new.status = 'shipped')");
  expect(demoStatusGuard).toContain("(old.status = 'shipped' and new.status = 'delivered')");
 });
});


const aggregateOrderGuard=readFileSync(resolve(process.cwd(),'drizzle/migrations/0015_derive_order_status_from_items.sql'),'utf8').toLowerCase();

describe('aggregate order status integrity',()=>{
 it('rejects direct order status changes even for administrators',()=>{
  expect(aggregateOrderGuard).toContain("raise exception 'order status is derived from order items'");
  expect(aggregateOrderGuard).toContain("if new.status is distinct from old.status then");
  expect(aggregateOrderGuard).toContain("coalesce(current_setting('app.internal', true), '') = '1'");
 });
 it('prevents direct changes to order snapshot and delivery fields',()=>{
  expect(aggregateOrderGuard).toContain("(to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status')");
  expect(aggregateOrderGuard).toContain('order fields can only be changed by internal order workflows');
 });
 it('allows only the trusted item-status sync trigger to update aggregate order status',()=>{
  const setFlag=aggregateOrderGuard.indexOf("perform set_config('app.internal', '1', true)");
  const updateOrder=aggregateOrderGuard.indexOf('update public.orders');
  const restoreFlag=aggregateOrderGuard.indexOf("perform set_config('app.internal', v_previous_internal, true)");
  expect(setFlag).toBeGreaterThan(-1);
  expect(updateOrder).toBeGreaterThan(setFlag);
  expect(restoreFlag).toBeGreaterThan(updateOrder);
  expect(aggregateOrderGuard).toContain('revoke all on function public.guard_order_update() from public, anon, authenticated');
  expect(aggregateOrderGuard).toContain('revoke all on function public.sync_order_status_from_items() from public, anon, authenticated');
 });
});
