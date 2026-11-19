import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/lib/marketplace.functions.ts'),
  'utf8',
);
const start = source.indexOf('export const getManagement');
const end = source.indexOf('export const saveProduct', start);
const management = source.slice(start, end);

describe('management query authorization boundaries', () => {
  it('requires an explicit admin role check before loading admin management data', () => {
    expect(management).toContain("db.rpc('has_role',{_user_id:context.userId,_role:'admin'})");
    expect(management).toContain("if(!allowed) throw Error('এই পৃষ্ঠায় প্রবেশের অনুমতি নেই')");
  });

  it('scopes seller stores to the authenticated owner', () => {
    expect(management).toContain("if(!data.admin) storesQuery=storesQuery.eq('owner_id',context.userId)");
  });

  it('scopes seller product and order-item queries to only the seller store IDs', () => {
    expect(management).toContain("if(!data.admin) productsQuery=productsQuery.in('store_id',ids)");
    expect(management).toContain("if(!data.admin) itemsQuery=itemsQuery.in('store_id',ids)");
    expect(management).toContain("!data.admin&&ids.length===0?Promise.resolve({data:[],error:null})");
  });

  it('excludes demo orders from the seller order-item view', () => {
    expect(management).toContain("itemsQuery=itemsQuery.in('store_id',ids).eq('orders.is_demo',false)");
  });

  it('does not expose seller applications or global orders through the seller query path', () => {
    expect(management).toContain("data.admin?db.from('seller_applications')");
    expect(management).toContain("data.admin?db.from('orders')");
    expect(management).toContain("Promise.resolve({data:[],error:null})");
  });

  it('fails closed when any management query returns an error', () => {
    expect(management).toContain('if(stores.error||products.error||items.error||applications.error||categories.error||orders.error) throw Error');
  });
});
