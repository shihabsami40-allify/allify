-- Applied to Supabase project onqadpqdontbdvecnvby on 2026-11-24.
-- Product image object paths are: <user_id>/<store_id>/<product_id>-<timestamp>.<ext>
-- Remove legacy broad policies and use the exact three-segment path + store ownership.

drop policy if exists seller_upload_own_folder on storage.objects;
drop policy if exists seller_update_own_folder on storage.objects;
drop policy if exists seller_delete_own_folder on storage.objects;

drop policy if exists "Sellers upload to their own product folder" on storage.objects;
drop policy if exists "Sellers update their own product images" on storage.objects;
drop policy if exists "Sellers delete their own product images" on storage.objects;

create policy "Sellers upload to active own store product folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and array_length(storage.foldername(storage.objects.name), 1) = 3
  and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.seller_stores s
    where s.id::text = (storage.foldername(storage.objects.name))[2]
      and s.owner_id = (select auth.uid())
      and s.status = 'active'
      and s.is_demo = false
  )
);

create policy "Sellers update active own store product images"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and array_length(storage.foldername(storage.objects.name), 1) = 3
  and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.seller_stores s
    where s.id::text = (storage.foldername(storage.objects.name))[2]
      and s.owner_id = (select auth.uid())
      and s.status = 'active'
      and s.is_demo = false
  )
)
with check (
  bucket_id = 'product-images'
  and array_length(storage.foldername(storage.objects.name), 1) = 3
  and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.seller_stores s
    where s.id::text = (storage.foldername(storage.objects.name))[2]
      and s.owner_id = (select auth.uid())
      and s.status = 'active'
      and s.is_demo = false
  )
);

create policy "Sellers delete own store product images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and array_length(storage.foldername(storage.objects.name), 1) = 3
  and (storage.foldername(storage.objects.name))[1] = (select auth.uid())::text
  and exists (
    select 1 from public.seller_stores s
    where s.id::text = (storage.foldername(storage.objects.name))[2]
      and s.owner_id = (select auth.uid())
      and s.is_demo = false
  )
);
