import {describe,it,expect} from 'vitest';
import {safeImageUrl,canTransition,deliverySchema,categorySchema,validQuantity,realOrderAllowed,cartTotal} from '@/lib/marketplace';
describe('marketplace validation',()=>{
 it('accepts credential-free HTTPS images',()=>expect(safeImageUrl('https://images.example.com/product.jpg')).toBe(true));
 it('rejects nonsecure image URLs',()=>expect(safeImageUrl('http://images.example.com/product.jpg')).toBe(false));
 it('rejects image URLs containing credentials',()=>expect(safeImageUrl('https://user:password@example.com/x.jpg')).toBe(false));
 it('rejects local/private image hosts',()=>{for(const url of ['https://127.0.0.1/x','https://localhost/x','https://10.0.0.1/x','https://foo.internal/x'])expect(safeImageUrl(url)).toBe(false);});
 it('allows manual confirmation before shipment',()=>expect(canTransition('pending','confirmed')).toBe(true));
 it('does not skip confirmation',()=>expect(canTransition('pending','shipped')).toBe(false));
 it('does not reverse completed delivery',()=>expect(canTransition('delivered','pending')).toBe(false));
 it('accepts Bangladesh mobile format',()=>expect(deliverySchema.safeParse({recipient:'ক্রেতা',phone:'01712345678',area:'চট্টগ্রাম',address:'দোকানের ঠিকানা'}).success).toBe(true));
 it('rejects foreign mobile format',()=>expect(deliverySchema.safeParse({recipient:'ক্রেতা',phone:'+15551234567',area:'চট্টগ্রাম',address:'দোকানের ঠিকানা'}).success).toBe(false));
 it('rejects invalid category slug',()=>expect(categorySchema.safeParse({name_bn:'পোশাক',name_en:'Clothing',slug:'../../bad',sort_order:0}).success).toBe(false));
 it('enforces integer quantities within stock and cart limits',()=>{expect(validQuantity(1,1)).toBe(true);expect(validQuantity(2,1)).toBe(false);expect(validQuantity(1.5,10)).toBe(false);expect(validQuantity(100,200)).toBe(false);});
 it('allows real orders only from non-demo stores',()=>{const real={id:'p',price:100,seller_stores:{is_demo:false}} as any;const demo={...real,seller_stores:{is_demo:true}};expect(realOrderAllowed([real])).toBe(true);expect(realOrderAllowed([demo])).toBe(false);expect(realOrderAllowed([])).toBe(false);});
 it('calculates cart total using product prices and delivery fee',()=>{const p1={id:'a',price:100} as any;const p2={id:'b',price:250} as any;expect(cartTotal([{id:'a',quantity:2},{id:'b',quantity:1}],[p1,p2],50)).toBe(500);});
});