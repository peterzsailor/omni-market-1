import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  order_id: z.string().uuid().optional().or(z.literal('')),
  topic: z.enum(['order','delivery','payment','refund','listing','account','safety','other']),
  subject: z.string().trim().min(4).max(160),
  details: z.string().trim().min(10).max(5000),
});
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Check the subject and message, then try again.' }, { status: 400 });
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in to open a support case.' }, { status: 401 });
    const orderId = parsed.data.order_id || null;
    if (orderId) {
      const { data: order, error: orderError } = await supabase.from('orders').select('id').eq('id', orderId).eq('buyer_id', user.id).maybeSingle();
      if (orderError) {
        console.error('[support:order-check]', orderError);
        return NextResponse.json({ error: 'We could not verify that order. Please try again.' }, { status: 503 });
      }
      if (!order) return NextResponse.json({ error: 'That order was not found in your account.' }, { status: 404 });
    }
    const { data, error } = await supabase.from('support_cases').insert({ user_id: user.id, order_id: orderId, topic: parsed.data.topic, subject: parsed.data.subject, details: parsed.data.details }).select('id,case_number,status').single();
    if (error) { console.error('[support:POST]', error); return NextResponse.json({ error: 'Support is temporarily unavailable. Please try again.' }, { status: 503 }); }
    return NextResponse.json({ case: data }, { status: 201 });
  } catch (error) {
    console.error('[support:POST]', error);
    return NextResponse.json({ error: 'Support is temporarily unavailable.' }, { status: 503 });
  }
}
