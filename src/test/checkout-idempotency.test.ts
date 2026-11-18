import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,expect,it} from 'vitest';

const migration=readFileSync(resolve(process.cwd(),'drizzle/migrations/0009_checkout_request_idempotency.sql'),'utf8').toLowerCase();
const checkout=readFileSync(resolve(process.cwd(),'src/components/marketplace/checkout-view.tsx'),'utf8');

describe('COD checkout request idempotency',()=>{
 it('stores a unique request ID on each real customer order and enforces uniqueness',()=>{
  expect(migration).toContain('add column if not exists checkout_request_id uuid');
  expect(migration).toContain('create unique index if not exists orders_customer_checkout_request_uidx');
  expect(migration).toContain('on public.orders(customer_id, checkout_request_id)');
  expect(migration).toContain('where checkout_request_id is not null');
 });
 it('serializes concurrent retries and returns the already-created order number',()=>{
  expect(migration).toContain('drop function if exists public.place_order(jsonb, text, text, text, text, text, boolean)');
  expect(migration).toContain('pg_advisory_xact_lock(hashtextextended(v_uid::text');
  expect(migration).toContain('where customer_id = v_uid and checkout_request_id = p_request_id');
  expect(migration).toContain('if found then\n    return v_no;');
  expect(migration.indexOf('if found then\n    return v_no;')).toBeLessThan(migration.indexOf('update public.products'));
 });
 it('keeps the existing transactional stock checks and protects the new RPC signature',()=>{
  expect(migration).toContain('for update of p');
  expect(migration).toContain('and s.is_demo = false');
  expect(migration).toContain('set stock = stock - v_qty, sold_count = sold_count + v_qty');
  expect(migration).toContain('revoke execute on function public.place_order(jsonb,text,text,text,text,uuid,text,boolean)');
  expect(migration).toContain('to authenticated');
 });
 it('reuses the same request ID after a retry and clears it only after success',()=>{
  expect(checkout).toContain('readStoredJson<string>(cartKey');
  expect(checkout).toContain('writeStoredJson(cartKey,request.id)');
  expect(checkout).toContain('p_request_id:request.id');
  expect(checkout).toContain('removeStoredValue(cartKey)');
 });
});
