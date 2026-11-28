alter table public.seller_stores
  add column if not exists is_removed boolean not null default false;

comment on column public.seller_stores.is_removed is
  'Admin soft-removal flag. Removed stores and their products are hidden from the marketplace while historical order records remain intact.';
