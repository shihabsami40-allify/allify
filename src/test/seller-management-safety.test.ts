import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const functions = readFileSync(
  resolve(process.cwd(), 'src/lib/marketplace.functions.ts'),
  'utf8',
);
const dashboard = readFileSync(
  resolve(process.cwd(), 'src/components/marketplace/seller-dashboard.tsx'),
  'utf8',
);
const imageStorage = readFileSync(
  resolve(process.cwd(), 'drizzle/migrations/0006_secure_product_image_storage.sql'),
  'utf8',
).toLowerCase();
const imageBucket = readFileSync(
  resolve(process.cwd(), 'drizzle/migrations/0007_harden_product_image_bucket_config.sql'),
  'utf8',
).toLowerCase();
const imageRows = readFileSync(
  resolve(process.cwd(), 'drizzle/migrations/0014_restrict_suspended_store_image_rows.sql'),
  'utf8',
).toLowerCase();
const applicationSubmission = readFileSync(
  resolve(process.cwd(), 'drizzle/migrations/0012_serialize_seller_application_submissions.sql'),
  'utf8',
).toLowerCase();

const cancellationMigration = readFileSync(
  resolve(process.cwd(), 'drizzle/migrations/0016_atomic_order_item_cancellation.sql'),
  'utf8',
).toLowerCase();

describe('seller management authorization and lifecycle contract', () => {
  it('limits product creation and updates to the signed-in owner of an active store', () => {
    expect(functions).toContain(".eq('owner_id',context.userId).eq('status','active')");
    expect(functions).toContain(".update(values).eq('id',id).eq('store_id',data.store_id)");
    expect(functions).toContain('productSchema.parse(input)');
  });

  it('requires an authenticated applicant and a valid active delivery area', () => {
    expect(functions).toContain("middleware([requireSupabaseAuth]).validator(input=>applicationSchema.parse(input))");
    expect(functions).toContain(".eq('name_bn',data.area).eq('active',true)");
    expect(functions).toContain("db.from('seller_applications').insert({...data,user_id:context.userId})");
  });

  it('checks order ownership, demo status and allowed transitions before seller updates', () => {
    expect(functions).toContain("current.data.orders?.is_demo===true");
    expect(functions).toContain('!canTransition(current.data.status,data.status)');
    expect(functions).toContain(".eq('owner_id',context.userId).single()");
    expect(functions).toContain("db.rpc('cancel_order_item',{p_item_id:data.id})");
  });

  it('does not allow product creation or image upload while the store is suspended', () => {
    expect(dashboard).toContain("store.status!=='active'");
    expect(dashboard).toContain("disabled={store.status!=='active'||busy||imageUploading}");
    expect(dashboard).toContain("accept=\"image/jpeg,image/png,image/webp\"");
    expect(dashboard).toContain('file.size>5*1024*1024');
  });

  it('aligns seller image upload paths with owner/store-scoped Storage policies', () => {
    expect(dashboard).toContain('`${user.id}/${store.id}/${crypto.randomUUID()}.`');
    expect(imageStorage).toContain("array_length(storage.foldername(name), 1) = 2");
    expect(imageStorage).toContain("(storage.foldername(name))[1] = (select auth.uid())::text");
    expect(imageStorage).toContain("s.id::text = (storage.foldername(name))[2]");
    expect(imageStorage).toContain("s.status = 'active'");
    expect(imageStorage).toContain('s.is_demo = false');
    expect(imageBucket).toContain('5242880');
    expect(imageBucket).toContain("array['image/jpeg','image/png','image/webp']");
  });

  it('prevents suspended or demo stores from changing product image rows', () => {
    expect(imageRows).toContain("s.status = 'active'");
    expect(imageRows).toContain('s.is_demo = false');
    expect(imageRows).toContain("public.has_role(auth.uid(), 'admin')");
  });

  it('serializes seller applications and rejects concurrent duplicate submissions', () => {
    expect(applicationSubmission).toContain('pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0))');
    expect(applicationSubmission).toContain("where user_id = new.user_id and status = 'pending'");
    expect(applicationSubmission).toContain('a signed-in applicant is required');
    expect(applicationSubmission).toContain('where owner_id = new.user_id');
  });

  it('restores stock exactly once through the guarded cancellation RPC', () => {
    expect(cancellationMigration).toContain('for update of oi');
    expect(cancellationMigration).toContain('public.owns_store(v_item.store_id)');
    expect(cancellationMigration).toContain('if v_item.is_demo then');
    expect(cancellationMigration).toContain("if v_item.status = 'cancelled' then");
    expect(cancellationMigration).toContain("v_item.status not in ('pending', 'confirmed')");
    expect(cancellationMigration).toContain('set stock = stock + v_item.quantity');
    expect(cancellationMigration).toContain('sold_count = greatest(0, sold_count - v_item.quantity)');
    expect(cancellationMigration).toContain("set_config('app.internal', '1', true)");
    expect(cancellationMigration).toContain('grant execute on function public.cancel_order_item(uuid) to authenticated');
  });

  it('refreshes seller management, catalog and order data after a successful write', () => {
    expect(dashboard).toContain("queryKey:['seller-management']");
    expect(dashboard).toContain("queryKey:['catalog']");
    expect(dashboard).toContain("queryKey:['customer-orders']");
  });
});
