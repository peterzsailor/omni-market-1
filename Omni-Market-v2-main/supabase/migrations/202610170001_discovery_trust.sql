-- Discovery performance and privacy-preserving public seller summaries.
-- Apply after the two existing marketplace migrations.
create extension if not exists pg_trgm;
create index if not exists products_name_trgm_idx on public.products using gin (name gin_trgm_ops);
create index if not exists products_description_trgm_idx on public.products using gin (description gin_trgm_ops);
create index if not exists products_location_trgm_idx on public.products using gin (location gin_trgm_ops);
create index if not exists products_category_price_idx on public.products(status, category, price_kes);
create index if not exists products_condition_idx on public.products(status, condition, created_at desc);
create index if not exists seller_reviews_seller_rating_idx on public.seller_reviews(seller_id, rating);
create index if not exists order_items_seller_order_idx on public.order_items(seller_id, order_id);

-- Expose only storefront-safe seller information. Never expose phone numbers or account metadata.
create or replace function public.get_public_seller_summaries(p_seller_ids uuid[])
returns table (
  seller_id uuid,
  display_name text,
  location text,
  verified boolean,
  member_since timestamptz,
  completed_orders bigint,
  average_rating numeric,
  review_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id as seller_id,
    coalesce(nullif(trim(p.full_name), ''), 'Omni Market seller') as display_name,
    p.location,
    p.seller_verified as verified,
    p.created_at as member_since,
    coalesce((
      select count(distinct o.id)
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.seller_id = p.id and o.status = 'delivered'::public.order_status
    ), 0)::bigint as completed_orders,
    coalesce((select round(avg(sr.rating)::numeric, 1) from public.seller_reviews sr where sr.seller_id = p.id), 0)::numeric as average_rating,
    coalesce((select count(*) from public.seller_reviews sr where sr.seller_id = p.id), 0)::bigint as review_count
  from public.profiles p
  where p.id = any(coalesce(p_seller_ids, array[]::uuid[]))
    and p.role in ('seller'::public.account_role, 'admin'::public.account_role);
$$;
revoke all on function public.get_public_seller_summaries(uuid[]) from public;
grant execute on function public.get_public_seller_summaries(uuid[]) to anon, authenticated;
