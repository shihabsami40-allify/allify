create type public.app_role as enum ('admin','seller','customer');
create type public.store_status as enum ('pending','active','suspended');
create type public.product_status as enum ('active','draft','hidden');
create type public.order_status as enum ('pending','confirmed','shipped','delivered','cancelled');
create type public.application_status as enum ('pending','approved','rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text check (char_length(full_name) <= 100),
  phone text check (phone is null or phone ~ '^01[3-9][0-9]{8}$'),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles readable" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "own profile read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), 100))
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'customer') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.claim_first_admin()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.user_roles where role = 'admin') then return false; end if;
  insert into public.user_roles (user_id, role) values (auth.uid(), 'admin') on conflict do nothing;
  return true;
end $$;
revoke execute on function public.claim_first_admin() from anon, public;
grant execute on function public.claim_first_admin() to authenticated;
create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,40}$'),
  name_bn text not null check (char_length(name_bn) between 1 and 60),
  name_en text not null check (char_length(name_en) between 1 and 60),
  icon text not null default 'Package',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "categories public read" on public.categories for select to anon, authenticated using (true);
create policy "categories admin write" on public.categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.delivery_areas (
  id uuid primary key default gen_random_uuid(),
  name_bn text not null,
  name_en text not null unique,
  zone text not null check (zone in ('city','upazila')),
  fee numeric(10,2) not null check (fee >= 0),
  active boolean not null default true,
  sort_order int not null default 0
);
grant select on public.delivery_areas to anon, authenticated;
grant insert, update, delete on public.delivery_areas to authenticated;
grant all on public.delivery_areas to service_role;
alter table public.delivery_areas enable row level security;
create policy "areas public read" on public.delivery_areas for select to anon, authenticated using (true);
create policy "areas admin write" on public.delivery_areas for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.seller_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  store_name text not null check (char_length(store_name) between 2 and 80),
  owner_name text not null check (char_length(owner_name) between 2 and 100),
  phone text not null check (phone ~ '^01[3-9][0-9]{8}$'),
  area text not null check (char_length(area) between 2 and 60),
  address text not null check (char_length(address) between 5 and 300),
  category_hint text check (char_length(category_hint) <= 100),
  description text check (char_length(description) <= 1000),
  status public.application_status not null default 'pending',
  admin_note text check (char_length(admin_note) <= 500),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
