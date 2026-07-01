// ──────────────────────────────────────────────
// Water Purifier Service ERP — Automation Logs API
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { AutomationLogRepository } from '@/repositories/automation-log.repository';
import { requireFeature } from '@/lib/supabase/require-feature';

/**
 * GET /api/automation/logs
 * Query params:
 *   ?ruleId=xxx      — filter by rule
 *   ?trigger=xxx     — filter by trigger type
 *   ?status=xxx      — filter by status (SUCCESS|PARTIAL|FAILED)
 *   ?fromDate=xxx    — start date (ISO)
 *   ?toDate=xxx      — end date (ISO)
 *   ?limit=50        — page size
 *   ?offset=0        — page offset
 *   ?stats=true      — return stats summary instead of list
 */
export async function GET(request: NextRequest) {
  const auth = await requireFeature('viewer', 'automation');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new AutomationLogRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const { searchParams } = new URL(request.url);

    // Stats mode
    if (searchParams.get('stats') === 'true') {
      const days = parseInt(searchParams.get('days') ?? '30', 10);
      const stats = await repo.getStats(days);
      return NextResponse.json({ data: stats });
    }

    const filter = {
      ruleId: searchParams.get('ruleId') ?? undefined,
      trigger: searchParams.get('trigger') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      fromDate: searchParams.get('fromDate') ?? undefined,
      toDate: searchParams.get('toDate') ?? undefined,
      limit: parseInt(searchParams.get('limit') ?? '50', 10),
      offset: parseInt(searchParams.get('offset') ?? '0', 10),
    };

    const logs = await repo.findAll(filter);
    return NextResponse.json({ data: logs });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}
