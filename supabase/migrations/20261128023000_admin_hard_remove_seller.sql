alter table public.courier_shipments
  alter column store_id drop not null;

alter table public.courier_shipments
  drop constraint if exists courier_shipments_store_id_fkey;

alter table public.courier_shipments
  add constraint courier_shipments_store_id_fkey
  foreign key (store_id)
  references public.seller_stores(id)
  on delete set null;

create or replace function public.admin_remove_seller_store(
  p_store_id uuid,
  p_owner_id uuid,
  p_admin_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_owner_id uuid;
  v_is_demo boolean;
begin
  if p_admin_user_id is null or not exists (
    select 1 from public.user_roles
    where user_id = p_admin_user_id and role = 'admin'
  ) then
    raise exception 'Forbidden';
  end if;

  select s.owner_id, s.is_demo
    into v_owner_id, v_is_demo
  from public.seller_stores s
  where s.id = p_store_id
  for update;

  if not found then
    raise exception 'Store not found';
  end if;
  if coalesce(v_is_demo, true) then
    raise exception 'Demo stores cannot be removed';
  end if;
  if v_owner_id is null or v_owner_id <> p_owner_id then
    raise exception 'Store owner mismatch';
  end if;
  if exists (
    select 1 from public.user_roles
    where user_id = v_owner_id and role = 'admin'
  ) then
    raise exception 'Admin accounts cannot be removed as sellers';
  end if;
  if not exists (select 1 from auth.users where id = v_owner_id) then
    raise exception 'Seller auth account not found';
  end if;

  -- Keep orders, order items, and courier records. Their store/product
  -- references become NULL through the FK rules; order snapshots remain.
  delete from public.seller_applications where user_id = v_owner_id;
  delete from public.carts where user_id = v_owner_id;
  delete from public.user_roles where user_id = v_owner_id;
  delete from public.profiles where id = v_owner_id;
  delete from public.seller_stores where id = p_store_id;
  delete from auth.users where id = v_owner_id;

  return jsonb_build_object(
    'success', true,
    'storeId', p_store_id,
    'ownerId', v_owner_id
  );
end;
$function$;

revoke all on function public.admin_remove_seller_store(uuid, uuid, uuid) from public;
revoke all on function public.admin_remove_seller_store(uuid, uuid, uuid) from anon;
revoke all on function public.admin_remove_seller_store(uuid, uuid, uuid) from authenticated;
grant execute on function public.admin_remove_seller_store(uuid, uuid, uuid) to service_role;