grant select, insert, update on public.seller_applications to authenticated;
grant all on public.seller_applications to service_role;
alter table public.seller_applications enable row level security;
create policy "apps own read" on public.seller_applications for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "apps own insert" on public.seller_applications for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and admin_note is null);
create policy "apps admin update" on public.seller_applications for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.seller_stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,60}$'),
  name text not null check (char_length(name) between 2 and 80),
  name_en text check (char_length(name_en) <= 80),
  description text check (char_length(description) <= 1000),
  area text not null default 'Kotwali',
  address text check (char_length(address) <= 300),
  phone text check (phone is null or phone ~ '^01[3-9][0-9]{8}$'),
  logo_url text,
  banner_url text,
  status public.store_status not null default 'active',
  is_demo boolean not null default false,
  rating numeric(2,1) not null default 0,
  created_at timestamptz not null default now()
);
create unique index seller_stores_owner_unique on public.seller_stores(owner_id) where owner_id is not null;
grant select on public.seller_stores to anon, authenticated;
grant update on public.seller_stores to authenticated;
grant all on public.seller_stores to service_role;
alter table public.seller_stores enable row level security;
create policy "stores public read active" on public.seller_stores for select to anon, authenticated
  using (status = 'active' or owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "stores owner update" on public.seller_stores for update to authenticated
  using (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (owner_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create or replace function public.guard_store_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then
    if new.status is distinct from old.status or new.owner_id is distinct from old.owner_id
       or new.is_demo is distinct from old.is_demo or new.rating is distinct from old.rating
       or new.slug is distinct from old.slug then
      raise exception 'Only admins can change store status, ownership or slug';
    end if;
  end if;
  return new;
end $$;
create trigger seller_stores_guard before update on public.seller_stores
  for each row execute function public.guard_store_update();

create or replace function public.owns_store(_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.seller_stores where id = _store_id and owner_id = auth.uid())
$$;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.seller_stores(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,90}$'),
  title_bn text not null check (char_length(title_bn) between 2 and 120),
  title_en text check (char_length(title_en) <= 120),
  description text check (char_length(description) <= 3000),
  price numeric(10,2) not null check (price > 0 and price < 10000000),
  compare_price numeric(10,2) check (compare_price is null or compare_price >= 0),
  stock int not null default 0 check (stock >= 0 and stock <= 100000),
  status public.product_status not null default 'active',
  rating numeric(2,1) not null default 0,
  sold_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_store_idx on public.products(store_id);
create index products_cat_idx on public.products(category_id);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "products public read" on public.products for select to anon, authenticated
  using (
    (status = 'active' and exists (select 1 from public.seller_stores s where s.id = store_id and s.status = 'active'))
    or public.owns_store(store_id) or public.has_role(auth.uid(),'admin'));
create policy "products owner insert" on public.products for insert to authenticated
  with check (public.owns_store(store_id) and exists (select 1 from public.seller_stores s where s.id = store_id and s.status = 'active'));
create policy "products owner update" on public.products for update to authenticated
  using (public.owns_store(store_id) or public.has_role(auth.uid(),'admin'))
  with check (public.owns_store(store_id) or public.has_role(auth.uid(),'admin'));
create policy "products owner delete" on public.products for delete to authenticated
  using (public.owns_store(store_id) or public.has_role(auth.uid(),'admin'));

create or replace function public.guard_product_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if not public.has_role(auth.uid(),'admin') and coalesce(current_setting('app.internal', true),'') <> '1'
     and (new.store_id is distinct from old.store_id
     or new.rating is distinct from old.rating or new.sold_count is distinct from old.sold_count) then
    raise exception 'Not allowed';
  end if;
  return new;
end $$;
create trigger products_guard before update on public.products
  for each row execute function public.guard_product_update();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null check (char_length(url) <= 1000),
  sort_order int not null default 0
);
grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;
grant all on public.product_images to service_role;
alter table public.product_images enable row level security;
create policy "images public read" on public.product_images for select to anon, authenticated using (true);
create policy "images owner write" on public.product_images for all to authenticated
  using (exists (select 1 from public.products p where p.id = product_id and (public.owns_store(p.store_id) or public.has_role(auth.uid(),'admin'))))
  with check (exists (select 1 from public.products p where p.id = product_id and (public.owns_store(p.store_id) or public.has_role(auth.uid(),'admin'))));

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.carts to authenticated;
grant all on public.carts to service_role;
alter table public.carts enable row level security;
create policy "carts own" on public.carts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null check (quantity between 1 and 99),
  unique (cart_id, product_id)
);
grant select, insert, update, delete on public.cart_items to authenticated;
grant all on public.cart_items to service_role;
alter table public.cart_items enable row level security;
create policy "cart items own" on public.cart_items for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  recipient text not null check (char_length(recipient) between 2 and 100),
  phone text not null check (phone ~ '^01[3-9][0-9]{8}$'),
  area text not null check (char_length(area) between 2 and 60),
  address_line text not null check (char_length(address_line) between 5 and 300),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.addresses to authenticated;
grant all on public.addresses to service_role;
alter table public.addresses enable row level security;
create policy "addresses own" on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create sequence public.order_no_seq start 1001;
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  customer_id uuid,
  status public.order_status not null default 'pending',
  payment_method text not null default 'cod' check (payment_method in ('cod')),
  subtotal numeric(12,2) not null,
  delivery_fee numeric(10,2) not null,
  total numeric(12,2) not null,
  recipient text not null,
  phone text not null,
  area text not null,
  address_line text not null,
  note text check (char_length(note) <= 500),
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  store_id uuid references public.seller_stores(id) on delete set null,
  title text not null,
  image_url text,
  unit_price numeric(10,2) not null,
  quantity int not null check (quantity > 0),
  status public.order_status not null default 'pending'
);
create index order_items_order_idx on public.order_items(order_id);
create index order_items_store_idx on public.order_items(store_id);
grant select, update on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;

