alter table public.seller_stores
  add column if not exists whatsapp_phone text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'seller_stores_whatsapp_phone_check'
      and conrelid = 'public.seller_stores'::regclass
  ) then
    alter table public.seller_stores
      add constraint seller_stores_whatsapp_phone_check
      check (whatsapp_phone is null or whatsapp_phone ~ '^01[3-9][0-9]{8}$');
  end if;
end
$$;
