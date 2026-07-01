import { NextRequest, NextResponse } from 'next/server';
import { ReportRepository } from '@/repositories/report.repository';
import { PaymentRepository } from '@/repositories/payment.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * GET /api/reports?type=dashboard|technician|filters|forecast|satisfaction|revenue
 *
 * Returns aggregated report data scoped to the authenticated user's tenant.
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole('viewer');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const type = req.nextUrl.searchParams.get('type') || 'dashboard';

  try {
    switch (type) {
      case 'dashboard': {
        const repo = new ReportRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
        const stats = await repo.getDashboardStats();
        return NextResponse.json({ data: stats });
      }

      case 'technician': {
        const repo = new ReportRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
        const perf = await repo.getTechnicianPerformance();
        return NextResponse.json({ data: perf });
      }

      case 'filters': {
        const repo = new ReportRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
        const limit = Math.min(Number(req.nextUrl.searchParams.get('limit')) || 10, 50);
        const top = await repo.getMostChangedFilters(limit);
        return NextResponse.json({ data: top });
      }

      case 'forecast': {
        const repo = new ReportRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
        const forecast = await repo.getMonthlyMaintenanceForecast();
        return NextResponse.json({ data: forecast });
      }

      case 'satisfaction': {
        const repo = new ReportRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
        const dateFrom = req.nextUrl.searchParams.get('dateFrom')
          ? new Date(req.nextUrl.searchParams.get('dateFrom')!)
          : undefined;
        const dateTo = req.nextUrl.searchParams.get('dateTo')
          ? new Date(req.nextUrl.searchParams.get('dateTo')!)
          : undefined;
        const summary = await repo.getSatisfactionSummary({ dateFrom, dateTo });
        return NextResponse.json({ data: summary });
      }

      case 'revenue': {
        const repo = new PaymentRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
        const stats = await repo.getRevenueStats();
        return NextResponse.json({ data: stats });
      }

      default:
        return NextResponse.json(
          { error: { code: 'VALIDATION_ERROR', message: 'Geçersiz rapor türü' } },
          { status: 400 },
        );
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: e.message } },
      { status: 500 },
    );
  }
}
