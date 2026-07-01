import { createServerSupabaseClient } from './server';
import type { UserRole, ProfileRow } from './types';
import { ROLE_HIERARCHY } from '@/lib/roles';
import { cookies } from 'next/headers';

/**
 * Result of a role-check for an API route.
 * Returns structured data so callers can return proper HTTP responses.
 */
export interface RoleCheckResult {
  ok: boolean;
  userId: string | null;
  role: UserRole | null;
  tenantId: string | null;
  error: {
    status: 401 | 403;
    code: string;
    message: string;
  } | null;
}

/**
 * Authenticate and verify the user meets the minimum role requirement.
 *
 * If user is super_admin, checks tenant_ctx cookie for effective tenant filtering.
 * Cookie value of 'all' or absent = no tenant filter (sees everything).
 *
 * Usage in API routes:
 * ```ts
 * const { ok, userId, tenantId, role, error } = await requireRole('manager');
 * if (!ok) return NextResponse.json({ error }, { status: error!.status });
 * ```
 */
export async function requireRole(
  minimumRole: UserRole,
): Promise<RoleCheckResult> {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      ok: false,
      userId: null,
      role: null,
      tenantId: null,
      error: { status: 401, code: 'UNAUTHORIZED', message: 'Giriş yapmalısınız' },
    };
  }

  const { data: _profile } = await supabase
    .from('profiles')
    .select('role, tenant_id, is_active')
    .eq('id', user.id)
    .single();

  const profile = _profile as ProfileRow | null;

  if (!profile) {
    return {
      ok: false,
      userId: user.id,
      role: null,
      tenantId: null,
      error: { status: 403, code: 'FORBIDDEN', message: 'Profil bulunamadı' },
    };
  }

  if (!profile.is_active) {
    return {
      ok: false,
      userId: user.id,
      role: profile.role,
      tenantId: profile.tenant_id,
      error: { status: 403, code: 'FORBIDDEN', message: 'Hesabınız aktif değil. Yöneticinize başvurun.' },
    };
  }

  const userRole = profile.role;
  const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
  const minLevel = ROLE_HIERARCHY[minimumRole] ?? 0;

  if (userLevel < minLevel) {
    return {
      ok: false,
      userId: user.id,
      role: userRole,
      tenantId: profile.tenant_id,
      error: { status: 403, code: 'FORBIDDEN', message: 'Bu işlem için yetkiniz bulunmuyor.' },
    };
  }

  // For super_admin: read tenant_ctx cookie for effective tenant filtering
  let effectiveTenantId = profile.tenant_id;
  if (userRole === 'super_admin') {
    try {
      const cookieStore = await cookies();
      const ctxCookie = cookieStore.get('tenant_ctx');
      if (ctxCookie?.value && ctxCookie.value !== 'all') {
        effectiveTenantId = ctxCookie.value;
      }
      // If cookie is 'all' or absent, effectiveTenantId stays null (no filter)
    } catch {
      // cookies() not available in edge runtime — keep null
    }
  }

  return {
    ok: true,
    userId: user.id,
    role: userRole,
    tenantId: effectiveTenantId,
    error: null,
  };
}
