import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/mfa/verify — Verify TOTP code and activate MFA
 * Body: { factorId: string, code: string }
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { factorId, code } = await req.json().catch(() => ({}));
  if (!factorId || !code) {
    return NextResponse.json({ error: 'factorId and code are required' }, { status: 400 });
  }

  // Create a challenge
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) return NextResponse.json({ error: challengeError.message }, { status: 400 });

  // Verify the code
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) return NextResponse.json({ error: verifyError.message }, { status: 400 });

  return NextResponse.json({ success: true });
}
