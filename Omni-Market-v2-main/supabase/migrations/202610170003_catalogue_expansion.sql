-- Optional catalogue metadata for a broader, multi-category marketplace.
-- Apply after 202610170002_secure_order_totals.sql.
alter table public.products
  add column if not exists brand text,
  add column if not exists attributes jsonb not null default '{}'::jsonb,
  add column if not exists delivery_options text[] not null default array['delivery']::text[];

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'products_brand_length_check') then
    alter table public.products add constraint products_brand_length_check check (brand is null or char_length(brand) <= 100);
  end if;
end $$;

create index if not exists products_brand_browse_idx
  on public.products (lower(brand)) where status = 'active' and brand is not null;
create index if not exists products_delivery_options_idx
  on public.products using gin (delivery_options) where status = 'active';
create index if not exists products_attributes_idx
  on public.products using gin (attributes jsonb_path_ops) where status = 'active';

comment on column public.products.attributes is 'Public, category-specific product attributes only; do not store personal or private seller data.';
comment on column public.products.delivery_options is 'Seller-supported fulfilment methods, e.g. delivery and pickup. Checkout must validate availability and final fees server-side.';
