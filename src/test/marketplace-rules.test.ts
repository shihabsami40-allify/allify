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

describe('order status prompts include item details',()=>{
 it('admin confirmation identifies the order, product and quantity',()=>{
  const dashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/admin-dashboard.tsx'),'utf8');
  expect(dashboard).toContain('${o.order_no} • ${i.title} × ${i.quantity}');
 });
 it('seller confirmation identifies the order, product and quantity',()=>{
  const dashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/seller-dashboard.tsx'),'utf8');
  expect(dashboard).toContain("${item.orders?.order_no??'এই'} • ${item.title} × ${item.quantity}");
 });
});


describe('seller product stock warnings',()=>{
 it('shows sold-out and low-stock labels in seller product list',()=>{
  const dashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/seller-dashboard.tsx'),'utf8');
  expect(dashboard).toContain("' • স্টক শেষ'");
  expect(dashboard).toContain("' • স্টক কম'");
  expect(dashboard).toContain('p.stock<=5');
 });
});


describe('product card stock availability',()=>{
 it('shows sold-out and low-stock labels and disables sold-out add action',()=>{
  const card=readFileSync(resolve(process.cwd(),'src/components/product-card.tsx'),'utf8');
  expect(card).toContain('স্টক শেষ</span>');
  expect(card).toContain('স্টক কম</span>');
  expect(card).toContain('disabled={p.stock===0}');
  expect(card).toContain('title={p.stock===0?"স্টক শেষ":"ব্যাগে যোগ করুন"}');
 });
});


describe('cart availability explanations',()=>{
 it('shows an item-level reason when a product is sold out, over stock, or demo-only',()=>{
  const cart=readFileSync(resolve(process.cwd(),'src/components/marketplace/cart-view.tsx'),'utf8');
  expect(cart).toContain('স্টক শেষ—অর্ডারের আগে ব্যাগ থেকে সরান');
  expect(cart).toContain('বর্তমান স্টক {p.stock.toLocaleString');
  expect(cart).toContain('নমুনা পণ্য—বাস্তব অর্ডার করা যাবে না');
 });
 it('explains each checkout blocker instead of showing one generic message',()=>{
  const cart=readFileSync(resolve(process.cwd(),'src/components/marketplace/cart-view.tsx'),'utf8');
  expect(cart).toContain('পণ্য আর পাওয়া যাচ্ছে না—সরিয়ে দিন');
  expect(cart).toContain('পণ্যের স্টক শেষ—সরিয়ে দিন');
  expect(cart).toContain('পরিমাণ বর্তমান স্টকের চেয়ে বেশি—কমান');
  expect(cart).toContain('নমুনা পণ্য বাস্তব অর্ডারের জন্য নয়');
 });
});


describe('customer order progress display',()=>{
 it('shows the forward fulfillment steps and a separate cancelled state',()=>{
  const orders=readFileSync(resolve(process.cwd(),'src/routes/orders.tsx'),'utf8');
  expect(orders).toContain("const fulfillmentSteps:Status[]=['pending','confirmed','shipped','delivered']");
  expect(orders).toContain('aria-label="অর্ডারের অগ্রগতি"');
  expect(orders).toContain('এই অর্ডারটি বাতিল করা হয়েছে।');
 });
});


describe('browse empty search recovery',()=>{
 it('explains empty search results and provides a clear-all-products link',()=>{
  const browse=readFileSync(resolve(process.cwd(),'src/routes/browse.tsx'),'utf8');
  expect(browse).toContain('আপনার খোঁজ বা নির্বাচিত ক্যাটাগরিতে কোনো পণ্য মেলেনি।');
  expect(browse).toContain('সব পণ্য দেখুন');
  expect(browse).toContain("search={{q:'',category:'',sort:'popular'}}");
 });
});


describe('seller storefront product discovery',()=>{
 it('provides store-scoped search, price sorting, and empty-search recovery',()=>{
  const storefront=readFileSync(resolve(process.cwd(),'src/routes/store.$slug.tsx'),'utf8');
  expect(storefront).toContain('এই দোকানে পণ্য খুঁজুন');
  expect(storefront).toContain("sort==='low'?a.price-b.price");
  expect(storefront).toContain("sort==='high'?b.price-a.price");
  expect(storefront).toContain("sort==='new'?b.created_at.localeCompare(a.created_at)");
  expect(storefront).toContain('এই নামে কোনো পণ্য মেলেনি');
  expect(storefront).toContain('সার্চ মুছুন');
 });
});


describe('account page guidance',()=>{
 it('provides next steps for empty order and seller application lists',()=>{
  const account=readFileSync(resolve(process.cwd(),'src/routes/_authenticated/account.tsx'),'utf8');
  expect(account).toContain('এই অ্যাকাউন্টে এখনো কোনো অর্ডার নেই।');
  expect(account).toContain('পণ্য দেখুন');
  expect(account).toContain('এখনো কোনো বিক্রেতা আবেদন নেই।');
  expect(account).toContain('বিনামূল্যে আবেদন করুন');
  expect(account).toContain('role="alert"');
  expect(account).toContain('সংরক্ষণ হচ্ছে…');
 });
});

describe('seller product list discovery',()=>{
 it('supports searching seller products and filtering by publication status',()=>{
  const dashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/seller-dashboard.tsx'),'utf8');
  expect(dashboard).toContain('নিজের পণ্য খুঁজুন');
  expect(dashboard).toContain("productFilter==='all'||product.status===productFilter");
  expect(dashboard).toContain('<option value="active">সক্রিয়</option>');
  expect(dashboard).toContain('<option value="draft">খসড়া</option>');
  expect(dashboard).toContain('<option value="hidden">লুকানো</option>');
  expect(dashboard).toContain('কোনো পণ্য মেলেনি। সার্চ বা ফিল্টার পরিবর্তন করুন।');
 });
});

describe('store directory discovery',()=>{
 it('supports searching stores and filtering by area with reset recovery',()=>{
  const stores=readFileSync(resolve(process.cwd(),'src/routes/stores.tsx'),'utf8');
  expect(stores).toContain('দোকান খুঁজুন');
  expect(stores).toContain("area==='all'||s.area===area");
  expect(stores).toContain('সব এলাকা');
  expect(stores).toContain('কোনো দোকান মেলেনি');
  expect(stores).toContain('ফিল্টার মুছুন');
 });
});
