-- Align the recovery migration history with the security migration already applied
-- in the authoritative Lovable Cloud database.
-- Trigger functions are invoked by triggers; clients must not execute them directly.
REVOKE EXECUTE ON FUNCTION public.admin_exists(), public.guard_application_insert(), public.guard_demo_stock(), public.guard_order_insert(), public.guard_order_update(), public.guard_product_insert(), public.guard_product_update(), public.guard_store_update(), public.handle_new_user(), public.guard_order_item_update(), public.sync_order_status_from_items() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.place_order(jsonb,text,text,text,text,text,boolean) FROM PUBLIC, anon, authenticated;
ALTER POLICY "images public read" ON public.product_images USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id));
