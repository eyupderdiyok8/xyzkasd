// ──────────────────────────────────────────────
// Water Purifier Service ERP — Feature + Role Guard
// Multi-Tenant SaaS
//
// Extends require-role with plan-based feature gating.
// Use on API routes that belong to Professional-only features.
// ──────────────────────────────────────────────

import { requireRole, type RoleCheckResult } from './require-role';
import { hasFeature, type FeatureFlag, type PlanType } from '@/lib/features';
import { createServerSupabaseClient } from './server';

export interface FeatureCheckResult extends RoleCheckResult {
  plan: PlanType | null;
}

/**
 * Authenticate, verify minimum role, AND verify tenant plan
 * includes the given feature.
 *
 * Usage:
 * ```ts
 * const auth = await requireFeature('manager', 'whatsapp');
 * if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
 * ```
 */
export async function requireFeature(
  minimumRole: Parameters<typeof requireRole>[0],
  feature: FeatureFlag,
): Promise<FeatureCheckResult> {
  const base = await requireRole(minimumRole);

  if (!base.ok) {
    return { ...base, plan: null };
  }

  // Fetch tenant plan
  if (!base.tenantId) {
    return {
      ok: false,
      userId: base.userId,
      role: base.role,
      tenantId: null,
      plan: null,
      error: { status: 403, code: 'FORBIDDEN', message: 'Tenant bilgisi bulunamadı.' },
    };
  }

  const supabase = await createServerSupabaseClient();
  const { data: tenantRow } = await supabase
    .from('tenants')
    .select('plan')
    .eq('id', base.tenantId)
    .single();

  const plan: PlanType = ((tenantRow as { plan: PlanType } | null)?.plan as PlanType) ?? 'STARTER';

  if (!hasFeature(plan, feature)) {
    return {
      ok: false,
      userId: base.userId,
      role: base.role,
      tenantId: base.tenantId,
      plan,
      error: {
        status: 403,
        code: 'FORBIDDEN',
        message: `Bu özellik mevcut planınızda (${plan}) bulunmuyor. Professional plana yükseltmek için yöneticinizle iletişime geçin.`,
      },
    };
  }

  return { ...base, plan };
}
