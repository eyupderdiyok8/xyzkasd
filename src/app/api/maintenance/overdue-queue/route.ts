import { NextResponse } from 'next/server';
import { ServiceTicketRepository } from '@/repositories/service-ticket.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * GET /api/maintenance/overdue-queue
 *
 * Returns the overdue maintenance queue — PENDING service tickets that
 * were auto-created from overdue maintenance detections.
 * Used by the dashboard to show technician dispatch queue.
 */
export async function GET() {
  const auth = await requireRole('viewer');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  try {
    const repo = new ServiceTicketRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
    const tickets = await repo.getOverdueQueue(10);

    return NextResponse.json({
      data: tickets,
      total: tickets.length,
    });
  } catch (e: any) {
    return NextResponse.json({
      error: { code: 'INTERNAL_ERROR', message: e.message },
    }, { status: 500 });
  }
}
