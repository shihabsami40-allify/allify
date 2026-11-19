import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('authenticated COD checkout RPC contract', () => {
  it('keeps the generated Supabase RPC arguments aligned with the idempotent SQL signature', () => {
    const types = read('src/integrations/supabase/types.ts');
    const migration = read('drizzle/migrations/0009_checkout_request_idempotency.sql');
    const checkout = read('src/components/marketplace/checkout-view.tsx');

    expect(types).toMatch(/place_order:\s*\{[\s\S]*?p_items:\s*Json[\s\S]*?p_request_id:\s*string[\s\S]*?p_note\?:\s*string[\s\S]*?p_save_address\?:\s*boolean/);
    expect(migration).toMatch(/CREATE FUNCTION public\.place_order\([\s\S]*?p_request_id uuid[\s\S]*?p_note text DEFAULT NULL[\s\S]*?p_save_address boolean DEFAULT false/i);
    expect(checkout).toContain("supabase.rpc('place_order'");
    expect(checkout).toContain('p_request_id:request.id');
  });

  it('keeps checkout request IDs required by the database and customer-scoped', () => {
    const migration = read('drizzle/migrations/0009_checkout_request_idempotency.sql').toLowerCase();
    expect(migration).toContain('if p_request_id is null then');
    expect(migration).toContain('on public.orders(customer_id, checkout_request_id)');
    expect(migration).toContain('pg_advisory_xact_lock(hashtextextended(v_uid::text');
  });
});
