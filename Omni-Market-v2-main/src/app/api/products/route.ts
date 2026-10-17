import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const filtersSchema = z.object({
  id: z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
  brand: z.string().trim().max(100).optional(),
  available: z.enum(['true', 'false']).optional(),
  delivery: z.enum(['delivery', 'pickup']).optional(),
  attributeKey: z.string().trim().regex(/^[a-zA-Z0-9_-]{1,60}$/).optional(),
  attributeValue: z.string().trim().max(100).optional(),
  q: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional(),
  condition: z.enum(['new', 'like_new', 'good', 'fair']).optional(),
  location: z.string().trim().max(100).optional(),
  county: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'name']).default('newest'),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

function safeSearchTerm(value: string) {
  // PostgREST .or() uses commas, parentheses and wildcard characters as syntax.
  return value.replace(/[,%()_*\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = filtersSchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: 'One or more product filters are invalid.', issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const filters = parsed.data;
  try {
    const supabase = await createClient();
    let query = supabase
      .from('products')
      .select('id,name,description,category,brand,attributes,delivery_options,price_kes,condition,location,county,latitude,longitude,image_urls,stock,seller_id,status,created_at', { count: 'exact' })
      .eq('status', 'active');

    if (filters.id) query = query.eq('id', filters.id);
    if (filters.sellerId) query = query.eq('seller_id', filters.sellerId);
    if (filters.brand) query = query.ilike('brand', filters.brand);
    if (filters.available === 'true') query = query.gt('stock', 0);
    if (filters.available === 'false') query = query.eq('stock', 0);
    if (filters.delivery) query = query.contains('delivery_options', [filters.delivery]);
    if (filters.attributeKey && filters.attributeValue) query = query.contains('attributes', { [filters.attributeKey]: filters.attributeValue });
    if (filters.category) query = query.ilike('category', filters.category);
    if (filters.condition) query = query.eq('condition', filters.condition);
    if (filters.location) query = query.ilike('location', `%${filters.location}%`);
    if (filters.county) query = query.eq('county', filters.county);
    if (filters.minPrice !== undefined) query = query.gte('price_kes', filters.minPrice);
    if (filters.maxPrice !== undefined) query = query.lte('price_kes', filters.maxPrice);
    if (filters.q) {
      const term = safeSearchTerm(filters.q);
      if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`);
    }

    if (filters.sort === 'price_asc') query = query.order('price_kes', { ascending: true });
    else if (filters.sort === 'price_desc') query = query.order('price_kes', { ascending: false });
    else if (filters.sort === 'name') query = query.order('name', { ascending: true });
    else query = query.order('created_at', { ascending: false });

    if (filters.id) {
      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
      const { data: sellers } = await supabase.rpc('get_public_seller_summaries', { p_seller_ids: [data.seller_id] });
      const seller = Array.isArray(sellers) ? sellers[0] ?? null : null;
      return NextResponse.json({ product: { ...data, seller } }, { headers: { 'Cache-Control': 'no-store' } });
    }

    const from = (filters.page - 1) * filters.limit;
    const { data, error, count } = await query.range(from, from + filters.limit - 1);
    if (error) throw error;
    const rows = data ?? [];
    const sellerIds = [...new Set(rows.map((product) => product.seller_id))];
    const { data: sellerRows } = sellerIds.length
      ? await supabase.rpc('get_public_seller_summaries', { p_seller_ids: sellerIds })
      : { data: [] };
    const sellerMap = new Map((sellerRows ?? []).map((seller: { seller_id: string }) => [seller.seller_id, seller] as const));
    return NextResponse.json({ products: rows.map((product) => ({ ...product, seller: sellerMap.get(product.seller_id) ?? null })), total: count ?? 0, page: filters.page, limit: filters.limit }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    // Never leak SQL/PostgREST details to public callers.
    console.error('[products:GET]', error);
    return NextResponse.json({ error: 'Live products are temporarily unavailable. Please try again shortly.' }, { status: 503 });
  }
}
