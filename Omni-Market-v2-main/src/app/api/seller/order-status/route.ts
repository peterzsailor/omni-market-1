import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
const schema = z.object({ order_id: z.string().uuid(), status: z.enum(['confirmed','processing','shipped','delivered','cancelled']), note: z.string().max(1000).optional() });
export async function POST(request: Request) {
 const parsed=schema.safeParse(await request.json().catch(()=>null)); if(!parsed.success)return NextResponse.json({error:'Invalid order update.'},{status:400});
 try { const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return NextResponse.json({error:'Sign in required.'},{status:401});
  const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle(); if(!profile||!['seller','admin'].includes(profile.role))return NextResponse.json({error:'Seller access required.'},{status:403});
  const {error}=await supabase.rpc('update_marketplace_order_status',{p_order_id:parsed.data.order_id,p_status:parsed.data.status,p_note:parsed.data.note||''}); if(error){console.error('[seller:order-status]',error);return NextResponse.json({error:/multiple sellers|transition|authorized|final state/i.test(error.message)?error.message:'Could not update this order.'},{status:409});}return NextResponse.json({ok:true});
 }catch(error){console.error('[seller:order-status]',error);return NextResponse.json({error:'Order service temporarily unavailable.'},{status:503});}
}
