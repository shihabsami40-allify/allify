-- Avoid overlapping SELECT policies while preserving existing public-read behavior.
-- Admins still read through the public SELECT policy; admin write access is
-- expressed only for INSERT/UPDATE/DELETE. Product image ownership rules remain
-- identical for writes.

drop policy if exists "categories admin write" on public.categories;
create policy "categories admin insert" on public.categories
  for insert to authenticated
  with check (public.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "categories admin update" on public.categories
  for update to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role))
  with check (public.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "categories admin delete" on public.categories
  for delete to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "areas admin write" on public.delivery_areas;
create policy "areas admin insert" on public.delivery_areas
  for insert to authenticated
  with check (public.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "areas admin update" on public.delivery_areas
  for update to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role))
  with check (public.has_role((select auth.uid()), 'admin'::public.app_role));
create policy "areas admin delete" on public.delivery_areas
  for delete to authenticated
  using (public.has_role((select auth.uid()), 'admin'::public.app_role));

drop policy if exists "images owner write" on public.product_images;
create policy "images owner insert" on public.product_images
  for insert to authenticated
  with check (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or exists (
      select 1 from public.products p
      join public.seller_stores s on s.id = p.store_id
      where p.id = product_images.product_id
        and s.owner_id = (select auth.uid())
        and s.status = 'active'::public.store_status
        and s.is_demo = false
    )
  );
create policy "images owner update" on public.product_images
  for update to authenticated
  using (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or exists (
      select 1 from public.products p
      join public.seller_stores s on s.id = p.store_id
      where p.id = product_images.product_id
        and s.owner_id = (select auth.uid())
        and s.status = 'active'::public.store_status
        and s.is_demo = false
    )
  )
  with check (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or exists (
      select 1 from public.products p
      join public.seller_stores s on s.id = p.store_id
      where p.id = product_images.product_id
        and s.owner_id = (select auth.uid())
        and s.status = 'active'::public.store_status
        and s.is_demo = false
    )
  );
create policy "images owner delete" on public.product_images
  for delete to authenticated
  using (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or exists (
      select 1 from public.products p
      join public.seller_stores s on s.id = p.store_id
      where p.id = product_images.product_id
        and s.owner_id = (select auth.uid())
        and s.status = 'active'::public.store_status
        and s.is_demo = false
    )
  );
