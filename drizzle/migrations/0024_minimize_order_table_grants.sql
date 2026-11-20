-- Keep order access behind RLS and the protected checkout/cancellation RPCs.
-- Anonymous clients must not hold direct table privileges.
revoke all on table public.orders from anon;
revoke all on table public.order_items from anon;

-- Authenticated users read their own orders/items; seller status updates are
-- further constrained by the existing RLS policies and update guard trigger.
revoke all on table public.orders from authenticated;
revoke all on table public.order_items from authenticated;
grant select, update on table public.orders to authenticated;
grant select, update on table public.order_items to authenticated;
