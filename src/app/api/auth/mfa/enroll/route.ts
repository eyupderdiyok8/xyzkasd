import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/auth/mfa/enroll — Start MFA enrollment
 * Returns QR code data URL + factor ID for the authenticator app
 */
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    issuer: 'Su Aritma Servis ERP',
    friendlyName: user.email ?? user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({
    factorId: data.id,
    qrCode: data.totp?.qr_code, // base64 SVG
    secret: data.totp?.secret,
    uri: data.totp?.uri,
  });
}
