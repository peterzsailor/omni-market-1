-- Secure checkout totals and aggregate duplicate product lines before reserving stock.
-- Configure OMNI_DELIVERY_FEE_KES on the server to the delivery policy you actually operate.
-- The API refuses to create orders while that setting is absent or invalid.

drop function if exists public.create_marketplace_order(jsonb,text,text,text,text,text,text,uuid);

create or replace function public.create_marketplace_order(
  p_items jsonb,
  p_customer_name text,
  p_phone text,
  p_email text,
  p_delivery_address text,
  p_county text,
  p_delivery_notes text,
  p_idempotency_key uuid,
  p_delivery_fee_kes integer
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order uuid;
  v_subtotal bigint := 0;
  v_total bigint;
  v_item record;
  v_product public.products%rowtype;
begin
  if v_user is null then raise exception 'Authentication required'; end if;
  if p_delivery_fee_kes is null or p_delivery_fee_kes < 0 then raise exception 'Invalid delivery fee'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;

  -- Repeated submissions with the same key return the already-created order.
  select id into v_order from public.orders
    where buyer_id = v_user and idempotency_key = p_idempotency_key;
  if v_order is not null then return v_order; end if;

  -- Aggregate duplicate IDs and lock products in deterministic order to reduce deadlocks.
  for v_item in
    select (entry.value->>'product_id')::uuid as product_id,
           sum((entry.value->>'quantity')::integer)::integer as quantity,
           min((entry.value->>'expected_price_kes')::integer)::integer as expected_price_kes,
           count(distinct (entry.value->>'expected_price_kes')::integer) as expected_price_variants,
           count(*) as item_entries,
           count((entry.value->>'expected_price_kes')::integer) as quoted_entries
      from jsonb_array_elements(p_items) as entry(value)
     group by (entry.value->>'product_id')::uuid
     order by (entry.value->>'product_id')::uuid
  loop
    if v_item.quantity < 1 or v_item.quantity > 99 then raise exception 'Invalid quantity'; end if;
    select * into v_product from public.products
      where id = v_item.product_id and status = 'active'
      for update;
    if not found then raise exception 'Product unavailable'; end if;
    if v_item.expected_price_kes is null or v_item.expected_price_variants <> 1 or v_item.item_entries <> v_item.quoted_entries or v_item.expected_price_kes <> v_product.price_kes then
      raise exception 'Price changed for %', v_product.name;
    end if;
    if v_product.stock is null or v_product.stock < v_item.quantity then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;
    v_subtotal := v_subtotal + (v_product.price_kes::bigint * v_item.quantity);
  end loop;

  v_total := v_subtotal + p_delivery_fee_kes;
  if v_subtotal > 2147483647 or v_total > 2147483647 then raise exception 'Order total is too large'; end if;

  insert into public.orders (
    buyer_id, subtotal_kes, delivery_fee_kes, total_kes, customer_name, phone,
    email, delivery_address, county, delivery_notes, idempotency_key
  ) values (
    v_user, v_subtotal::integer, p_delivery_fee_kes, v_total::integer,
    left(trim(p_customer_name),120), left(trim(p_phone),30),
    nullif(left(trim(coalesce(p_email,'')),254),''),
    left(trim(p_delivery_address),500), left(trim(p_county),100),
    left(trim(coalesce(p_delivery_notes,'')),1000), p_idempotency_key
  ) returning id into v_order;

  for v_item in
    select (entry.value->>'product_id')::uuid as product_id,
           sum((entry.value->>'quantity')::integer)::integer as quantity,
           min((entry.value->>'expected_price_kes')::integer)::integer as expected_price_kes,
           count(distinct (entry.value->>'expected_price_kes')::integer) as expected_price_variants,
           count(*) as item_entries,
           count((entry.value->>'expected_price_kes')::integer) as quoted_entries
      from jsonb_array_elements(p_items) as entry(value)
     group by (entry.value->>'product_id')::uuid
     order by (entry.value->>'product_id')::uuid
  loop
    select * into v_product from public.products where id = v_item.product_id;
    insert into public.order_items (
      order_id, product_id, seller_id, product_name, unit_price_kes, quantity, line_total_kes
    ) values (
      v_order, v_product.id, v_product.seller_id, v_product.name,
      v_product.price_kes, v_item.quantity, v_product.price_kes * v_item.quantity
    );
    update public.products set stock = stock - v_item.quantity, updated_at = now()
      where id = v_product.id;
  end loop;

  insert into public.order_events(order_id, actor_id, status, note)
    values (v_order, v_user, 'pending', 'Order created; payment remains unpaid until a supported payment flow is verified.');
  return v_order;
end;
$$;

revoke all on function public.create_marketplace_order(jsonb,text,text,text,text,text,text,uuid,integer) from public, anon;
grant execute on function public.create_marketplace_order(jsonb,text,text,text,text,text,text,uuid,integer) to authenticated;
