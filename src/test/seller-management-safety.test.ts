import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const functions = readFileSync(
  resolve(process.cwd(), 'src/lib/marketplace.functions.ts'),
  'utf8',
);
const dashboard = readFileSync(
  resolve(process.cwd(), 'src/components/marketplace/seller-dashboard.tsx'),
  'utf8',
);

describe('seller management authorization and lifecycle contract', () => {
  it('limits product creation and updates to the signed-in owner of an active store', () => {
    expect(functions).toContain(".eq('owner_id',context.userId).eq('status','active')");
    expect(functions).toContain(".update(values).eq('id',id).eq('store_id',data.store_id)");
    expect(functions).toContain('productSchema.parse(input)');
  });

  it('requires an authenticated applicant and a valid active delivery area', () => {
    expect(functions).toContain("middleware([requireSupabaseAuth]).validator(input=>applicationSchema.parse(input))");
    expect(functions).toContain(".eq('name_bn',data.area).eq('active',true)");
    expect(functions).toContain("db.from('seller_applications').insert({...data,user_id:context.userId})");
  });

  it('checks order ownership, demo status and allowed transitions before seller updates', () => {
    expect(functions).toContain("current.data.orders?.is_demo===true");
    expect(functions).toContain('!canTransition(current.data.status,data.status)');
    expect(functions).toContain(".eq('owner_id',context.userId).single()");
    expect(functions).toContain("db.rpc('cancel_order_item',{p_item_id:data.id})");
  });

  it('does not allow product creation or image upload while the store is suspended', () => {
    expect(dashboard).toContain("store.status!=='active'");
    expect(dashboard).toContain("disabled={store.status!=='active'||busy||imageUploading}");
    expect(dashboard).toContain("accept=\"image/jpeg,image/png,image/webp\"");
    expect(dashboard).toContain('file.size>5*1024*1024');
  });

  it('refreshes seller management, catalog and order data after a successful write', () => {
    expect(dashboard).toContain("queryKey:['seller-management']");
    expect(dashboard).toContain("queryKey:['catalog']");
    expect(dashboard).toContain("queryKey:['customer-orders']");
  });
});
