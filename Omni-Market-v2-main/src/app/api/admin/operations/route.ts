import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('moderate_product'), product_id: z.string().uuid(), decision: z.enum(['approve','reject','remove']), note: z.string().max(500).optional() }),
  z.object({ action: z.literal('review_report'), report_type: z.enum(['product','seller']), report_id: z.string().uuid(), status: z.enum(['reviewing','dismissed','actioned']) }),
  z.object({ action: z.literal('update_case'), case_id: z.string().uuid(), status: z.enum(['open','in_review','waiting_on_customer','resolved','closed']), resolution: z.string().max(3000).optional() }),
  z.object({ action: z.literal('verify_seller'), seller_id: z.string().uuid(), verified: z.boolean(), level: z.enum(['identity_checked','business_checked']).nullable().optional() }),
]);
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid administration request.' }, { status: 400 });
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Administrator access required.' }, { status: 403 });
    const v = parsed.data;
    let result;
    if (v.action === 'moderate_product') result = await supabase.rpc('admin_moderate_product', { p_product_id: v.product_id, p_action: v.decision, p_note: v.note || '' });
    else if (v.action === 'review_report') result = await supabase.rpc('admin_review_report', { p_report_type: v.report_type, p_report_id: v.report_id, p_status: v.status });
    else if (v.action === 'update_case') result = await supabase.rpc('admin_update_support_case', { p_case_id: v.case_id, p_status: v.status, p_resolution: v.resolution || '' });
    else result = await supabase.rpc('admin_set_seller_verification', { p_seller_id: v.seller_id, p_verified: v.verified, p_level: v.verified ? v.level || null : null });
    if (result.error) { console.error('[admin:operations]', result.error); return NextResponse.json({ error: 'The action could not be completed. Check permissions and try again.' }, { status: 409 }); }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[admin:operations]', error);
    return NextResponse.json({ error: 'Administration service is temporarily unavailable.' }, { status: 503 });
  }
}
