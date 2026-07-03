// ──────────────────────────────────────────────
// Water Purifier Service ERP — Feature + Role Guard
// Multi-Tenant SaaS
//
// Extends require-role with membership-based feature gating.
// Tüm üyelik tipleri tüm özelliklere erişebilir,
// kısıtlama sadece membershipExpiresAt kontrolüdür.
// ──────────────────────────────────────────────

import { requireRole, type RoleCheckResult } from './require-role';
import { isMembershipActive, type FeatureFlag, type MembershipType } from '@/lib/features';
import { createServerSupabaseClient } from './server';

export interface FeatureCheckResult extends RoleCheckResult {
  membershipType: MembershipType | null;
  expiresAt: string | null;
  isActive: boolean;
}

/**
 * Authenticate, verify minimum role, AND verify tenant membership
 * is active (not expired).
 *
 * Usage:
 * ```ts
 * const auth = await requireFeature('manager', 'whatsapp');
 * if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
 * ```
 */
export async function requireFeature(
  minimumRole: Parameters<typeof requireRole>[0],
  _feature: FeatureFlag,
): Promise<FeatureCheckResult> {
  const base = await requireRole(minimumRole);

  if (!base.ok) {
    return { ...base, membershipType: null, expiresAt: null, isActive: false };
  }

  // Fetch tenant membership info
  if (!base.tenantId) {
    return {
      ok: false,
      userId: base.userId,
      role: base.role,
      tenantId: null,
      membershipType: null,
      expiresAt: null,
      isActive: false,
      error: { status: 403, code: 'FORBIDDEN', message: 'Tenant bilgisi bulunamadı.' },
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('membershipType, membershipExpiresAt')
    .eq('id', base.tenantId)
    .single();

  const row = tenantRow as { membershipType?: string; membershipExpiresAt?: string | null } | null;
  const membershipType = (row?.membershipType as MembershipType) ?? 'MONTHLY';
  const expiresAt = row?.membershipExpiresAt ?? null;

  if (!isMembershipActive(membershipType, expiresAt)) {
    return {
      ok: false,
      userId: base.userId,
      role: base.role,
      tenantId: base.tenantId,
      membershipType,
      expiresAt,
      isActive: false,
      error: {
        status: 403,
        code: 'FORBIDDEN',
        message: 'Üyeliğinizin süresi dolmuş. Lütfen yöneticinizle iletişime geçin.',
      },
    };
  }

  return { ...base, membershipType, expiresAt, isActive: true };
}
