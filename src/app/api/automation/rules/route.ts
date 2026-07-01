// ──────────────────────────────────────────────
// Water Purifier Service ERP — Automation Rules API
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { AutomationRuleRepository } from '@/repositories/automation-rule.repository';
import { requireFeature } from '@/lib/supabase/require-feature';

/**
 * GET /api/automation/rules
 * Query params:
 *   ?showAll=true  — include inactive rules
 */
export async function GET(request: NextRequest) {
  const auth = await requireFeature('viewer', 'automation');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new AutomationRuleRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('showAll') === 'true';
    const showDeleted = searchParams.get('showDeleted') === 'true' && (auth.role === 'manager' || auth.role === 'tenant_admin' || auth.role === 'super_admin');
    const rules = await repo.findAll(includeInactive, showDeleted);
    return NextResponse.json({ data: rules });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}

/**
 * POST /api/automation/rules
 * Body: {
 *   name: string,
 *   description?: string,
 *   trigger: AutomationTrigger,
 *   conditions?: Condition[],
 *   actions: RuleAction[],
 *   isActive?: boolean,
 *   priority?: number,
 *   cooldownMin?: number
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireFeature('manager', 'automation');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new AutomationRuleRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const body = await request.json();

    // ── Validation ────────────────────────────
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Kural adı zorunludur' } },
        { status: 400 },
      );
    }

    if (!body.trigger || typeof body.trigger !== 'string') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Tetikleyici (trigger) zorunludur' } },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.actions) || body.actions.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'En az bir aksiyon gereklidir' } },
        { status: 400 },
      );
    }

    // Validate action types
    const validActions = ['wait', 'sendMessage', 'sendSurvey', 'createTicket', 'notifyTechnician', 'updateEntity', 'webhook'];
    for (const action of body.actions) {
      if (!action.type || !validActions.includes(action.type)) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: `Geçersiz aksiyon tipi: "${action.type}". Geçerli: ${validActions.join(', ')}`,
            },
          },
          { status: 400 },
        );
      }
    }

    const rule = await repo.create({
      name: body.name.trim(),
      description: body.description?.trim(),
      trigger: body.trigger,
      conditions: body.conditions ?? [],
      actions: body.actions,
      isActive: body.isActive ?? true,
      priority: body.priority ?? 0,
      cooldownMin: body.cooldownMin ?? 0,
    });

    return NextResponse.json({ data: rule }, { status: 201 });
  } catch (err: any) {
    if (err.message === 'VALIDATION_ERROR') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: err.message } },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}