create or replace function public.order_has_my_store(_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.order_items oi join public.seller_stores s on s.id = oi.store_id
                 where oi.order_id = _order_id and s.owner_id = auth.uid())
$$;
create or replace function public.is_my_order(_order_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.orders where id = _order_id and customer_id = auth.uid())
$$;

create policy "orders read" on public.orders for select to authenticated
  using (customer_id = auth.uid() or public.has_role(auth.uid(),'admin') or public.order_has_my_store(id));
create policy "orders admin update" on public.orders for update to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy "order items read" on public.order_items for select to authenticated
  using (public.is_my_order(order_id) or public.owns_store(store_id) or public.has_role(auth.uid(),'admin'));
create policy "order items seller update" on public.order_items for update to authenticated
  using (public.owns_store(store_id) or public.has_role(auth.uid(),'admin'))
  with check (public.owns_store(store_id) or public.has_role(auth.uid(),'admin'));

create or replace function public.guard_order_item_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.unit_price is distinct from old.unit_price or new.quantity is distinct from old.quantity
     or new.store_id is distinct from old.store_id or new.order_id is distinct from old.order_id
     or new.title is distinct from old.title then
    raise exception 'Only status can be changed';
  end if;
  return new;
end $$;
create trigger order_items_guard before update on public.order_items
  for each row execute function public.guard_order_item_update();

create or replace function public.place_order(
  p_items jsonb, p_recipient text, p_phone text, p_area text, p_address text,
  p_note text default null, p_save_address boolean default false)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_fee numeric; v_sub numeric := 0; v_order_id uuid; v_no text;
  it jsonb; v_p record; v_qty int; v_img text;
begin
  if v_uid is null then raise exception 'Please sign in to place an order'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 50 then
    raise exception 'Cart is empty or invalid';
  end if;
  p_recipient := btrim(coalesce(p_recipient,'')); p_address := btrim(coalesce(p_address,''));
  if char_length(p_recipient) not between 2 and 100 then raise exception 'Invalid name'; end if;
  if p_phone !~ '^01[3-9][0-9]{8}$' then raise exception 'Invalid phone number'; end if;
  if char_length(p_address) not between 5 and 300 then raise exception 'Invalid address'; end if;
  if p_note is not null and char_length(p_note) > 500 then raise exception 'Note too long'; end if;
  select fee into v_fee from public.delivery_areas where name_en = p_area and active;
  if v_fee is null then raise exception 'Delivery not available in this area'; end if;

  perform set_config('app.internal','1', true);
  v_no := 'ALF-' || to_char(now() at time zone 'Asia/Dhaka','YYMMDD') || '-' || nextval('public.order_no_seq');
  insert into public.orders (order_no, customer_id, subtotal, delivery_fee, total, recipient, phone, area, address_line, note)
  values (v_no, v_uid, 0, v_fee, 0, p_recipient, p_phone, p_area, p_address, nullif(btrim(coalesce(p_note,'')),''))
  returning id into v_order_id;

  for it in select * from jsonb_array_elements(p_items) loop
    v_qty := (it->>'quantity')::int;
    if v_qty is null or v_qty < 1 or v_qty > 99 then raise exception 'Invalid quantity'; end if;
    select p.* into v_p from public.products p join public.seller_stores s on s.id = p.store_id
      where p.id = (it->>'product_id')::uuid and p.status = 'active' and s.status = 'active' for update of p;
    if not found then raise exception 'A product is no longer available'; end if;
    if v_p.stock < v_qty then raise exception 'Not enough stock for %', v_p.title_bn; end if;
    select url into v_img from public.product_images where product_id = v_p.id order by sort_order limit 1;
    update public.products set stock = stock - v_qty, sold_count = sold_count + v_qty where id = v_p.id;
    insert into public.order_items (order_id, product_id, store_id, title, image_url, unit_price, quantity)
      values (v_order_id, v_p.id, v_p.store_id, v_p.title_bn, v_img, v_p.price, v_qty);
    v_sub := v_sub + v_p.price * v_qty;
  end loop;
  perform set_config('app.internal','', true);

  update public.orders set subtotal = v_sub, total = v_sub + v_fee where id = v_order_id;
  if p_save_address then
    insert into public.addresses (user_id, recipient, phone, area, address_line, is_default)
    values (v_uid, p_recipient, p_phone, p_area, p_address, not exists (select 1 from public.addresses where user_id = v_uid));
  end if;
  delete from public.cart_items where cart_id in (select id from public.carts where user_id = v_uid);
  return v_no;
