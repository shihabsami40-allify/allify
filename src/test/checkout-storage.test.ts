import {webcrypto} from 'node:crypto';
import {TextEncoder} from 'node:util';
import {afterAll,describe,expect,it,vi} from 'vitest';
import {checkoutRequestStorageKey} from '@/lib/checkout-storage';

vi.stubGlobal('crypto',webcrypto);
vi.stubGlobal('TextEncoder',TextEncoder);
afterAll(()=>vi.unstubAllGlobals());

describe('checkout request storage key privacy',()=>{
 const payload={recipient:'Test Customer',phone:'01712345678',area:'Chattogram',address:'Private home address',note:'Call on arrival',items:[{id:'product-1',quantity:2}]};
 it('uses a deterministic SHA-256 fingerprint without exposing checkout details in the key',async()=>{
  const key=await checkoutRequestStorageKey('user-123',payload);
  expect(key).toMatch(/^allify:checkout-request:v2:[a-f0-9]{64}$/);
  expect(key).not.toContain(payload.recipient);
  expect(key).not.toContain(payload.phone);
  expect(key).not.toContain(payload.address);
  expect(await checkoutRequestStorageKey('user-123',payload)).toBe(key);
 });
 it('creates different keys when the customer or order payload changes',async()=>{
  const key=await checkoutRequestStorageKey('user-123',payload);
  expect(await checkoutRequestStorageKey('user-456',payload)).not.toBe(key);
  expect(await checkoutRequestStorageKey('user-123',{...payload,phone:'01812345678'})).not.toBe(key);
 });
});
