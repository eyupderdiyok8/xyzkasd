// ──────────────────────────────────────────────
// Water Purifier Service ERP — Automation Trigger API
// Multi-Tenant SaaS
//
// POST /api/automation/trigger
// External trigger endpoint — fires an event through the automation engine.
// Called by webhooks, service completion handlers, etc.
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { AutomationEngine } from '@/lib/automation';
import { requireFeature } from '@/lib/supabase/require-feature';

/**
 * POST /api/automation/trigger
 * Body: {
 *   trigger: AutomationTrigger,
 *   entityType: string,
 *   entityId: string,
 *   data: Record<string, unknown>
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireFeature('viewer', 'automation');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  try {
    const body = await request.json();

    // ── Validation ────────────────────────────
    if (!body.trigger || typeof body.trigger !== 'string') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Tetikleyici (trigger) zorunludur' } },
        { status: 400 },
      );
    }

    if (!body.entityType || typeof body.entityType !== 'string') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'entityType zorunludur' } },
        { status: 400 },
      );
    }

    if (!body.entityId || typeof body.entityId !== 'string') {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'entityId zorunludur' } },
        { status: 400 },
      );
    }

    const validTriggers = [
      'service.completed',
      'service.assigned',
      'maintenance.due',
      'device.registered',
      'customer.created',
      'filter.change.due',
      'survey.response',
      'ticket.status.changed',
    ];

    if (!validTriggers.includes(body.trigger)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Geçersiz tetikleyici: "${body.trigger}". Geçerli: ${validTriggers.join(', ')}`,
          },
        },
        { status: 400 },
      );
    }

    // ── Execute ───────────────────────────────
    const engine = new AutomationEngine({ tenantId: auth.tenantId, role: auth.role! });

    const result = await engine.fireTrigger({
      trigger: body.trigger,
      timestamp: new Date(),
      tenantId: auth.tenantId ?? '',
      entityType: body.entityType,
      entityId: body.entityId,
      data: body.data ?? {},
    });

    return NextResponse.json({ data: result });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}
