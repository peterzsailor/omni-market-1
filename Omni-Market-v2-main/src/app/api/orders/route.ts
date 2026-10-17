import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const schema = z.object({
  items: z.array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(99), expected_price_kes: z.number().int().min(1).max(2147483647) })).min(1).max(50)
    .superRefine((items, ctx) => {
      const ids = items.map((item) => item.product_id);
      if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Send each product once with its requested quantity.' });
    }),
  customer_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^(?:\+254|0)[0-9]{9}$/),
  email: z.string().email().max(254).optional().or(z.literal('')),
  delivery_address: z.string().trim().min(5).max(500),
  county: z.string().trim().min(2).max(100),
  delivery_notes: z.string().max(1000).optional(),
  idempotency_key: z.string().uuid(),
});


export async function GET() {
  const raw = process.env.OMNI_DELIVERY_FEE_KES;
  if (!raw || !/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > 2147483647) {
    return NextResponse.json({ error: 'Delivery fee is not configured.' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
  return NextResponse.json({ deliveryFeeKes: Number(raw) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check your delivery details and cart quantities, then try again.' }, { status: 400 });

  // A delivery fee policy must be configured server-side; never trust a browser-supplied total.
  const deliveryFee = process.env.OMNI_DELIVERY_FEE_KES;
  if (!deliveryFee || !/^\d+$/.test(deliveryFee) || !Number.isSafeInteger(Number(deliveryFee)) || Number(deliveryFee) > 2147483647) {
    return NextResponse.json({ error: 'Checkout is not available yet because the delivery fee has not been configured. Your bag has been preserved.' }, { status: 503 });
  }

  try {
    const body = parsed.data;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Please sign in before placing an order. Your bag will be kept.' }, { status: 401 });
    const { data, error } = await supabase.rpc('create_marketplace_order', {
      p_items: body.items,
      p_customer_name: body.customer_name,
      p_phone: body.phone,
      p_email: body.email || null,
      p_delivery_address: body.delivery_address,
      p_county: body.county,
      p_delivery_notes: body.delivery_notes || null,
      p_idempotency_key: body.idempotency_key,
      p_delivery_fee_kes: Number(deliveryFee),
    });
    if (error) {
      console.error('[orders:POST]', error);
      const known = /Product unavailable|Price changed|Insufficient stock|Invalid quantity|Cart is empty|Authentication required/i.test(error.message);
      return NextResponse.json({ error: known ? error.message : 'We could not place this order. Your bag has been preserved; please try again.' }, { status: 409 });
    }
    return NextResponse.json({ orderId: data, paymentStatus: 'unpaid' }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('[orders:POST]', error);
    return NextResponse.json({ error: 'Checkout is temporarily unavailable. Your bag has been preserved.' }, { status: 503 });
  }
}
