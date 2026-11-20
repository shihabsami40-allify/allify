-- The baseline and lifecycle migrations both attached the same guard
-- function to order_items UPDATE. Keep the explicit lifecycle trigger only.
drop trigger if exists order_items_guard on public.order_items;
