-- Operational tables for the marketplace. Apply after 202610160001_marketplace.sql.
-- Role escalation is intentionally restricted to the become_seller() RPC; admins must be assigned out-of-band.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), 'customer'::public.account_role)
  on conflict (id) do nothing;
  return new;
end; $$;

create or replace function public.guard_profile_role_change() returns trigger language plpgsql security definer set search_path = public as $$
begin
 if new.role is distinct from old.role and coalesce(current_setting('app.allow_role_change', true), '') <> 'yes' then
   raise exception 'Role changes must use the approved onboarding flow';
 end if;
 new.updated_at := now();
 return new;
end; $$;
drop trigger if exists guard_profile_role_change on public.profiles;
create trigger guard_profile_role_change before update on public.profiles for each row execute function public.guard_profile_role_change();

drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Users update own profile without role escalation" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create or replace function public.become_seller() returns void language plpgsql security definer set search_path = public as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 perform set_config('app.allow_role_change','yes',true);
 update public.profiles set role='seller', updated_at=now() where id=auth.uid() and role='customer';
end; $$;
revoke all on function public.become_seller() from public;
grant execute on function public.become_seller() to authenticated;

create table if not exists public.notifications (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check (kind in ('order','payment','listing','account','system')),
 title text not null check (char_length(title) between 1 and 160), body text not null default '',
 href text, read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx on public.notifications(user_id, created_at desc);

create table if not exists public.order_events (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 actor_id uuid references public.profiles(id) on delete set null,
 status public.order_status not null, note text not null default '', created_at timestamptz not null default now()
);
create index if not exists order_events_order_created_idx on public.order_events(order_id, created_at desc);

create table if not exists public.payment_transactions (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict,
 provider text not null check (provider in ('mpesa','cash_on_delivery','other')),
 provider_reference text unique, checkout_request_id text unique, receipt_number text unique,
 amount_kes integer not null check (amount_kes > 0), phone text, status text not null default 'initiated' check (status in ('initiated','pending','succeeded','failed','reversed')),
 provider_payload jsonb not null default '{}'::jsonb, verified_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists payment_transactions_order_idx on public.payment_transactions(order_id, created_at desc);

create table if not exists public.disputes (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict,
 opened_by uuid not null references public.profiles(id) on delete restrict,
 reason text not null check (char_length(reason) between 5 and 120), details text not null check (char_length(details) between 10 and 5000),
 status text not null default 'open' check (status in ('open','under_review','resolved','rejected')),
 resolution text, resolved_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists disputes_status_created_idx on public.disputes(status, created_at desc);

create table if not exists public.product_reports (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
 reporter_id uuid not null references public.profiles(id) on delete cascade,
 reason text not null check (char_length(reason) between 3 and 100), details text not null default '',
 status text not null default 'pending' check (status in ('pending','reviewing','dismissed','actioned')),
 reviewed_by uuid references public.profiles(id) on delete set null, reviewed_at timestamptz, created_at timestamptz not null default now(),
 unique(product_id, reporter_id)
);

create table if not exists public.seller_reviews (
 id uuid primary key default gen_random_uuid(), seller_id uuid not null references public.profiles(id) on delete cascade,
 buyer_id uuid not null references public.profiles(id) on delete cascade,
 order_id uuid not null references public.orders(id) on delete cascade,
 rating integer not null check (rating between 1 and 5), review text not null default '' check (char_length(review) <= 2000),
 created_at timestamptz not null default now(), unique(order_id,buyer_id), check (seller_id <> buyer_id)
);

alter table public.notifications enable row level security;
alter table public.order_events enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.disputes enable row level security;
alter table public.product_reports enable row level security;
alter table public.seller_reviews enable row level security;

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Users mark own notifications read" on public.notifications;
create policy "Users mark own notifications read" on public.notifications for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "Order participants read order events" on public.order_events;
create policy "Order participants read order events" on public.order_events for select to authenticated using (exists(select 1 from public.orders o where o.id = order_id and (o.buyer_id = (select auth.uid()) or exists(select 1 from public.order_items i where i.order_id=o.id and i.seller_id=(select auth.uid())))));
drop policy if exists "Buyers read own payment transactions" on public.payment_transactions;
create policy "Buyers read own payment transactions" on public.payment_transactions for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and o.buyer_id=(select auth.uid())));
drop policy if exists "Order participants read disputes" on public.disputes;
create policy "Order participants read disputes" on public.disputes for select to authenticated using (opened_by=(select auth.uid()) or exists(select 1 from public.orders o where o.id=order_id and (o.buyer_id=(select auth.uid()) or exists(select 1 from public.order_items i where i.order_id=o.id and i.seller_id=(select auth.uid())))));
drop policy if exists "Buyers open disputes on own orders" on public.disputes;
create policy "Buyers open disputes on own orders" on public.disputes for insert to authenticated with check (opened_by=(select auth.uid()) and exists(select 1 from public.orders o where o.id=order_id and o.buyer_id=(select auth.uid())));
drop policy if exists "Users create product reports" on public.product_reports;
create policy "Users create product reports" on public.product_reports for insert to authenticated with check (reporter_id=(select auth.uid()));
drop policy if exists "Public read seller reviews" on public.seller_reviews;
create policy "Public read seller reviews" on public.seller_reviews for select using (true);
drop policy if exists "Verified buyers review sellers for their orders" on public.seller_reviews;
create policy "Verified buyers review sellers for their orders" on public.seller_reviews for insert to authenticated with check (buyer_id=(select auth.uid()) and exists(select 1 from public.orders o join public.order_items i on i.order_id=o.id where o.id=public.seller_reviews.order_id and o.buyer_id=(select auth.uid()) and i.seller_id=public.seller_reviews.seller_id and o.status='delivered'));

-- Payment transaction writes and moderation resolution are intentionally server/admin-only.
revoke insert, update, delete on public.payment_transactions from anon, authenticated;
revoke insert, update, delete on public.order_events from anon, authenticated;
revoke update, delete on public.product_reports from anon, authenticated;
