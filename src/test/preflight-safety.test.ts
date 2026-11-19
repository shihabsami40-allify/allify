import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const inventory = readFileSync(
  resolve(process.cwd(), 'supabase/preflight/001_authoritative_schema_inventory.sql'),
  'utf8',
).toLowerCase();
const mapping = readFileSync(
  resolve(process.cwd(), 'supabase/preflight/002_legacy_data_mapping_report.sql'),
  'utf8',
).toLowerCase();
const contract = readFileSync(
  resolve(process.cwd(), 'supabase/preflight/003_target_contract_diff.sql'),
  'utf8',
).toLowerCase();

describe('Supabase preflight scripts are read-only', () => {
  it('does not contain data or schema mutation statements', () => {
    const forbidden = /\b(insert\s+into|update\s+public\.|delete\s+from|alter\s+table|drop\s+table|create\s+table|truncate\s+table)\b/i;
    expect(inventory).not.toMatch(forbidden);
    expect(mapping).not.toMatch(forbidden);
    expect(contract).not.toMatch(forbidden);
  });

  it('compares the current application table contract and required RPC names', () => {
    for (const name of ['seller_stores', 'seller_applications', 'delivery_areas', 'product_images', 'cart_items', 'checkout_request_id', 'logo_url', 'banner_url', 'category_hint', 'reviewed_at', 'sort_order', 'updated_at', 'rating']) {
      expect(contract).toContain(name);
    }
    for (const name of ['has_role', 'place_order', 'cancel_order_item', 'review_seller_application']) {
      expect(contract).toContain(name);
    }
    expect(contract).toContain('information_schema.columns');
    expect(contract).toContain('expected_enum');
    expect(contract).toContain('application_status');
    expect(contract).toContain('store_status');
    expect(contract).toContain('product_status');
    expect(contract).not.toMatch(/select\\s+(customer_phone|customer_name|delivery_address|phone)\\s+from/i);
  });

  it('inspects the authoritative legacy tables and their security configuration', () => {
    for (const name of ['profiles', 'categories', 'stores', 'products', 'orders', 'order_items']) {
      expect(inventory).toContain(name);
    }
    expect(inventory).toContain('pg_policies');
    expect(inventory).toContain('pg_proc');
    expect(inventory).toContain('pg_indexes');
    expect(inventory).toContain('information_schema.triggers');
    expect(inventory).toContain("where schemaname = 'storage' and tablename = 'objects'");
    expect(inventory).toContain('with_check');
    expect(inventory).toContain('has_table_privilege');
    expect(inventory).toContain('has_sequence_privilege');
    expect(inventory).toContain('pg_default_acl');
    expect(inventory).toContain('pg_depend');
    expect(inventory).toContain("'is_admin', 'owns_store'");
  });

  it('reports legacy mapping risks without returning customer contact data', () => {
    for (const name of ['legacy_product_status', 'exact_slug_candidate', 'negative_subtotal_candidate_count', 'missing_product_reference_count', 'order_state']) {
      expect(mapping).toContain(name);
    }
    expect(mapping).not.toMatch(/select\s+(customer_phone|customer_name|delivery_address|phone)\s+from/i);
  });

  it('never reads Storage object names or contents', () => {
    expect(mapping).toContain('count(*) as object_count');
    expect(mapping).not.toMatch(/select\s+name\s+from\s+storage\.objects/i);
  });
});
