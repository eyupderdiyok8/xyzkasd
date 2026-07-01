import { NextResponse } from 'next/server';
import { PaymentRepository } from '@/repositories/payment.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * GET /api/reports/revenue
 * Returns revenue statistics for dashboard.
 */
export async function GET() {
  const auth = await requireRole('manager');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new PaymentRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const stats = await repo.getRevenueStats();
    return NextResponse.json({ data: stats });
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
