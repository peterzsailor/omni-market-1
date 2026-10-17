import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  type: z.enum(['product', 'seller']),
  target_id: z.string().uuid(),
  reason: z.string().trim().min(3).max(100),
  details: z.string().trim().max(3000).optional().default(''),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Choose a reason and provide valid report details.' },
      { status: 400 }
    );
  }

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Sign in to submit a report.' },
        { status: 401 }
      );
    }

    if (
      parsed.data.type === 'seller' &&
      parsed.data.target_id === user.id
    ) {
      return NextResponse.json(
        { error: 'You cannot report your own seller profile.' },
        { status: 400 }
      );
    }

    let error;

    if (parsed.data.type === 'product') {
      const payload = {
        product_id: parsed.data.target_id,
        reporter_id: user.id,
        reason: parsed.data.reason,
        details: parsed.data.details,
      };

      const result = await supabase
        .from('product_reports')
        .insert(payload);

      error = result.error;
    } else {
      const payload = {
        seller_id: parsed.data.target_id,
        reporter_id: user.id,
        reason: parsed.data.reason,
        details: parsed.data.details,
      };

      const result = await supabase
        .from('seller_reports')
        .insert(payload);

      error = result.error;
    }

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'You have already reported this listing or seller.' },
          { status: 409 }
        );
      }

      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'This listing or seller could not be found.' },
          { status: 404 }
        );
      }

      console.error('[reports:POST]', error);

      return NextResponse.json(
        { error: 'We could not submit the report. Please try again.' },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error('[reports:POST]', error);

    return NextResponse.json(
      { error: 'Reporting is temporarily unavailable.' },
      { status: 503 }
    );
  }
}