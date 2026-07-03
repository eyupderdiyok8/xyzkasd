import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ProfileRow } from '@/lib/supabase/types';
import { cookies } from 'next/headers';

/**
 * GET /api/auth/me
 * Returns the current user's profile (used by client components).
 */
export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Giriş yapmalısınız' } },
      { status: 401 },
    );
  }

  const { data: _profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const profile = _profile as ProfileRow | null;
  if (!profile) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Profil bulunamadı' } },
      { status: 404 },
    );
  }

  let effectiveTenantId = profile.tenant_id;
  if (profile.role === 'super_admin') {
    const cookieStore = await cookies();
    const tenantCtx = cookieStore.get('tenant_ctx')?.value;
    effectiveTenantId = tenantCtx && tenantCtx !== 'all' ? tenantCtx : null;
  }

  return NextResponse.json({
    data: {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      tenantId: profile.tenant_id,
      effectiveTenantId,
      isActive: profile.is_active,
    },
  });
}
