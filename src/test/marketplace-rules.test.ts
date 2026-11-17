import {describe,it,expect} from 'vitest';
import {safeImageUrl,canTransition,deliverySchema,categorySchema} from '@/lib/marketplace';
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
});