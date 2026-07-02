import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/mfa/disable — Disable MFA for current user
 * Body: { factorId: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { factorId } = await req.json().catch(() => ({}));
  if (!factorId) return NextResponse.json({ error: 'factorId is required' }, { status: 400 });

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
