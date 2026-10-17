-- Run this migration in the Supabase SQL editor or with Supabase CLI.
create extension if not exists pgcrypto;

create type public.account_role as enum ('customer', 'seller', 'admin');
create type public.product_condition as enum ('new', 'like_new', 'good', 'fair');
create type public.product_status as enum ('pending', 'active', 'rejected', 'archived');
create type public.order_status as enum ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  location text,
  role public.account_role not null default 'customer',
  seller_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    case when new.raw_user_meta_data ->> 'requested_role' = 'seller' then 'seller'::public.account_role else 'customer'::public.account_role end)
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(name) between 3 and 120),
  description text not null check (char_length(description) >= 20),
  category text not null,
  price_kes integer not null check (price_kes > 0),
  condition public.product_condition not null default 'good',
  location text not null,
  image_urls text[] not null default '{}',
  stock integer not null default 1 check (stock >= 0),
  status public.product_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_browse_idx on public.products(status, category, created_at desc);
create index products_seller_idx on public.products(seller_id, created_at desc);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id) on delete restrict,
  status public.order_status not null default 'pending',
  subtotal_kes integer not null check (subtotal_kes >= 0),
  delivery_fee_kes integer not null default 0 check (delivery_fee_kes >= 0),
  total_kes integer not null check (total_kes >= 0),
  customer_name text not null,
  phone text not null,
  email text,
  delivery_address text not null,
  county text not null,
  delivery_notes text,
  payment_method text not null default 'cash_on_delivery' check (payment_method in ('cash_on_delivery','mpesa')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','pending','paid','failed','refunded')),
  payment_reference text unique,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_id, idempotency_key)
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  seller_id uuid not null references public.profiles(id) on delete restrict,
  product_name text not null,
  unit_price_kes integer not null check (unit_price_kes > 0),
  quantity integer not null check (quantity > 0),
  line_total_kes integer not null check (line_total_kes > 0)
);
create table public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.favorites enable row level security;
create policy "Profiles visible to owner" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "Users update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()) and role in ('customer','seller'));
create policy "Active products are public" on public.products for select using (status = 'active' or seller_id = (select auth.uid()));
create policy "Sellers create own products" on public.products for insert to authenticated with check (seller_id = (select auth.uid()) and (select p.role from public.profiles p where p.id = (select auth.uid())) in ('seller','admin'));
create policy "Sellers update own products" on public.products for update to authenticated using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));
create policy "Sellers delete own products" on public.products for delete to authenticated using (seller_id = (select auth.uid()));
create policy "Buyers view own orders" on public.orders for select to authenticated using (buyer_id = (select auth.uid()));
create policy "Buyer creates own order" on public.orders for insert to authenticated with check (buyer_id = (select auth.uid()));
create policy "Buyers view their order items" on public.order_items for select to authenticated using (exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = (select auth.uid())) or seller_id = (select auth.uid()));
create policy "Users manage own favorites" on public.favorites for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Product images: public read, authenticated uploads into a per-user folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "Product images public read" on storage.objects for select using (bucket_id = 'product-images');
create policy "Users upload product images to own folder" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users update their product images" on storage.objects for update to authenticated using (bucket_id = 'product-images' and owner_id = (select auth.uid())::text) with check (bucket_id = 'product-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users delete their product images" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and owner_id = (select auth.uid())::text);

-- Controlled customer-to-seller onboarding; never permits self-assignment of admin.
create or replace function public.become_seller() returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.profiles set role = 'seller', updated_at = now() where id = auth.uid() and role = 'customer';
end; $$;
revoke all on function public.become_seller() from public;
grant execute on function public.become_seller() to authenticated;

-- Atomic, server-verified order creation. Prices and seller IDs come from the DB, not the browser.
create or replace function public.create_marketplace_order(
  p_items jsonb, p_customer_name text, p_phone text, p_email text,
  p_delivery_address text, p_county text, p_delivery_notes text,
  p_idempotency_key uuid
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid(); v_order uuid; v_subtotal integer := 0; v_item jsonb; v_product products%rowtype; v_qty integer;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;
  select id into v_order from orders where buyer_id = v_user and idempotency_key = p_idempotency_key;
  if v_order is not null then return v_order; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    if v_qty < 1 or v_qty > 99 then raise exception 'Invalid quantity'; end if;
    select * into v_product from products where id = (v_item->>'product_id')::uuid and status = 'active' for update;
    if not found then raise exception 'Product unavailable'; end if;
    if v_product.stock < v_qty then raise exception 'Insufficient stock for %', v_product.name; end if;
    v_subtotal := v_subtotal + v_product.price_kes * v_qty;
  end loop;
  insert into orders (buyer_id, subtotal_kes, delivery_fee_kes, total_kes, customer_name, phone, email, delivery_address, county, delivery_notes, idempotency_key)
  values (v_user, v_subtotal, 0, v_subtotal, left(trim(p_customer_name),120), left(trim(p_phone),30), nullif(left(trim(coalesce(p_email,'')),254),''), left(trim(p_delivery_address),500), left(trim(p_county),100), left(trim(coalesce(p_delivery_notes,'')),1000), p_idempotency_key)
  returning id into v_order;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::integer;
    select * into v_product from products where id = (v_item->>'product_id')::uuid for update;
    insert into order_items (order_id, product_id, seller_id, product_name, unit_price_kes, quantity, line_total_kes)
    values (v_order, v_product.id, v_product.seller_id, v_product.name, v_product.price_kes, v_qty, v_product.price_kes * v_qty);
    update products set stock = stock - v_qty, updated_at = now() where id = v_product.id;
  end loop;
  return v_order;
end; $$;
revoke all on function public.create_marketplace_order(jsonb,text,text,text,text,text,text,uuid) from public;
grant execute on function public.create_marketplace_order(jsonb,text,text,text,text,text,text,uuid) to authenticated;
