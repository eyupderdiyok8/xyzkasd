import { NextRequest, NextResponse } from 'next/server';
import { ServiceTicketRepository } from '@/repositories/service-ticket.repository';
import { FilterTrackingRepository } from '@/repositories/filter-tracking.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * GET /api/filters?active=true
 * Returns filter catalog for the tenant.
 *
 * GET /api/filters?tracking=true
 * Returns all filter tracking entries due within 30 days.
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const common = { tenantId: auth.tenantId, role: auth.role!, userId: auth.userId };
  const showDeleted = req.nextUrl.searchParams.get('showDeleted') === 'true' && (auth.role === 'manager' || auth.role === 'tenant_admin' || auth.role === 'super_admin');
  const tracking = req.nextUrl.searchParams.get('tracking');

  if (tracking === 'true') {
    try {
      const all = await new FilterTrackingRepository(common).findAll();
      return NextResponse.json({ data: all });
    } catch (e: any) {
      return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
    }
  }

  try {
    const filters = await new ServiceTicketRepository(common).getFilterCatalogs({ showDeleted });
    return NextResponse.json({ data: filters });
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
