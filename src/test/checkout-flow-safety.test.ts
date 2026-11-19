import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const checkout = readFileSync(
  resolve(process.cwd(), 'src/components/marketplace/checkout-view.tsx'),
  'utf8',
);
const migration = readFileSync(
  resolve(process.cwd(), 'drizzle/migrations/0009_checkout_request_idempotency.sql'),
  'utf8',
).toLowerCase();

describe('customer checkout safety contract', () => {
  it('requires a ready authenticated account before showing the real checkout form', () => {
    expect(checkout).toContain('if(!authReady)');
    expect(checkout).toContain('if(!user)');
    expect(checkout).toContain('আপনার অর্ডার ও ডেলিভারির তথ্য নিরাপদে সংরক্ষণের জন্য অ্যাকাউন্টে প্রবেশ করতে হবে।');
  });

  it('requires an available delivery area from the catalog and calculates its configured fee', () => {
    expect(checkout).toContain('data.areas.find(a=>a.name_bn===area)');
    expect(checkout).toContain('const fee=selected?.fee??0');
    expect(checkout).toContain('disabled={busy||!selected}');
  });

  it('validates the Bangladesh mobile number and COD order payload', () => {
    expect(checkout).toContain('pattern="01[3-9][0-9]{8}"');
    expect(checkout).toContain('p_recipient:parsed.data.recipient');
    expect(checkout).toContain('p_phone:parsed.data.phone');
    expect(checkout).toContain('p_area:parsed.data.area');
    expect(checkout).toContain('p_address:parsed.data.address');
    expect(checkout).toContain('p_save_address:false');
    expect(checkout).toContain('value="cod" checked readOnly');
  });

  it('reuses a request UUID for retries and only clears the cart after a confirmed order', () => {
    expect(checkout).toContain('readStoredJson<string>(cartKey');
    expect(checkout).toContain('writeStoredJson(cartKey,request.id)');
    expect(checkout).toContain('p_request_id:request.id');
    expect(checkout).toContain('if(!orderNo)throw new Error');
    expect(checkout.indexOf('removeStoredValue(cartKey)')).toBeGreaterThan(checkout.indexOf('if(!orderNo)'));
    expect(checkout.indexOf('clearCart()')).toBeGreaterThan(checkout.indexOf('removeStoredValue(cartKey)'));
    expect(checkout).toContain('catch(error){\n    toast.error(checkoutErrorMessage(error));');
  });

  it('locks stock, excludes demo stores, and scopes idempotency to the customer', () => {
    expect(migration).toContain('for update of p');
    expect(migration).toContain('and s.is_demo = false');
    expect(migration).toContain('on public.orders(customer_id, checkout_request_id)');
    expect(migration).toContain('pg_advisory_xact_lock');
  });
});
