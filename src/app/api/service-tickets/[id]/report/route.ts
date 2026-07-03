import { NextResponse } from 'next/server';
import { ServiceTicketRepository } from '@/repositories/service-ticket.repository';
import { generateServiceReport, saveReportToStorage } from '@/lib/storage/service-report';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * POST /api/service-tickets/:id/report
 * Generates a PDF service report for the completed ticket and saves to Supabase Storage.
 */
export async function POST(_: unknown, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole('technician');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  if (!auth.tenantId) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Lütfen üst menüden bir firma seçin.' } }, { status: 403 });

  const repo = new ServiceTicketRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const ticket = await repo.findById(id);
    if (ticket.status !== 'COMPLETED') {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Rapor sadece tamamlanmış servis kayıtları için oluşturulabilir' } }, { status: 400 });
    }

    const tenant = await repo.getTenant(auth.tenantId);
    const filterChanges = ticket.filterChanges.map((fc: any) => ({ filterName: fc.filter.name, stage: fc.filter.stage, quantity: fc.quantity }));

    const pdfBuffer = await generateServiceReport({
      ticketNo: ticket.ticketNo,
      tenantName: tenant?.name ?? '',
      tenantLogo: (tenant as any)?.logo ?? undefined,
      tenantPhone: tenant?.phone ?? undefined,
      tenantEmail: tenant?.email ?? undefined,
      tenantAddress: tenant?.address ?? undefined,
      customerName: ticket.customer.name,
      customerPhone: ticket.customer.phone ?? undefined,
      customerAddress: [ticket.customer.district, ticket.customer.city, ticket.customer.address].filter(Boolean).join(', ') || undefined,
      deviceBrand: ticket.device.brand,
      deviceModel: ticket.device.model,
      deviceSerial: ticket.device.serialNo,
      technicianName: ticket.technician?.name ?? undefined,
      issueDesc: ticket.issueDesc,
      workDone: ticket.workDone ?? undefined,
      customerNote: ticket.customerNote ?? undefined,
      tdsBefore: ticket.tdsBefore,
      tdsAfter: ticket.tdsAfter,
      pressureBefore: ticket.pressureBefore,
      pressureAfter: ticket.pressureAfter,
      leakCheck: ticket.leakCheck,
      leakNotes: ticket.leakNotes ?? undefined,
      resolution: ticket.resolution ?? undefined,
      signatureDataUrl: ticket.signatureDataUrl ?? undefined,
      signatureName: ticket.signatureName ?? undefined,
      filterChanges,
      completedAt: ticket.completedAt?.toLocaleDateString('tr-TR'),
      reportConfig: (tenant as any)?.reportConfig ?? undefined,
    });

    const { publicUrl, storagePath } = await saveReportToStorage(auth.tenantId, ticket.ticketNo, pdfBuffer);
    await repo.updatePdfStoragePath(id, storagePath);

    return NextResponse.json({ data: { publicUrl, storagePath } }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
