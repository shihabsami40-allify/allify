-- Keep customer-visible order status in sync with seller-managed order items.
-- Sellers may only move an item through the normal fulfillment lifecycle.
create or replace function public.guard_order_item_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.unit_price is distinct from old.unit_price
     or new.quantity is distinct from old.quantity
     or new.store_id is distinct from old.store_id
     or new.order_id is distinct from old.order_id
     or new.product_id is distinct from old.product_id
     or new.title is distinct from old.title
     or new.image_url is distinct from old.image_url then
    raise exception 'Only order status can be changed';
  end if;

  if new.status is distinct from old.status
     and not public.has_role(auth.uid(), 'admin') then
    if not (
      (old.status = 'pending' and new.status in ('confirmed', 'cancelled'))
      or (old.status = 'confirmed' and new.status in ('shipped', 'cancelled'))
      or (old.status = 'shipped' and new.status = 'delivered')
    ) then
      raise exception 'Invalid order status transition';
    end if;
  end if;

  return new;
end;
$;

-- Enforce the transition guard for every direct order-item update.
drop trigger if exists order_items_guard_update on public.order_items;
create trigger order_items_guard_update
before update on public.order_items
for each row
execute function public.guard_order_item_update();

create or replace function public.sync_order_status_from_items()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.order_status;
begin
  select
    case
      when bool_and(status = 'cancelled') then 'cancelled'::public.order_status
      when bool_or(status = 'pending') then 'pending'::public.order_status
      when bool_or(status = 'confirmed') then 'confirmed'::public.order_status
      when bool_or(status = 'shipped') then 'shipped'::public.order_status
      when bool_or(status = 'delivered') then 'delivered'::public.order_status
      else 'pending'::public.order_status
    end
  into v_status
  from public.order_items
  where order_id = new.order_id;

  update public.orders
  set status = v_status
  where id = new.order_id;

  return new;
end;
$$;

drop trigger if exists order_items_sync_order_status on public.order_items;
create trigger order_items_sync_order_status
after update of status on public.order_items
for each row
when (old.status is distinct from new.status)
execute function public.sync_order_status_from_items();


-- Trigger functions are invoked by their triggers, not directly by clients.
revoke all on function public.guard_order_item_update() from public, anon, authenticated;
revoke all on function public.sync_order_status_from_items() from public, anon, authenticated;
