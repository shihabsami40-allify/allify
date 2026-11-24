-- Keep internal ownership/order helpers out of the anonymous API role.
-- Split public catalog policies so anonymous reads do not need privileged helpers.

drop policy if exists "products public read" on public.products;
drop policy if exists "products public read anon" on public.products;
drop policy if exists "products public read authenticated" on public.products;
create policy "products public read anon"
  on public.products for select to anon
  using (
    status = 'active'::public.product_status
    and exists (
      select 1 from public.seller_stores s
      where s.id = products.store_id
        and s.status = 'active'::public.store_status
    )
  );
create policy "products public read authenticated"
  on public.products for select to authenticated
  using (
    (
      status = 'active'::public.product_status
      and exists (
        select 1 from public.seller_stores s
        where s.id = products.store_id
          and s.status = 'active'::public.store_status
      )
    )
    or public.owns_store(store_id)
    or public.has_role(auth.uid(), 'admin'::public.app_role)
  );

drop policy if exists "stores public read active" on public.seller_stores;
drop policy if exists "stores public read anon" on public.seller_stores;
drop policy if exists "stores public read authenticated" on public.seller_stores;
create policy "stores public read anon"
  on public.seller_stores for select to anon
  using (status = 'active'::public.store_status);
create policy "stores public read authenticated"
  on public.seller_stores for select to authenticated
  using (
    status = 'active'::public.store_status
    or owner_id = auth.uid()
    or public.has_role(auth.uid(), 'admin'::public.app_role)
  );

revoke execute on function public.has_role(uuid, public.app_role) from public, anon;
revoke execute on function public.is_my_order(uuid) from public, anon;
revoke execute on function public.order_has_my_store(uuid) from public, anon;
revoke execute on function public.owns_store(uuid) from public, anon;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_my_order(uuid) to authenticated;
grant execute on function public.order_has_my_store(uuid) to authenticated;
grant execute on function public.owns_store(uuid) to authenticated;
