// ──────────────────────────────────────────────
// Water Purifier Service ERP — Automation Rule Toggle API
// Multi-Tenant SaaS
//
// PATCH /api/automation/rules/:id/toggle
// Body: { isActive: boolean }
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { AutomationRuleRepository } from '@/repositories/automation-rule.repository';
import { requireFeature } from '@/lib/supabase/require-feature';

/**
 * PATCH /api/automation/rules/:id/toggle
 * Enable or disable a rule (aç/kapa).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireFeature('manager', 'automation');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new AutomationRuleRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const body = await request.json();

    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'isActive (boolean) zorunludur' } },
        { status: 400 },
      );
    }

    const rule = await repo.toggleActive(id, body.isActive);
    return NextResponse.json({ data: rule });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Kural bulunamadı' } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}
