import {describe,it,expect} from 'vitest';
import {demoCheckoutAllowed,demoPaymentMethod,demoDeliveryIntegrated} from '@/lib/demo-checkout';
import type {Product} from '@/lib/marketplace';
const product={id:'p',stock:5,seller_stores:{is_demo:true}} as Product;
describe('demo-only checkout',()=>{
 it('accepts a demo product in stock',()=>expect(demoCheckoutAllowed([{id:'p',quantity:2}],[product])).toBe(true));
 it('rejects real products',()=>expect(demoCheckoutAllowed([{id:'p',quantity:1}],[{...product,seller_stores:{...product.seller_stores,is_demo:false}} as Product])).toBe(false));
 it('rejects missing products',()=>expect(demoCheckoutAllowed([{id:'missing',quantity:1}],[product])).toBe(false));
 it('rejects out-of-stock quantities',()=>expect(demoCheckoutAllowed([{id:'p',quantity:6}],[product])).toBe(false));
 it('only uses COD',()=>expect(demoPaymentMethod).toBe('cod'));
 it('does not integrate actual delivery',()=>expect(demoDeliveryIntegrated).toBe(false));
});