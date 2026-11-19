import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/lib/marketplace.functions.ts'),
  'utf8',
);
const start = source.indexOf('export const getAccount');
const end = source.indexOf('export const getManagement', start);
const accountQuery = source.slice(start, end);

describe('account data privacy', () => {
  it('requires authentication before reading account information', () => {
    expect(accountQuery).toContain('.middleware([requireSupabaseAuth])');
  });

  it('scopes profile, roles, stores and seller applications to the current user', () => {
    expect(accountQuery).toContain(".from('user_roles').select('role').eq('user_id',context.userId)");
    expect(accountQuery).toContain(".from('profiles').select('*').eq('id',context.userId)");
    expect(accountQuery).toContain(".from('seller_stores').select('*').eq('owner_id',context.userId)");
    expect(accountQuery).toContain(".from('seller_applications').select('*').eq('user_id',context.userId)");
  });

  it('scopes order history to the current customer and orders newest first', () => {
    expect(accountQuery).toContain(".from('orders').select('*,order_items(*)').eq('customer_id',context.userId).order('created_at',{ascending:false})");
  });

  it('fails closed when any protected account query fails', () => {
    expect(accountQuery).toContain('if(roles.error||stores.error||orders.error||applications.error||');
    expect(accountQuery).toContain("throw Error('অ্যাকাউন্ট লোড করা যায়নি')");
  });
});
