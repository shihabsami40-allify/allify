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
const baseline = readFileSync(
  resolve(process.cwd(), 'drizzle/migrations/0000_migration.sql'),
  'utf8',
).toLowerCase();
const checkoutMigration = readFileSync(
  resolve(process.cwd(), 'drizzle/migrations/0009_checkout_request_idempotency.sql'),
  'utf8',
).toLowerCase();
const readiness = readFileSync(
  resolve(process.cwd(), 'supabase/preflight/004_migration_readiness.sql'),
  'utf8',
).toLowerCase();
const contract = readFileSync(
  resolve(process.cwd(), 'supabase/preflight/003_target_contract_diff.sql'),
  'utf8',
).toLowerCase();
const functionAccessMigration = readFileSync(
  resolve(process.cwd(), 'drizzle/migrations/0002_restrict_internal_function_access.sql'),
  'utf8',
).toLowerCase();
const orderLifecycleMigration = readFileSync(
  resolve(process.cwd(), 'drizzle/migrations/0003_order_status_lifecycle.sql'),
  'utf8',
).toLowerCase();


const rlsPerformanceMigration = readFileSync(
  resolve(process.cwd(), 'drizzle/migrations/0018_optimize_rls_auth_and_fk_indexes.sql'),
  'utf8',
).toLowerCase();

const anonHardeningMigration = readFileSync(
  resolve(process.cwd(), 'drizzle/migrations/0017_restrict_anon_helper_execution.sql'),
  'utf8',
).toLowerCase();
const policyOptimizationMigration = readFileSync(
  resolve(process.cwd(), 'drizzle/migrations/0019_split_overlapping_select_policies.sql'),
  'utf8',
).toLowerCase();
const storagePolicyMigration = readFileSync(
  resolve(process.cwd(), 'drizzle/migrations/0020_remove_legacy_storage_policy_overrides.sql'),
  'utf8',
).toLowerCase();
const duplicateStorageReadMigration = readFileSync(
  resolve(process.cwd(), 'drizzle/migrations/0021_remove_duplicate_storage_read_policy.sql'),
  'utf8',
).toLowerCase();

describe('Supabase preflight scripts are read-only', () => {
  it('restricts internal SECURITY DEFINER helpers from anonymous callers without removing authenticated policy access', () => {
    expect(anonHardeningMigration).toContain('revoke execute on function public.has_role');
    expect(anonHardeningMigration).toContain('revoke execute on function public.is_my_order');
    expect(anonHardeningMigration).toContain('revoke execute on function public.order_has_my_store');
    expect(anonHardeningMigration).toContain('revoke execute on function public.owns_store');
    expect(anonHardeningMigration).toContain('create policy "products public read anon"');
    expect(anonHardeningMigration).toContain('create policy "stores public read anon"');
    expect(anonHardeningMigration).toContain('grant execute on function public.has_role');
  });

  it('optimizes auth.uid policy evaluation and indexes uncovered foreign keys', () => {
    expect(rlsPerformanceMigration).toContain("replace(p.qual, 'auth.uid()', '(select auth.uid())')");
    expect(rlsPerformanceMigration).toContain('cart_items_product_id_idx');
    expect(rlsPerformanceMigration).toContain('order_items_product_id_idx');
    expect(rlsPerformanceMigration).toContain('product_images_product_id_idx');
  });

  it('splits admin and owner write policies from public SELECT policies', () => {
    expect(policyOptimizationMigration).toContain('drop policy if exists "categories admin write"');
    expect(policyOptimizationMigration).toContain('create policy "categories admin insert"');
    expect(policyOptimizationMigration).toContain('create policy "areas admin update"');
    expect(policyOptimizationMigration).toContain('create policy "images owner insert"');
    expect(policyOptimizationMigration).toContain('create policy "images owner update"');
    expect(policyOptimizationMigration).toContain('create policy "images owner delete"');
    expect(policyOptimizationMigration).not.toContain('create policy "categories public read"');
    expect(policyOptimizationMigration).not.toContain('create policy "images public read"');
  });

  it('removes legacy Storage policies that bypass active seller-store ownership checks', () => {
    expect(storagePolicyMigration).toContain('drop policy if exists "product images own upload" on storage.objects');
    expect(storagePolicyMigration).toContain('drop policy if exists "product images own delete" on storage.objects');
  });

  it('removes duplicate public-read Storage policy without disabling canonical public reads', () => {
    expect(duplicateStorageReadMigration).toContain('drop policy if exists "product images public read" on storage.objects');
  });

  it('keeps migration function revokes ordered after function creation', () => {
    expect(functionAccessMigration).not.toContain('sync_order_status_from_items()');
    expect(orderLifecycleMigration).toContain('create or replace function public.sync_order_status_from_items()');
  });

  it('does not contain data or schema mutation statements', () => {
    const forbidden = /\b(insert\s+into|update\s+public\.|delete\s+from|alter\s+table|drop\s+table|create\s+table|truncate\s+table)\b/i;
    expect(inventory).not.toMatch(forbidden);
    expect(mapping).not.toMatch(forbidden);
    expect(contract).not.toMatch(forbidden);
    expect(readiness).not.toMatch(forbidden);
  });

  it('compares the current application table contract and required RPC names', () => {
    for (const name of ['seller_stores', 'seller_applications', 'delivery_areas', 'product_images', 'cart_items', 'checkout_request_id', 'logo_url', 'banner_url', 'category_hint', 'reviewed_at', 'sort_order', 'updated_at', 'rating']) {
      expect(contract).toContain(name);
    }
    for (const name of ['has_role', 'place_order', 'cancel_order_item', 'review_seller_application', 'to_regprocedure', 'security_definer', 'function_settings', 'anon_execute', 'authenticated_execute', 'missing_exact_signature']) {
      expect(contract).toContain(name);
    }
    expect(contract).toContain('public.has_role(uuid, public.app_role)');
    expect(baseline).toContain('function public.has_role(_user_id uuid, _role public.app_role)');
    expect(baseline).not.toContain('function public.has_role(_role public.app_role, _user_id uuid)');
    expect(checkoutMigration).toContain('p_items jsonb');
    expect(checkoutMigration).toContain('p_request_id uuid');
    expect(contract).toContain('public.place_order(jsonb, text, text, text, text, uuid, text, boolean)');
    expect(contract).toContain('public.cancel_order_item(uuid)');
    expect(baseline).toContain('function public.review_seller_application(p_app_id uuid, p_approve boolean, p_note text default null)');
    expect(contract).toContain('public.review_seller_application(uuid, boolean, text)');
    expect(contract).toContain('information_schema.columns');
    expect(contract).toContain('expected_enum');
    expect(contract).toContain('review_legacy_label');
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

  it('reports migration mapping and reconciliation risks using aggregate-only output', () => {
    for (const name of ['duplicate_owner_groups', 'stores_without_ascii_slug_candidate', 'unmatched — manual mapping', 'non_positive_price_count', 'item_header_subtotal_mismatches', 'unresolved_product_links', 'unresolved_store_links', 'product-images']) {
      expect(readiness).toContain(name);
    }
    expect(readiness).not.toMatch(/select\\s+(customer_phone|customer_name|delivery_address|phone|order_number)\\s+from/i);
    expect(readiness).not.toMatch(/select\\s+name\\s+from\\s+storage\\.objects/i);
  });

  it('never reads Storage object names or contents', () => {
    expect(mapping).toContain('count(*) as object_count');
    expect(mapping).not.toMatch(/select\s+name\s+from\s+storage\.objects/i);
  });
});
