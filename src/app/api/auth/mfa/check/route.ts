import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/auth/mfa/check — Check MFA status for current user
 * Returns: { enrolled: boolean, tenantMfaRequired: boolean }
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check if user has MFA enrolled
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const enrolled = (factors?.totp?.length ?? 0) > 0;
  const factorId = factors?.totp?.[0]?.id ?? null;

  // Check tenant MFA requirement
  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  const tenantId = (profile as { tenant_id?: string } | null)?.tenant_id;

  let tenantMfaRequired = false;
  if (tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { mfaRequired: true },
    });
    tenantMfaRequired = tenant?.mfaRequired ?? false;
  }

  return NextResponse.json({ enrolled, factorId, tenantMfaRequired });
}
