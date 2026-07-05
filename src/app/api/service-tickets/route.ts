import { NextRequest, NextResponse } from 'next/server';
import { ServiceTicketRepository } from '@/repositories/service-ticket.repository';
import { requireRole } from '@/lib/supabase/require-role';
import { parsePagination } from '@/lib/api-pagination';

/**
 * GET /api/service-tickets
 * Query params: status, technicianId (for admin override), search
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const searchParams = req.nextUrl.searchParams;
  const status = searchParams.get('status') || undefined;
  const technicianId = searchParams.get('technicianId') || undefined;
  const search = searchParams.get('search') || undefined;
  const showDeleted = searchParams.get('showDeleted') === 'true' && (auth.role === 'manager' || auth.role === 'tenant_admin' || auth.role === 'super_admin');

  // If technician role, only show their own tickets by default
  const effectiveTechId = auth.role === 'technician' && !technicianId
    ? auth.userId!
    : technicianId;

  try {
    const repo = new ServiceTicketRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
    const opts = {
      status,
      technicianId: effectiveTechId,
      search,
      showDeleted,
    };
    const tickets = typeof (repo as any).findAllPaged === 'function'
      ? await repo.findAllPaged(opts, parsePagination(searchParams))
      : { data: await repo.findAll(opts) };
    return NextResponse.json(tickets);
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}

/**
 * POST /api/service-tickets
 * Body: { customerId, deviceId, technicianId?, issueDesc, scheduledAt? }
 */
export async function POST(req: Request) {
  const auth = await requireRole('manager');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  if (!auth.tenantId) {
    return NextResponse.json({
      error: { code: 'FORBIDDEN', message: 'Lütfen üst menüden bir firma seçin.' },
    }, { status: 403 });
  }

  let b;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  if (!b.customerId || !b.deviceId || !b.issueDesc) {
    return NextResponse.json({
      error: { code: 'VALIDATION_ERROR', message: 'customerId, deviceId ve issueDesc zorunludur' },
    }, { status: 400 });
  }

  try {
    const ticket = await new ServiceTicketRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId }).create({
      tenantId: auth.tenantId,
      customerId: String(b.customerId),
      deviceId: String(b.deviceId),
      technicianId: b.technicianId ? String(b.technicianId) : undefined,
      issueDesc: String(b.issueDesc),
      scheduledAt: b.scheduledAt ? String(b.scheduledAt) : undefined,
    });
    return NextResponse.json({ data: ticket }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