end $$;
revoke execute on function public.place_order(jsonb,text,text,text,text,text,boolean) from anon, public;
grant execute on function public.place_order(jsonb,text,text,text,text,text,boolean) to authenticated;

create or replace function public.review_seller_application(p_app_id uuid, p_approve boolean, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_app record; v_store uuid; v_slug text;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
  select * into v_app from public.seller_applications where id = p_app_id for update;
  if not found then raise exception 'Application not found'; end if;
  if v_app.status <> 'pending' then raise exception 'Already reviewed'; end if;
  if not p_approve then
    update public.seller_applications set status='rejected', admin_note=left(p_note,500), reviewed_at=now() where id = p_app_id;
    return null;
  end if;
  if v_app.user_id is null then raise exception 'Demo application has no account'; end if;
  if exists (select 1 from public.seller_stores where owner_id = v_app.user_id) then raise exception 'User already has a store'; end if;
  v_slug := 'store-' || substr(replace(gen_random_uuid()::text,'-',''),1,10);
  insert into public.seller_stores (owner_id, slug, name, description, area, address, phone, status)
    values (v_app.user_id, v_slug, v_app.store_name, v_app.description, v_app.area, v_app.address, v_app.phone, 'active')
    returning id into v_store;
  insert into public.user_roles (user_id, role) values (v_app.user_id, 'seller') on conflict do nothing;
  update public.seller_applications set status='approved', admin_note=left(p_note,500), reviewed_at=now() where id = p_app_id;
  return v_store;
end $$;
revoke execute on function public.review_seller_application(uuid,boolean,text) from anon, public;
grant execute on function public.review_seller_application(uuid,boolean,text) to authenticated;

create policy "product images public read" on storage.objects for select using (bucket_id = 'product-images');
create policy "product images own upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "product images own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

insert into public.categories (slug,name_bn,name_en,icon,sort_order) values
 ('clothing','পোশাক','Clothing','Shirt',1),
 ('shoes','জুতা','Shoes','Footprints',2),
 ('watches','ঘড়ি','Watches','Watch',3),
 ('bags','ব্যাগ','Bags','ShoppingBag',4),
 ('daily','নিত্যপ্রয়োজনীয়','Daily Needs','ShoppingBasket',5),
 ('electronics','ইলেকট্রনিক্স','Electronics','Headphones',6),
 ('beauty','সৌন্দর্য ও যত্ন','Beauty & Care','Sparkles',7),
 ('home','গৃহস্থালি','Home & Kitchen','CookingPot',8);

insert into public.delivery_areas (name_bn,name_en,zone,fee,sort_order) values
 ('কোতোয়ালী','Kotwali','city',60,1),('পাঁচলাইশ','Panchlaish','city',60,2),('ডবলমুরিং','Double Mooring','city',60,3),
 ('খুলশী','Khulshi','city',60,4),('হালিশহর','Halishahar','city',60,5),('চান্দগাঁও','Chandgaon','city',60,6),
 ('বাকলিয়া','Bakalia','city',60,7),('বায়েজিদ বোস্তামী','Bayazid','city',60,8),('পতেঙ্গা','Patenga','city',60,9),
 ('পাহাড়তলী','Pahartali','city',60,10),('চকবাজার','Chawkbazar','city',60,11),('বন্দর','Bandar','city',60,12),
 ('হাটহাজারী','Hathazari','upazila',100,20),('পটিয়া','Patiya','upazila',100,21),('সীতাকুণ্ড','Sitakunda','upazila',110,22),
 ('মীরসরাই','Mirsharai','upazila',120,23),('রাউজান','Raozan','upazila',100,24),('রাঙ্গুনিয়া','Rangunia','upazila',110,25),
 ('বোয়ালখালী','Boalkhali','upazila',100,26),('আনোয়ারা','Anwara','upazila',110,27),('বাঁশখালী','Banshkhali','upazila',120,28),
 ('চন্দনাইশ','Chandanaish','upazila',110,29),('সাতকানিয়া','Satkania','upazila',120,30),('লোহাগাড়া','Lohagara','upazila',130,31),
 ('ফটিকছড়ি','Fatikchhari','upazila',120,32),('কর্ণফুলী','Karnaphuli','upazila',90,33),('সন্দ্বীপ','Sandwip','upazila',150,34);

insert into public.seller_stores (slug,name,name_en,description,area,address,phone,status,is_demo,rating) values
 ('reazuddin-fashion','রিয়াজউদ্দিন ফ্যাশন হাউস','Reazuddin Fashion House','রিয়াজউদ্দিন বাজারের পুরনো পোশাকের দোকান। পাঞ্জাবি, শাড়ি ও দেশি পোশাক।','Kotwali','রিয়াজউদ্দিন বাজার, কোতোয়ালী','01811000001','active',true,4.7),
 ('new-market-shoes','নিউমার্কেট শু কর্নার','New Market Shoe Corner','চামড়ার জুতা, স্নিকার্স ও স্যান্ডেল — সব বয়সের জন্য।','Kotwali','বিপণি বিতান (নিউমার্কেট), কোতোয়ালী','01811000002','active',true,4.5),
 ('agrabad-time','আগ্রাবাদ টাইম গ্যালারি','Agrabad Time Gallery','ঘড়ি ও গ্যাজেট, ওয়ারেন্টিসহ।','Double Mooring','আগ্রাবাদ বাণিজ্যিক এলাকা','01811000003','active',true,4.6),
 ('gec-bag-house','জিইসি ব্যাগ হাউস','GEC Bag House','স্কুল ব্যাগ, ল্যাপটপ ব্যাকপ্যাক ও লেডিস ব্যাগ।','Panchlaish','জিইসি মোড়, পাঁচলাইশ','01811000004','active',true,4.4),
 ('hathazari-mudi','হাটহাজারী মুদি ঘর','Hathazari Mudi Ghor','চাল, ডাল, তেলসহ নিত্যপ্রয়োজনীয় পণ্য ন্যায্য দামে।','Hathazari','হাটহাজারী বাজার','01811000005','active',true,4.8),
 ('khulshi-home-tech','খুলশী হোম অ্যান্ড টেক','Khulshi Home & Tech','রান্নাঘরের সরঞ্জাম ও দৈনন্দিন ইলেকট্রনিক্স।','Khulshi','খুলশী টাউন সেন্টার','01811000006','active',true,4.3);

with v(slug,store,cat,tbn,ten,descr,price,cmp,stock,img,rating,sold) as (values
 ('cotton-panjabi-cream','reazuddin-fashion','clothing','সুতি পাঞ্জাবি — ক্রিম','Cotton Panjabi — Cream','আরামদায়ক ১০০% সুতি কাপড়, গলায় সূক্ষ্ম এমব্রয়ডারি। সাইজ: M, L, XL।',1450,1800,40,'panjabi',4.7,212),
 ('khadi-panjabi-eid','reazuddin-fashion','clothing','খাদি পাঞ্জাবি — ঈদ কালেকশন','Khadi Panjabi — Eid Collection','হাতে বোনা খাদি কাপড়ের প্রিমিয়াম পাঞ্জাবি।',2200,2600,18,'panjabi',4.8,96),
 ('jamdani-saree-red','reazuddin-fashion','clothing','জামদানি শাড়ি — লাল-সোনালী','Jamdani Saree — Red & Gold','ঐতিহ্যবাহী নকশার জামদানি শাড়ি, ব্লাউজ পিসসহ।',4800,5500,9,'saree',4.9,61),
 ('cotton-tshirt-men','reazuddin-fashion','clothing','ছেলেদের সুতি টি-শার্ট','Men''s Cotton T-shirt','প্রতিদিনের ব্যবহারের নরম সুতি টি-শার্ট, ৫টি রঙে।',450,600,120,'tshirt',4.4,540),
 ('polo-tshirt-navy','reazuddin-fashion','clothing','পোলো টি-শার্ট — নেভি','Polo T-shirt — Navy','পিকে কাপড়ের ক্লাসিক পোলো।',650,850,60,'tshirt',4.5,188),
 ('white-sneakers','new-market-shoes','shoes','সাদা স্নিকার্স','White Sneakers','হালকা ও আরামদায়ক ক্যাজুয়াল স্নিকার্স। সাইজ ৩৯–৪৪।',1950,2400,35,'sneakers',4.5,174),
 ('running-shoes','new-market-shoes','shoes','রানিং শু','Running Shoes','কুশন সোল, শ্বাস-প্রশ্বাসযোগ্য মেশ।',2350,2900,22,'sneakers',4.3,83),
 ('leather-formal-shoes','new-market-shoes','shoes','চামড়ার ফরমাল জুতা','Leather Formal Shoes','খাঁটি গরুর চামড়া, হাতে সেলাই।',3200,3800,15,'leather-shoes',4.7,97),
 ('leather-loafer','new-market-shoes','shoes','চামড়ার লোফার','Leather Loafer','অফিস ও অনুষ্ঠানে মানানসই।',2700,null,12,'leather-shoes',4.4,45),
 ('analog-watch-classic','agrabad-time','watches','ক্লাসিক অ্যানালগ ঘড়ি','Classic Analog Watch','চামড়ার বেল্ট, ওয়াটার রেজিস্ট্যান্ট। ১ বছরের ওয়ারেন্টি।',2850,3500,25,'watch',4.6,132),
 ('steel-chrono-watch','agrabad-time','watches','স্টেইনলেস স্টিল ক্রোনো ঘড়ি','Stainless Chrono Watch','ক্রোনোগ্রাফ ডায়াল, স্টিল চেইন।',4500,5200,10,'watch',4.7,58),
 ('wireless-earbuds','agrabad-time','electronics','ওয়্যারলেস ইয়ারবাড','Wireless Earbuds','ব্লুটুথ ৫.৩, ২০ ঘণ্টা ব্যাকআপ।',1650,2200,50,'earbuds',4.2,310),
 ('leather-handbag-tan','gec-bag-house','bags','চামড়ার হ্যান্ডব্যাগ — ট্যান','Leather Handbag — Tan','প্রশস্ত ভেতর, একাধিক পকেট।',2400,2900,20,'handbag',4.6,77),
 ('ladies-crossbody','gec-bag-house','bags','লেডিস ক্রসবডি ব্যাগ','Ladies Crossbody Bag','হালকা ওজনের ক্রসবডি, অ্যাডজাস্টেবল স্ট্র্যাপ।',1350,1600,30,'handbag',4.4,119),
 ('laptop-backpack','gec-bag-house','bags','ল্যাপটপ ব্যাকপ্যাক','Laptop Backpack','১৫.৬" ল্যাপটপ কম্পার্টমেন্ট, ওয়াটারপ্রুফ।',1850,2300,28,'backpack',4.5,203),
 ('school-bag','gec-bag-house','bags','স্কুল ব্যাগ','School Bag','টেকসই কাপড়, আরামদায়ক কাঁধের প্যাড।',950,1200,45,'backpack',4.3,260),
 ('miniket-rice-5kg','hathazari-mudi','daily','মিনিকেট চাল — ৫ কেজি','Miniket Rice — 5kg','বাছাইকৃত সরু চাল।',420,null,200,'grocery',4.8,890),
 ('masoor-dal-1kg','hathazari-mudi','daily','মসুর ডাল — ১ কেজি','Masoor Dal — 1kg','দেশি মসুর ডাল, পরিষ্কার ও বাছাই করা।',145,160,300,'grocery',4.7,720),
 ('soybean-oil-2l','hathazari-mudi','daily','সয়াবিন তেল — ২ লিটার','Soybean Oil — 2L','ভিটামিন এ সমৃদ্ধ পরিশোধিত সয়াবিন তেল।',370,390,150,'grocery',4.6,640),
 ('aloe-facewash','hathazari-mudi','beauty','অ্যালোভেরা ফেসওয়াশ','Aloe Vera Face Wash','সব ধরনের ত্বকের জন্য কোমল ফেসওয়াশ।',280,350,80,'skincare',4.4,233),
 ('herbal-soap-pack','hathazari-mudi','beauty','ভেষজ সাবান — ৩ পিস','Herbal Soap — 3 pcs','নিম ও হলুদের প্রাকৃতিক সাবান।',210,240,100,'skincare',4.5,301),
 ('nonstick-frypan','khulshi-home-tech','home','নন-স্টিক ফ্রাইপ্যান — ২৪ সেমি','Non-stick Frypan — 24cm','মজবুত হ্যান্ডেল, অল্প তেলে রান্না।',1150,1450,40,'cookware',4.5,156),
 ('pressure-cooker-5l','khulshi-home-tech','home','প্রেশার কুকার — ৫ লিটার','Pressure Cooker — 5L','সেফটি ভাল্ভসহ অ্যালুমিনিয়াম প্রেশার কুকার।',2650,3100,14,'cookware',4.6,88),
 ('power-bank-10000','khulshi-home-tech','electronics','পাওয়ার ব্যাংক — ১০০০০ mAh','Power Bank — 10000mAh','ফাস্ট চার্জিং, দুটি USB পোর্ট।',1250,1500,55,'earbuds',4.3,275)
), ins as (
 insert into public.products (store_id,category_id,slug,title_bn,title_en,description,price,compare_price,stock,rating,sold_count)
 select s.id, c.id, v.slug, v.tbn, v.ten, v.descr, v.price, v.cmp, v.stock, v.rating, v.sold
 from v join public.seller_stores s on s.slug = v.store join public.categories c on c.slug = v.cat
 returning id, slug
)
insert into public.product_images (product_id,url,sort_order)
select ins.id, '/images/products/' || v.img || '.jpg', 0 from ins join v on v.slug = ins.slug;

insert into public.seller_applications (user_id,store_name,owner_name,phone,area,address,category_hint,description,status) values
 (null,'চকবাজার কসমেটিকস','নাসরিন আক্তার','01712345678','Chawkbazar','চকবাজার মোড়, চট্টগ্রাম','সৌন্দর্য ও যত্ন','দেশি-বিদেশি কসমেটিকস ও স্কিনকেয়ার। (ডেমো আবেদন)','pending'),
 (null,'পতেঙ্গা মোবাইল জোন','আরিফুল ইসলাম','01912345678','Patenga','পতেঙ্গা সি-বিচ রোড','ইলেকট্রনিক্স','মোবাইল এক্সেসরিজ ও গ্যাজেট। (ডেমো আবেদন)','pending');

do $$
declare o uuid; p record; i int := 0;
begin
  for p in select pr.id, pr.store_id, pr.title_bn, pr.price, (select url from public.product_images where product_id = pr.id limit 1) img
           from public.products pr order by pr.sold_count desc limit 6 loop
    i := i + 1;
    insert into public.orders (order_no,status,subtotal,delivery_fee,total,recipient,phone,area,address_line,is_demo,created_at)
    values ('DEMO-' || (2000+i), (array['pending','confirmed','shipped','delivered','delivered','cancelled'])[i]::public.order_status,
            p.price*(1+i%2), 60, p.price*(1+i%2)+60, 'ডেমো গ্রাহক ' || i, '0181100010' || i, 'Panchlaish', 'ডেমো ঠিকানা, পাঁচলাইশ', true, now() - (i || ' days')::interval)
    returning id into o;
    insert into public.order_items (order_id,product_id,store_id,title,image_url,unit_price,quantity,status)
    values (o, p.id, p.store_id, p.title_bn, p.img, p.price, 1+i%2, (array['pending','confirmed','shipped','delivered','delivered','cancelled'])[i]::public.order_status);
  end loop;
end $$;