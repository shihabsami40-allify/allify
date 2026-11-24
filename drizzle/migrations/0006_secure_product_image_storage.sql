-- Restrict product image writes to the authenticated seller's own active, non-demo store.
-- Keep deletion available to the store owner even after suspension so old objects can be cleaned up.

drop policy if exists "Sellers upload to their own product folder" on storage.objects;
create policy "Sellers upload to their own product folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'product-images'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.seller_stores s
    where s.id::text = (storage.foldername(name))[2]
      and s.owner_id = (select auth.uid())
      and s.status = 'active'
      and s.is_demo = false
  )
);

drop policy if exists "Sellers update their own product images" on storage.objects;
create policy "Sellers update their own product images"
on storage.objects for update to authenticated
using (
  bucket_id = 'product-images'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.seller_stores s
    where s.id::text = (storage.foldername(name))[2]
      and s.owner_id = (select auth.uid())
      and s.status = 'active'
      and s.is_demo = false
  )
)
with check (
  bucket_id = 'product-images'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.seller_stores s
    where s.id::text = (storage.foldername(name))[2]
      and s.owner_id = (select auth.uid())
      and s.status = 'active'
      and s.is_demo = false
  )
);

drop policy if exists "Sellers delete their own product images" on storage.objects;
create policy "Sellers delete their own product images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'product-images'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and exists (
    select 1
    from public.seller_stores s
    where s.id::text = (storage.foldername(name))[2]
      and s.owner_id = (select auth.uid())
  )
);
