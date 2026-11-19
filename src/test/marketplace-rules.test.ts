import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,it,expect} from 'vitest';
import {safeImageUrl,productImageStoragePath,canTransition,deliverySchema,applicationSchema,categorySchema,validQuantity,realOrderAllowed,cartTotal,checkoutErrorMessage,orderReportTotals} from '@/lib/marketplace';
import {hasRecoveryHash} from '@/lib/auth';
describe('checkout error messages',()=>{
 it('explains stock shortages without exposing database details',()=>expect(checkoutErrorMessage(new Error('Not enough stock for product'))).toContain('পর্যাপ্ত স্টক নেই'));
 it('explains unavailable delivery areas',()=>expect(checkoutErrorMessage(new Error('Delivery not available in this area'))).toContain('ডেলিভারি দেওয়া যাচ্ছে না'));
 it('uses a safe fallback for unknown database errors',()=>expect(checkoutErrorMessage({message:'relation private_table does not exist'})).not.toContain('private_table'));
});
describe('marketplace validation',()=>{
 it('accepts credential-free HTTPS images',()=>expect(safeImageUrl('https://images.example.com/product.jpg')).toBe(true));
 it('allows an empty optional image and the shipped placeholder but rejects missing local demo images',()=>{expect(safeImageUrl('')).toBe(true);expect(safeImageUrl('/images/products/placeholder.svg')).toBe(true);for(const url of ['/images/products/handbag.jpg','/images/products/panjabi.jpg','/images/products/unknown.svg'])expect(safeImageUrl(url)).toBe(false);});
 it('rejects nonsecure image URLs',()=>expect(safeImageUrl('http://images.example.com/product.jpg')).toBe(false));
 it('rejects image URLs containing credentials',()=>expect(safeImageUrl('https://user:password@example.com/x.jpg')).toBe(false));
 it('rejects local/private image hosts',()=>{for(const url of ['https://127.0.0.1/x','https://localhost/x','https://10.0.0.1/x','https://foo.internal/x'])expect(safeImageUrl(url)).toBe(false);});
 it('allows manual confirmation before shipment',()=>expect(canTransition('pending','confirmed')).toBe(true));
 it('does not skip confirmation',()=>expect(canTransition('pending','shipped')).toBe(false));
 it('does not reverse completed delivery',()=>expect(canTransition('delivered','pending')).toBe(false));
 it('allows cancellation only before shipment when stock can be restored',()=>{expect(canTransition('pending','cancelled')).toBe(true);expect(canTransition('confirmed','cancelled')).toBe(true);expect(canTransition('shipped','cancelled')).toBe(false);expect(canTransition('cancelled','pending')).toBe(false);});
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
describe('server-side seller product image ownership',()=>{
 it('validates uploaded product image URLs against the authenticated seller and store before saving',()=>{
  const functions=readFileSync(resolve(process.cwd(),'src/lib/marketplace.functions.ts'),'utf8');
  expect(functions).toContain('productImageStoragePath(image,imageBaseUrl,context.userId,store.id)');
  expect(functions).toContain("new URL('/storage/v1/object/public/product-images/',process.env['SUPABASE_URL'])");
  expect(functions).toContain('পণ্যের ছবি নিজের সক্রিয় দোকানে আপলোড করা নিরাপদ ছবিই হতে হবে');
 });
});

describe('seller order status confirmation',()=>{
 it('requires confirmation before seller order status changes',()=>{
  const sellerDashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/seller-dashboard.tsx'),'utf8');
  expect(sellerDashboard).toContain('window.confirm');
  expect(sellerDashboard).toContain('অর্ডার ${statusName[status]} করবেন?');
 });
});
describe('database order status typing',()=>{
 it('includes processing in the generated Supabase order status enum',()=>{
  const types=readFileSync(resolve(process.cwd(),'src/integrations/supabase/types.ts'),'utf8');
  expect(types).toContain('| "processing"');
 });
});

describe('store discovery branding presentation',()=>{
 it('renders validated store banners in the store discovery cards',()=>{
  const route=readFileSync(resolve(process.cwd(),'src/routes/stores.tsx'),'utf8');
  expect(route).toContain('s.banner_url&&safeImageUrl(s.banner_url)');
  expect(route).toContain('s.logo_url&&safeImageUrl(s.logo_url)');
 });
});

describe('seller store branding validation',()=>{
 it('validates optional store logo and banner with the shared HTTPS image policy',()=>{
  const functions=readFileSync(resolve(process.cwd(),'src/lib/marketplace.functions.ts'),'utf8');
  expect(functions).toContain("logo_url:z.string().trim().max(1000).refine(safeImageUrl");
  expect(functions).toContain("banner_url:z.string().trim().max(1000).refine(safeImageUrl");
 });
 it('exposes logo and banner fields in the seller store form',()=>{
  const dashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/seller-dashboard.tsx'),'utf8');
  expect(dashboard).toContain('name="logo_url"');
  expect(dashboard).toContain('name="banner_url"');
 });
});

describe('seller order status server validation',()=>{
 it('accepts processing so the seller can move confirmed orders into preparation',()=>{
  const functions=readFileSync(resolve(process.cwd(),'src/lib/marketplace.functions.ts'),'utf8');
  expect(functions).toContain("status:z.enum(['pending','confirmed','processing','shipped','delivered','cancelled'])");
 });
});

describe('order lifecycle transitions',()=>{
 it('allows only the forward fulfillment sequence',()=>{
  expect(canTransition('pending','confirmed')).toBe(true);
  expect(canTransition('confirmed','processing')).toBe(true);
   expect(canTransition('processing','shipped')).toBe(true);
   expect(canTransition('confirmed','shipped')).toBe(false);
  expect(canTransition('shipped','delivered')).toBe(true);
  expect(canTransition('pending','shipped')).toBe(false);
  expect(canTransition('confirmed','delivered')).toBe(false);
  expect(canTransition('delivered','confirmed')).toBe(false);
  expect(canTransition('pending','cancelled')).toBe(true);
  expect(canTransition('confirmed','cancelled')).toBe(true);
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
  expect(orders).toContain("const fulfillmentSteps:Status[]=['pending','confirmed','processing','shipped','delivered']");
  expect(orders).toContain('aria-label="অর্ডারের অগ্রগতি"');
  expect(orders).toContain('অর্ডার হালনাগাদ করুন');
  expect(orders).toContain('disabled={q.isFetching}');
  expect(orders).toContain('হালনাগাদ হচ্ছে…');
  expect(orders).toContain('এই অর্ডারটি বাতিল করা হয়েছে।');
 });
});


describe('browse empty search recovery',()=>{
 it('explains empty search results and provides a clear-all-products link',()=>{
  const browse=readFileSync(resolve(process.cwd(),'src/routes/browse.tsx'),'utf8');
  expect(browse).toContain('আপনার খোঁজ বা নির্বাচিত ক্যাটাগরিতে কোনো পণ্য মেলেনি।');
  expect(browse).toContain('সব পণ্য দেখুন');
  expect(browse).toContain("search:{q:'',category:'',sort:'popular',availability:'all'}");
   expect(browse).toContain("search.availability==='all'||p.stock>0");
   expect(browse).toContain('শুধু স্টকে আছে');
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
  expect(account).toContain('প্রোফাইল সংরক্ষণ করা যায়নি। ইন্টারনেট সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।');
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

describe('seller product list refresh',()=>{
 it('lets sellers refresh product data and indicates an active fetch',()=>{
  const dashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/seller-dashboard.tsx'),'utf8');
  expect(dashboard).toContain('পণ্য হালনাগাদ করুন');
  expect(dashboard).toContain('disabled={q.isFetching}');
  expect(dashboard).toContain('onClick={()=>q.refetch()}');
  expect(dashboard).toContain('হালনাগাদ হচ্ছে…');
 });
});



describe('seller product empty-state recovery',()=>{
 it('distinguishes an empty inventory and lets sellers clear combined filters',()=>{
  const dashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/seller-dashboard.tsx'),'utf8');
  expect(dashboard).toContain('এখনো কোনো পণ্য যোগ করা হয়নি।');
  expect(dashboard).toContain('সব ফিল্টার মুছুন');
  expect(dashboard).toContain("setProductQuery('');setProductFilter('all');setStockFilter('all')");
 });
});

describe('seller product stock filters',()=>{
 it('supports filtering products by sold-out and low-stock quantities',()=>{
  const dashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/seller-dashboard.tsx'),'utf8');
  expect(dashboard).toContain("stockFilter==='all'||(stockFilter==='out'&&product.stock===0)||(stockFilter==='low'&&product.stock>0&&product.stock<=5)");
  expect(dashboard).toContain('স্টকের অবস্থা অনুযায়ী ফিল্টার');
  expect(dashboard).toContain('<option value="out">স্টক শেষ</option>');
  expect(dashboard).toContain('<option value="low">স্টক কম (১–৫)</option>');
 });
});

describe('seller order list refresh',()=>{
 it('lets sellers refresh order data and indicates an active fetch',()=>{
  const dashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/seller-dashboard.tsx'),'utf8');
  expect(dashboard).toContain('অর্ডার হালনাগাদ করুন');
  expect(dashboard).toContain('disabled={q.isFetching}');
  expect(dashboard).toContain('onClick={()=>q.refetch()}');
  expect(dashboard).toContain('হালনাগাদ হচ্ছে…');
 });
});

describe('seller order discovery',()=>{
 it('supports searching orders and filtering by fulfillment status with reset recovery',()=>{
  const dashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/seller-dashboard.tsx'),'utf8');
  expect(dashboard).toContain('অর্ডার খুঁজুন');
  expect(dashboard).toContain("orderFilter==='all'||item.status===orderFilter");
  expect(dashboard).toContain('<option value="pending">অপেক্ষমাণ</option>');
  expect(dashboard).toContain('<option value="processing">প্রস্তুত করা হচ্ছে</option>');
  expect(dashboard).toContain('<option value="delivered">ডেলিভারি সম্পন্ন</option>');
  expect(dashboard).toContain('কোনো অর্ডার মেলেনি');
  expect(dashboard).toContain('ফিল্টার মুছুন');
 });
});

describe('customer order history discovery',()=>{
 it('supports searching orders, filtering by status, and clearing unmatched filters',()=>{
  const orders=readFileSync(resolve(process.cwd(),'src/routes/orders.tsx'),'utf8');
  expect(orders).toContain('অর্ডার নম্বর, পণ্য, ফোন, ঠিকানা বা নির্দেশনা খুঁজুন');
  expect(orders).toContain('order.address_line,order.note');
  expect(orders).toContain("statusFilter==='all'||order.status===statusFilter");
  expect(orders).toContain('<option value="shipped">পাঠানো হয়েছে</option>');
  expect(orders).toContain('<option value="cancelled">বাতিল</option>');
  expect(orders).toContain('কোনো অর্ডার মেলেনি');
  expect(orders).toContain('ফিল্টার মুছুন');
 });
});
 
describe('seller store contact details',()=>{
 it('allows sellers to update store area and address and displays the address publicly',()=>{
  const dashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/seller-dashboard.tsx'),'utf8');
  const functions=readFileSync(resolve(process.cwd(),'src/lib/marketplace.functions.ts'),'utf8');
  const storefront=readFileSync(resolve(process.cwd(),'src/routes/store.$slug.tsx'),'utf8');
  expect(dashboard).toContain('name="area"');
  expect(dashboard).toContain('name="address"');
  expect(dashboard).toContain("area:String(fd.get('area'))");
  expect(functions).toContain("area:z.string().trim().min(2).max(100),address:z.string().trim().max(250)");
  expect(functions).toContain("select('id,name,name_en,slug,description,area,address,rating,is_demo,logo_url,banner_url,created_at,status')");
  expect(storefront).toContain('{s.address&&');
 });
});

describe('buyer catalog filter reset',()=>{
 it('shows a reset control for active search, category, sort, or availability and clears all filters',()=>{
  const browse=readFileSync(resolve(process.cwd(),'src/routes/browse.tsx'),'utf8');
  expect(browse).toContain("const hasActiveFilters=Boolean(search.q||search.category||search.sort!=='popular'||search.availability!=='all')");
  expect(browse).toContain("search:{q:'',category:'',sort:'popular',availability:'all'}");
  expect(browse).toContain("search.availability==='all'||p.stock>0");
  expect(browse).toContain("শুধু স্টকে আছে");
  expect(browse).toContain('ফিল্টার মুছুন');
  expect(browse).toContain('onClick={clearFilters}');
 });
});

describe('buyer product detail stock guidance',()=>{
 it('shows low-stock guidance and remaining quantity already available in the bag',()=>{
  const detail=readFileSync(resolve(process.cwd(),'src/routes/product.$slug.tsx'),'utf8');
  expect(detail).toContain('স্টক কম—মাত্র');
  expect(detail).toContain('আপনার ব্যাগে ইতিমধ্যে');
  expect(detail).toContain('আরও {remainingStock.toLocaleString');
  expect(detail).toContain('disabled={qty>=remainingStock}');
  expect(detail).toContain('disabled={remainingStock===0||qty>remainingStock}');
 });
});

describe('buyer product image gallery',()=>{
 it('shows selectable thumbnails only for validated product image URLs',()=>{
  const detail=readFileSync(resolve(process.cwd(),'src/routes/product.$slug.tsx'),'utf8');
  expect(detail).toContain('p.product_images.filter(image=>safeImageUrl(image.url))');
  expect(detail).toContain('পণ্যের অন্যান্য ছবি');
  expect(detail).toContain('aria-pressed={selectedImage===index}');
  expect(detail).toContain('onClick={()=>setSelectedImage(index)}');
  expect(detail).toContain('const activeImage=galleryImages[selectedImage]?.url??productImage(p)');
 });
});

describe('buyer product detail seller information',()=>{
 it('loads and displays the seller store area and public address with a description fallback',()=>{
  const detail=readFileSync(resolve(process.cwd(),'src/routes/product.$slug.tsx'),'utf8');
  const functions=readFileSync(resolve(process.cwd(),'src/lib/marketplace.functions.ts'),'utf8');
  const types=readFileSync(resolve(process.cwd(),'src/lib/marketplace.ts'),'utf8');
  expect(functions).toContain('seller_stores(name,slug,is_demo,area,address,status)');
  expect(types).toContain("'name'|'slug'|'is_demo'|'area'|'address'");
  expect(detail).toContain('p.seller_stores?.address');
  expect(detail).toContain('দোকানের ঠিকানা');
  expect(detail).toContain('এই পণ্যের বিস্তারিত বিবরণ এখনো যোগ করা হয়নি।');
 });
});

describe('buyer related product section',()=>{
 it('renders related products only when matching products exist',()=>{
  const detail=readFileSync(resolve(process.cwd(),'src/routes/product.$slug.tsx'),'utf8');
  expect(detail).toContain('const relatedProducts=data.products.filter');
  expect(detail).toContain('relatedProducts.length>0');
  expect(detail).toContain('<ProductGrid products={relatedProducts}/>');
 });
});

describe('customer order cost and delivery notes',()=>{
 it('shows the item subtotal, delivery fee, payment method, and optional customer note',()=>{
  const orders=readFileSync(resolve(process.cwd(),'src/routes/orders.tsx'),'utf8');
  expect(orders).toContain('order.note&&');
  expect(orders).toContain('আপনার নির্দেশনা:');
  expect(orders).toContain('money(order.subtotal)');
  expect(orders).toContain('money(order.delivery_fee)');
  expect(orders).toContain("order.payment_method==='cod'?'ক্যাশ অন ডেলিভারি'");
 });
});

describe('seller order fulfillment details',()=>{
 it('loads and displays the order date, customer contact, delivery address, item total, and payment method',()=>{
  const functions=readFileSync(resolve(process.cwd(),'src/lib/marketplace.functions.ts'),'utf8');
  const dashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/seller-dashboard.tsx'),'utf8');
  expect(functions).toContain('orders!inner(order_no,recipient,phone,area,address_line,note,created_at,payment_method,is_demo)');
  expect(dashboard).toContain("new Date(item.orders.created_at).toLocaleString('bn-BD')");
  expect(dashboard).toContain('ফোন: {item.orders?.phone}');
  expect(dashboard).toContain('ডেলিভারি ঠিকানা: {item.orders?.address_line}');
  expect(dashboard).toContain('item.orders?.phone,item.orders?.area,item.orders?.address_line,item.orders?.note');
  expect(dashboard).toContain('ক্রেতার নির্দেশনা:');
  expect(dashboard).toContain('money(item.unit_price*item.quantity)');
  expect(dashboard).toContain("item.orders?.payment_method==='cod'?'ক্যাশ অন ডেলিভারি'");
 });
});


describe('admin order discovery',()=>{
 it('supports searching order identity, buyer contact, delivery address and product with status filtering',()=>{
  const dashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/admin-dashboard.tsx'),'utf8');
  expect(dashboard).toContain('প্রশাসক অর্ডার খুঁজুন');
  expect(dashboard).toContain('o.order_no,o.recipient,o.phone,o.area,o.address_line');
  expect(dashboard).toContain('data.items.filter(i=>i.order_id===o.id).map(i=>i.title)');
  expect(dashboard).toContain("orderStatus==='all'||o.status===orderStatus");
  expect(dashboard).toContain('<option value="processing">প্রস্তুত করা হচ্ছে</option>');
  expect(dashboard).toContain('কোনো অর্ডার মেলেনি');
  expect(dashboard).toContain('ফিল্টার মুছুন');
 });
 it('supports searching admin products by product or store and filtering by status',()=>{
  const dashboard=readFileSync(resolve(process.cwd(),'src/components/marketplace/admin-dashboard.tsx'),'utf8');
  expect(dashboard).toContain('প্রশাসক পণ্য খুঁজুন');
  expect(dashboard).toContain('[p.title_bn,p.seller_stores?.name]');
  expect(dashboard).toContain("productStatus==='all'||p.status===productStatus");
  expect(dashboard).toContain('<option value="draft">খসড়া</option>');
  expect(dashboard).toContain('কোনো পণ্য মেলেনি');
 });
});


describe('password recovery link handling',()=>{
 it('supports both implicit recovery hashes and the Supabase PASSWORD_RECOVERY auth event',()=>{
  const reset=readFileSync(resolve(process.cwd(),'src/routes/reset-password.tsx'),'utf8');
  expect(reset).toContain('hasRecoveryHash(window.location.hash)');
  expect(reset).toContain("event==='PASSWORD_RECOVERY'");
  expect(reset).toContain('subscription.unsubscribe()');
  expect(reset).toContain('supabase.auth.updateUser({password})');
 });
});


describe('password recovery URL detection',()=>{
 it('accepts Supabase recovery links in URL hashes',()=>{
  expect(hasRecoveryHash('#access_token=abc&type=recovery')).toBe(true);
  expect(hasRecoveryHash('#type=recovery&token=abc')).toBe(true);
 });
 it('rejects signup, missing, and unrelated URL hashes',()=>{
  expect(hasRecoveryHash('#type=signup')).toBe(false);
  expect(hasRecoveryHash('#access_token=abc')).toBe(false);
  expect(hasRecoveryHash('')).toBe(false);
 });
});


describe('store discovery controls',()=>{
 it('supports rating, newest, and alphabetical sorting',()=>{
  const stores=readFileSync(resolve(process.cwd(),'src/routes/stores.tsx'),'utf8');
  expect(stores).toContain("sort==='new'?b.created_at.localeCompare(a.created_at)");
  expect(stores).toContain("sort==='name'?a.name.localeCompare(b.name,'bn'):b.rating-a.rating");
  expect(stores).toContain('দোকান সাজান');
 });
 it('shows a validated store logo and rating when available',()=>{
  const stores=readFileSync(resolve(process.cwd(),'src/routes/stores.tsx'),'utf8');
  expect(stores).toContain('s.logo_url&&safeImageUrl(s.logo_url)');
  expect(stores).toContain('s.rating).toLocaleString');
 });
});
