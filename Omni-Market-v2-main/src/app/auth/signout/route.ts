import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function POST(request: NextRequest) { try { const supabase = await createClient(); await supabase.auth.signOut(); } catch { /* Redirect to login even if configuration is missing. */ } return NextResponse.redirect(new URL('/login', request.url), { status: 303 }); }
