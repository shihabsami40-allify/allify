import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,it,expect} from 'vitest';
import {safeImageUrl,productImageStoragePath,canTransition,deliverySchema,applicationSchema,categorySchema,validQuantity,realOrderAllowed,cartTotal,checkoutErrorMessage,orderReportTotals} from '@/lib/marketplace';
describe('checkout error messages',()=>{
 it('explains stock shortages without exposing database details',()=>expect(checkoutErrorMessage(new Error('Not enough stock for product'))).toContain('পর্যাপ্ত স্টক নেই'));
 it('explains unavailable delivery areas',()=>expect(checkoutErrorMessage(new Error('Delivery not available in this area'))).toContain('ডেলিভারি দেওয়া যাচ্ছে না'));
 it('uses a safe fallback for unknown database errors',()=>expect(checkoutErrorMessage({message:'relation private_table does not exist'})).not.toContain('private_table'));
});
describe('marketplace validation',()=>{
 it('accepts credential-free HTTPS images',()=>expect(safeImageUrl('https://images.example.com/product.jpg')).toBe(true));
 it('rejects nonsecure image URLs',()=>expect(safeImageUrl('http://images.example.com/product.jpg')).toBe(false));
 it('rejects image URLs containing credentials',()=>expect(safeImageUrl('https://user:password@example.com/x.jpg')).toBe(false));
 it('rejects local/private image hosts',()=>{for(const url of ['https://127.0.0.1/x','https://localhost/x','https://10.0.0.1/x','https://foo.internal/x'])expect(safeImageUrl(url)).toBe(false);});
 it('allows manual confirmation before shipment',()=>expect(canTransition('pending','confirmed')).toBe(true));
 it('does not skip confirmation',()=>expect(canTransition('pending','shipped')).toBe(false));
 it('does not reverse completed delivery',()=>expect(canTransition('delivered','pending')).toBe(false));
 it('blocks cancellation until inventory restoration is implemented',()=>{expect(canTransition('pending','cancelled')).toBe(false);expect(canTransition('confirmed','cancelled')).toBe(false);});
 it('extracts only this seller’s product image object path',()=>{const base='https://project.supabase.co/storage/v1/object/public/product-images/';const owner='11111111-1111-4111-8111-111111111111';const store='22222222-2222-4222-8222-222222222222';const file='33333333-3333-4333-8333-333333333333.webp';expect(productImageStoragePath(base+owner+'/'+store+'/'+file,base,owner,store)).toBe(owner+'/'+store+'/'+file);});
 it('refuses external, cross-seller, and malformed product image paths',()=>{const base='https://project.supabase.co/storage/v1/object/public/product-images/';const owner='11111111-1111-4111-8111-111111111111';const store='22222222-2222-4222-8222-222222222222';expect(productImageStoragePath('https://other.example/x.jpg',base,owner,store)).toBeNull();expect(productImageStoragePath(base+'other/'+store+'/33333333-3333-4333-8333-333333333333.jpg',base,owner,store)).toBeNull();expect(productImageStoragePath(base+owner+'/'+store+'/../private.jpg',base,owner,store)).toBeNull();});
 it('accepts Bangladesh mobile format',()=>expect(deliverySchema.safeParse({recipient:'ক্রেতা',phone:'01712345678',area:'চট্টগ্রাম',address:'দোকানের ঠিকানা'}).success).toBe(true));
 it('rejects foreign mobile format',()=>expect(deliverySchema.safeParse({recipient:'ক্রেতা',phone:'+15551234567',area:'চট্টগ্রাম',address:'দোকানের ঠিকানা'}).success).toBe(false));
 it('rejects whitespace-only delivery area',()=>expect(deliverySchema.safeParse({recipient:'ক্রেতা',phone:'01712345678',area:'   ',address:'দোকানের ঠিকানা'}).success).toBe(false));
 it('normalizes surrounding whitespace in delivery area',()=>expect(deliverySchema.parse({recipient:'ক্রেতা',phone:'01712345678',area:'  চট্টগ্রাম  ',address:'দোকানের ঠিকানা'}).area).toBe('চট্টগ্রাম'));
 it('rejects whitespace-only seller application area',()=>expect(applicationSchema.safeParse({store_name:'দোকান',owner_name:'মালিক',phone:'01712345678',area:'   ',address:'দোকানের ঠিকানা'}).success).toBe(false));
 it('normalizes seller application area',()=>expect(applicationSchema.parse({store_name:'দোকান',owner_name:'মালিক',phone:'01712345678',area:'  চট্টগ্রাম  ',address:'দোকানের ঠিকানা'}).area).toBe('চট্টগ্রাম'));
 it('rejects invalid category slug',()=>expect(categorySchema.safeParse({name_bn:'পোশাক',name_en:'Clothing',slug:'../../bad',sort_order:0}).success).toBe(false));
 it('enforces integer quantities within stock and cart limits',()=>{expect(validQuantity(1,1)).toBe(true);expect(validQuantity(2,1)).toBe(false);expect(validQuantity(1.5,10)).toBe(false);expect(validQuantity(100,200)).toBe(false);});
 it('allows real orders only from non-demo stores',()=>{const real={id:'p',price:100,seller_stores:{is_demo:false}} as any;const demo={...real,seller_stores:{is_demo:true}};expect(realOrderAllowed([real])).toBe(true);expect(realOrderAllowed([demo])).toBe(false);expect(realOrderAllowed([])).toBe(false);});
 it('excludes cancelled and demo orders from admin revenue while retaining real order count',()=>{const totals=orderReportTotals([{is_demo:false,status:'pending',total:500},{is_demo:false,status:'cancelled',total:900},{is_demo:false,status:'delivered',total:300},{is_demo:true,status:'delivered',total:700}]);expect(totals).toEqual({orderCount:3,orderValue:800,deliveredValue:300});});
 it('calculates cart total using product prices and delivery fee',()=>{const p1={id:'a',price:100} as any;const p2={id:'b',price:250} as any;expect(cartTotal([{id:'a',quantity:2},{id:'b',quantity:1}],[p1,p2],50)).toBe(500);});
});
describe('seller order status confirmation',()=>{
 it('requires confirmation before seller order status changes',()=>{
  const sellerDashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/seller-dashboard.tsx'),'utf8');
  expect(sellerDashboard).toContain('window.confirm');
  expect(sellerDashboard).toContain('অর্ডার ${statusName[status]} করবেন?');
 });
});
describe('order lifecycle transitions',()=>{
 it('allows only the forward fulfillment sequence',()=>{
  expect(canTransition('pending','confirmed')).toBe(true);
  expect(canTransition('confirmed','shipped')).toBe(true);
  expect(canTransition('shipped','delivered')).toBe(true);
  expect(canTransition('pending','shipped')).toBe(false);
  expect(canTransition('confirmed','delivered')).toBe(false);
  expect(canTransition('delivered','confirmed')).toBe(false);
  expect(canTransition('pending','cancelled')).toBe(false);
  expect(canTransition('confirmed','cancelled')).toBe(false);
  expect(canTransition('shipped','cancelled')).toBe(false);
 });
});
