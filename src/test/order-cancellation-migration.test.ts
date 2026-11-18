import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

const migration=readFileSync(resolve(process.cwd(),'drizzle/migrations/0016_atomic_order_item_cancellation.sql'),'utf8').toLowerCase();

describe('atomic order-item cancellation migration',()=>{
 it('keeps direct Data API cancellation blocked outside the protected RPC',()=>{
  expect(migration).toContain("if new.status = 'cancelled' then");
  expect(migration).toContain("current_setting('app.internal', true)");
  expect(migration).toContain('use the protected order cancellation workflow');
  expect(migration).toContain('revoke all on function public.guard_order_item_update() from public, anon, authenticated');
 });
 it('serializes cancellation and checks owner/admin access and demo status',()=>{
  expect(migration).toContain('for update of oi');
  expect(migration).toContain("public.has_role(auth.uid(), 'admin')");
  expect(migration).toContain('public.owns_store(v_item.store_id)');
  expect(migration).toContain('if v_item.is_demo then');
 });
 it('only cancels pending or confirmed items and refuses missing products',()=>{
  expect(migration).toContain("v_item.status not in ('pending', 'confirmed')");
  expect(migration).toContain('if v_item.product_id is null then');
  expect(migration).toContain("if v_item.status = 'cancelled' then\n    return true");
  expect(migration).toContain("raise exception 'a cancelled order item cannot be reopened'");
 });
 it('restores stock and sold count in the same transaction before changing item status',()=>{
  const restore=migration.indexOf('update public.products');
  const cancel=migration.indexOf("update public.order_items\n  set status = 'cancelled'");
  expect(restore).toBeGreaterThan(-1);
  expect(cancel).toBeGreaterThan(restore);
  expect(migration).toContain('stock = stock + v_item.quantity');
  expect(migration).toContain('sold_count = greatest(0, sold_count - v_item.quantity)');
  expect(migration).toContain('stock <= 100000 - v_item.quantity');
  expect(migration).toContain("set_config('app.internal', '1', true)");
 });
 it('exposes the cancellation RPC only to authenticated callers',()=>{
  expect(migration).toContain('revoke all on function public.cancel_order_item(uuid) from public, anon');
  expect(migration).toContain('grant execute on function public.cancel_order_item(uuid) to authenticated');
 });
});
