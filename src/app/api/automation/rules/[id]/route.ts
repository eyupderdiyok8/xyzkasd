// ──────────────────────────────────────────────
// Water Purifier Service ERP — Automation Rule Detail API
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { AutomationRuleRepository } from '@/repositories/automation-rule.repository';
import { requireFeature } from '@/lib/supabase/require-feature';

/**
 * GET /api/automation/rules/:id
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireFeature('viewer', 'automation');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new AutomationRuleRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const rule = await repo.findById(id);
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

/**
 * PUT /api/automation/rules/:id
 * Body: partial rule fields
 */
export async function PUT(
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

    if (body.actions !== undefined && (!Array.isArray(body.actions) || body.actions.length === 0)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'En az bir aksiyon gereklidir' } },
        { status: 400 },
      );
    }

    const rule = await repo.update(id, body);
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

/**
 * DELETE /api/automation/rules/:id
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireFeature('manager', 'automation');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new AutomationRuleRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    await repo.delete(id);
    return NextResponse.json({ data: { id: id, deleted: true } });
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
