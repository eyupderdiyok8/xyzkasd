import { NextResponse } from 'next/server';
import { prismaClient } from '@/repositories/base.repository';
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
    const tenantFilter = auth.role === 'super_admin'
      ? {}
      : { tenantId: auth.tenantId! };

    const tickets = await prismaClient.serviceTicket.findMany({
      where: {
        ...tenantFilter,
        deletedAt: null,
        status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
        issueDesc: { startsWith: 'Gecikmiş bakım:' },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        device: { select: { id: true, serialNo: true, brand: true, model: true } },
        technician: { select: { id: true, name: true } },
        _count: { select: { photos: true, filterChanges: true } },
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    return NextResponse.json({
      data: tickets.map((t) => ({
        id: t.id,
        ticketNo: t.ticketNo,
        issueDesc: t.issueDesc,
        status: t.status,
        customerName: t.customer?.name ?? null,
        customerPhone: t.customer?.phone ?? null,
        deviceSerialNo: t.device.serialNo,
        deviceBrand: t.device.brand,
        deviceModel: t.device.model,
        technicianName: t.technician?.name ?? null,
        createdAt: t.createdAt.toISOString(),
        scheduledAt: t.scheduledAt?.toISOString() ?? null,
      })),
      total: tickets.length,
    });
  } catch (e: any) {
    return NextResponse.json({
      error: { code: 'INTERNAL_ERROR', message: e.message },
    }, { status: 500 });
  }
}
