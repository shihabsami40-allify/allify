import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/routes/orders.tsx'),
  'utf8',
);

describe('customer order history privacy and resilience', () => {
  it('does not query customer orders until an authenticated user is available', () => {
    expect(source).toContain('enabled:!!user');
    expect(source).toContain('if(!user) return []');
    expect(source).toContain("if(!user)return <main");
  });

  it('scopes the order query to the signed-in customer and sorts newest first', () => {
    expect(source).toContain(".from('orders').select('*').eq('customer_id',user.id).order('created_at',{ascending:false})");
  });

  it('loads order items only for the authenticated customer order IDs', () => {
    expect(source).toContain(".from('order_items').select('*').in('order_id',orders.map(o=>o.id))");
    expect(source).toContain('if(!orders.length)return []');
  });

  it('shows an explicit retry state when either order query fails', () => {
    expect(source).toContain('if(error)throw error');
    expect(source).toContain('if(itemError)throw itemError');
    expect(source).toContain('অর্ডার লোড করা যায়নি');
    expect(source).toContain('onClick={()=>q.refetch()}');
  });

  it('does not expose cancelled orders as active fulfillment progress', () => {
    expect(source).toContain("order.status==='cancelled'?<p");
    expect(source).toContain('aria-label="অর্ডারের অগ্রগতি"');
  });
});


describe('customer order fulfillment progress', () => {
  it('includes the processing stage between confirmation and shipping', () => {
    const marketplace = readFileSync(
      resolve(process.cwd(), 'src/lib/marketplace.ts'),
      'utf8',
    );
    expect(marketplace).toContain("confirmed:['processing','cancelled'],processing:['shipped','cancelled']");
    expect(marketplace).toContain("processing:'প্রস্তুত করা হচ্ছে'");
    expect(source).toContain("const fulfillmentSteps:Status[]=['pending','confirmed','processing','shipped','delivered']");
    expect(source).toContain('<option value="processing">প্রস্তুত করা হচ্ছে</option>');
    expect(source).toContain('grid grid-cols-5');
  });
});
