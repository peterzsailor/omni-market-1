-- Trust, support and operational controls. Apply after 202610170003_catalogue_expansion.sql.
-- Admins must be assigned out-of-band; no client-facing function can grant admin access.

alter table public.profiles
  add column if not exists verification_level text check (verification_level in ('identity_checked','business_checked'));

create table if not exists public.seller_reports (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(reason) between 3 and 100),
  details text not null default '' check (char_length(details) <= 3000),
  status text not null default 'pending' check (status in ('pending','reviewing','dismissed','actioned')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (seller_id, reporter_id),
  check (seller_id <> reporter_id)
);
create index if not exists seller_reports_queue_idx on public.seller_reports(status, created_at desc);

create table if not exists public.support_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text generated always as ('OM-' || upper(substr(replace(id::text, '-', ''), 1, 10))) stored,
  user_id uuid not null references public.profiles(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  topic text not null check (topic in ('order','delivery','payment','refund','listing','account','safety','other')),
  subject text not null check (char_length(subject) between 4 and 160),
  details text not null check (char_length(details) between 10 and 5000),
  status text not null default 'open' check (status in ('open','in_review','waiting_on_customer','resolved','closed')),
  resolution text,
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_cases_user_created_idx on public.support_cases(user_id, created_at desc);
create index if not exists support_cases_queue_idx on public.support_cases(status, created_at desc);

alter table public.seller_reports enable row level security;
alter table public.support_cases enable row level security;

-- Keep seller verification and role fields out of self-service profile updates.
create or replace function public.guard_profile_privileged_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and coalesce(current_setting('app.allow_role_change', true), '') <> 'yes' then
    raise exception 'Role changes must use the approved onboarding flow';
  end if;
  if (new.seller_verified is distinct from old.seller_verified or new.verification_level is distinct from old.verification_level)
     and coalesce(current_setting('app.allow_seller_verification', true), '') <> 'yes' then
    raise exception 'Seller verification can only be changed by an authorized administrator';
  end if;
  new.updated_at := now();
  return new;
end; $$;
drop trigger if exists guard_profile_role_change on public.profiles;
drop trigger if exists guard_profile_privileged_fields on public.profiles;
create trigger guard_profile_privileged_fields before update on public.profiles for each row execute function public.guard_profile_privileged_fields();

create or replace function public.is_marketplace_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_marketplace_admin() from public;
grant execute on function public.is_marketplace_admin() to authenticated;

-- Admins can review queue records; users can only see their own support cases/reports.
drop policy if exists "Admins read all products" on public.products;
create policy "Admins read all products" on public.products for select to authenticated using (public.is_marketplace_admin());
drop policy if exists "Admins read product reports" on public.product_reports;
create policy "Admins read product reports" on public.product_reports for select to authenticated using (public.is_marketplace_admin());
drop policy if exists "Admins read seller reports" on public.seller_reports;
create policy "Admins read seller reports" on public.seller_reports for select to authenticated using (public.is_marketplace_admin());
create policy "Users read own seller reports" on public.seller_reports for select to authenticated using (reporter_id = (select auth.uid()));
create policy "Users submit seller reports" on public.seller_reports for insert to authenticated with check (reporter_id = (select auth.uid()) and seller_id <> (select auth.uid()));
create policy "Users read own support cases" on public.support_cases for select to authenticated using (user_id = (select auth.uid()) or public.is_marketplace_admin());
create policy "Users create own support cases" on public.support_cases for insert to authenticated with check (user_id = (select auth.uid()));
create policy "Admins read all orders" on public.orders for select to authenticated using (public.is_marketplace_admin());
create policy "Admins read all order items" on public.order_items for select to authenticated using (public.is_marketplace_admin());
create policy "Sellers read orders containing their products" on public.orders for select to authenticated using (exists(select 1 from public.order_items i where i.order_id = orders.id and i.seller_id = (select auth.uid())));

-- Seller workflow can update only orders whose every line belongs to that seller.
-- Multi-seller orders require coordinated fulfilment and must be handled by an admin for now.
create or replace function public.update_marketplace_order_status(p_order_id uuid, p_status public.order_status, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_current public.order_status; v_buyer uuid; v_is_admin boolean;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  select status, buyer_id into v_current, v_buyer from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  v_is_admin := public.is_marketplace_admin();
  if not v_is_admin then
    if not exists(select 1 from public.order_items where order_id = p_order_id and seller_id = v_user) then raise exception 'Not authorized for this order'; end if;
    if exists(select 1 from public.order_items where order_id = p_order_id and seller_id <> v_user) then raise exception 'This order has multiple sellers and needs coordinated fulfilment'; end if;
    if p_status not in ('confirmed','processing','shipped','delivered','cancelled') then raise exception 'Status transition not permitted'; end if;
    if not ((v_current = 'pending' and p_status in ('confirmed','cancelled')) or
            (v_current = 'confirmed' and p_status in ('processing','cancelled')) or
            (v_current = 'processing' and p_status in ('shipped','delivered')) or
            (v_current = 'shipped' and p_status = 'delivered')) then raise exception 'Invalid order status transition'; end if;
  end if;
  if v_current = p_status then return; end if;
  if v_current in ('cancelled','refunded','delivered') then raise exception 'Order is already in a final state'; end if;
  update public.orders set status = p_status, updated_at = now() where id = p_order_id;
  if p_status = 'cancelled' then
    update public.products p set stock = p.stock + cancelled.quantity, updated_at = now()
    from (select product_id, sum(quantity)::integer as quantity from public.order_items where order_id = p_order_id group by product_id) cancelled
    where p.id = cancelled.product_id;
  end if;
  insert into public.order_events(order_id, actor_id, status, note) values (p_order_id, v_user, p_status, left(coalesce(p_note,''),1000));
  insert into public.notifications(user_id, kind, title, body, href)
  values (v_buyer, 'order', 'Order status updated', 'Your order status is now ' || replace(p_status::text, '_', ' ') || '.', '/dashboard');
end; $$;
revoke all on function public.update_marketplace_order_status(uuid, public.order_status, text) from public, anon;
grant execute on function public.update_marketplace_order_status(uuid, public.order_status, text) to authenticated;

create or replace function public.admin_moderate_product(p_product_id uuid, p_action text, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_seller uuid; v_status public.product_status;
begin
  if not public.is_marketplace_admin() then raise exception 'Administrator access required'; end if;
  if p_action not in ('approve','reject','remove') then raise exception 'Invalid moderation action'; end if;
  select seller_id into v_seller from public.products where id = p_product_id for update;
  if not found then raise exception 'Listing not found'; end if;
  v_status := case p_action when 'approve' then 'active'::public.product_status when 'reject' then 'rejected'::public.product_status else 'archived'::public.product_status end;
  update public.products set status = v_status, updated_at = now() where id = p_product_id;
  insert into public.notifications(user_id, kind, title, body, href)
  values(v_seller, 'listing', 'Listing moderation update', 'A moderator changed your listing status to ' || v_status::text || CASE WHEN coalesce(trim(p_note),'') = '' THEN '.' ELSE ': ' || left(trim(p_note),500) END, '/dashboard');
end; $$;
revoke all on function public.admin_moderate_product(uuid, text, text) from public, anon;
grant execute on function public.admin_moderate_product(uuid, text, text) to authenticated;

create or replace function public.admin_set_seller_verification(p_seller_id uuid, p_verified boolean, p_level text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_marketplace_admin() then raise exception 'Administrator access required'; end if;
  if p_verified and p_level not in ('identity_checked','business_checked') then raise exception 'Choose a verification level'; end if;
  if not p_verified then p_level := null; end if;
  perform set_config('app.allow_seller_verification','yes',true);
  update public.profiles set seller_verified = p_verified, verification_level = p_level, updated_at = now()
    where id = p_seller_id and role = 'seller';
  if not found then raise exception 'Seller account not found'; end if;
  insert into public.notifications(user_id, kind, title, body, href)
  values(p_seller_id, 'account', 'Seller verification updated', case when p_verified then 'Your seller profile verification level is ' || replace(p_level,'_',' ') || '.' else 'Your seller verification status has been removed.' end, '/dashboard');
end; $$;
revoke all on function public.admin_set_seller_verification(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_seller_verification(uuid, boolean, text) to authenticated;

-- No client can forge provider callbacks or mark an order paid. Payment changes remain provider/admin controlled.
revoke insert, update, delete on public.seller_reports from anon, authenticated;
grant insert on public.seller_reports to authenticated;
revoke update, delete on public.support_cases from anon, authenticated;
revoke insert, update, delete on public.orders from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;

create or replace function public.admin_review_report(p_report_type text, p_report_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_marketplace_admin() then raise exception 'Administrator access required'; end if;
  if p_status not in ('reviewing','dismissed','actioned') then raise exception 'Invalid report status'; end if;
  if p_report_type = 'product' then
    update public.product_reports set status = p_status, reviewed_by = auth.uid(), reviewed_at = now() where id = p_report_id;
  elsif p_report_type = 'seller' then
    update public.seller_reports set status = p_status, reviewed_by = auth.uid(), reviewed_at = now() where id = p_report_id;
  else raise exception 'Invalid report type'; end if;
  if not found then raise exception 'Report not found'; end if;
end; $$;
revoke all on function public.admin_review_report(text, uuid, text) from public, anon;
grant execute on function public.admin_review_report(text, uuid, text) to authenticated;

create or replace function public.admin_update_support_case(p_case_id uuid, p_status text, p_resolution text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  if not public.is_marketplace_admin() then raise exception 'Administrator access required'; end if;
  if p_status not in ('open','in_review','waiting_on_customer','resolved','closed') then raise exception 'Invalid support status'; end if;
  update public.support_cases set status = p_status, resolution = nullif(left(trim(coalesce(p_resolution,'')),3000),''), assigned_to = auth.uid(), updated_at = now()
    where id = p_case_id returning user_id into v_user;
  if not found then raise exception 'Support case not found'; end if;
  insert into public.notifications(user_id, kind, title, body, href)
  values(v_user, 'system', 'Support case updated', 'Your support case status is now ' || replace(p_status,'_',' ') || '.', '/support');
end; $$;
revoke all on function public.admin_update_support_case(uuid, text, text) from public, anon;
grant execute on function public.admin_update_support_case(uuid, text, text) to authenticated;

drop policy if exists "Users create own support cases" on public.support_cases;
create policy "Users create own support cases" on public.support_cases for insert to authenticated
with check (
  user_id = (select auth.uid()) and
  (order_id is null or exists (
    select 1 from public.orders o where o.id = support_cases.order_id and (
      o.buyer_id = (select auth.uid()) or exists (
        select 1 from public.order_items i where i.order_id = o.id and i.seller_id = (select auth.uid())
      )
    )
  ))
);
-- A verified badge always has a concrete level recorded.
create or replace function public.admin_set_seller_verification(p_seller_id uuid, p_verified boolean, p_level text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_marketplace_admin() then raise exception 'Administrator access required'; end if;
  if p_verified and (p_level is null or p_level not in ('identity_checked','business_checked')) then raise exception 'Choose a verification level'; end if;
  if not p_verified then p_level := null; end if;
  perform set_config('app.allow_seller_verification','yes',true);
  update public.profiles set seller_verified = p_verified, verification_level = p_level, updated_at = now()
    where id = p_seller_id and role = 'seller';
  if not found then raise exception 'Seller account not found'; end if;
  insert into public.notifications(user_id, kind, title, body, href)
  values(p_seller_id, 'account', 'Seller verification updated', case when p_verified then 'Your seller profile verification level is ' || replace(p_level,'_',' ') || '.' else 'Your seller verification status has been removed.' end, '/dashboard');
end; $$;
revoke all on function public.admin_set_seller_verification(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_seller_verification(uuid, boolean, text) to authenticated;

drop policy if exists "Admins read seller profiles for verification" on public.profiles;
create policy "Admins read seller profiles for verification" on public.profiles for select to authenticated using (public.is_marketplace_admin());

create or replace function public.get_public_seller_summaries(p_seller_ids uuid[])
returns table (
  seller_id uuid, display_name text, location text, verified boolean, member_since timestamptz,
  completed_orders bigint, average_rating numeric, review_count bigint
)
language sql stable security definer set search_path = '' as $$
  select p.id,
    coalesce(nullif(trim(p.full_name), ''), 'Omni Market seller'),
    p.location,
    (p.seller_verified and p.verification_level is not null),
    p.created_at,
    coalesce((select count(distinct o.id) from public.order_items oi join public.orders o on o.id=oi.order_id where oi.seller_id=p.id and o.status='delivered'::public.order_status),0)::bigint,
    coalesce((select round(avg(sr.rating)::numeric,1) from public.seller_reviews sr where sr.seller_id=p.id),0)::numeric,
    coalesce((select count(*) from public.seller_reviews sr where sr.seller_id=p.id),0)::bigint
  from public.profiles p where p.id=any(coalesce(p_seller_ids,array[]::uuid[])) and p.role in ('seller'::public.account_role,'admin'::public.account_role);
$$;
revoke all on function public.get_public_seller_summaries(uuid[]) from public;
grant execute on function public.get_public_seller_summaries(uuid[]) to anon, authenticated;
