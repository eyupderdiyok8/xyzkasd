import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ServiceTicketRepository } from '@/repositories/service-ticket.repository';
import { generateServiceReport, saveReportToStorage } from '@/lib/storage/service-report';
import type { ProfileRow } from '@/lib/supabase/types';
import { requireRole } from '@/lib/supabase/require-role';

async function getRepo() {
  const su = await createServerSupabaseClient();
  const { data: { user } } = await su.auth.getUser();
  if (!user) return null;
  const { data: _p } = await su.from('profiles').select('*').eq('id', user.id).single();
  const p = _p as ProfileRow | null;
  if (!p || !p.tenant_id) return null;
  const profile = p as ProfileRow & { tenant_id: string };
  return { repo: new ServiceTicketRepository({ tenantId: profile.tenant_id, role: profile.role, userId: user.id }), profile };
}

/**
 * POST /api/service-tickets/:id/report
 * Generates a PDF service report for the completed ticket and saves to Supabase Storage.
 * Updates the ticket with the pdfStoragePath.
 */
export async function POST(_: unknown, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getRepo();
  if (!ctx) return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });

  // Require minimum technician role for generating reports
  const roleCheck = await requireRole('technician');
  if (!roleCheck.ok) {
    return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.error!.status });
  }

  try {
    const ticket = await ctx.repo.findById(id);

    if (ticket.status !== 'COMPLETED') {
      return NextResponse.json({
        error: { code: 'VALIDATION_ERROR', message: 'Rapor sadece tamamlanmış servis kayıtları için oluşturulabilir' },
      }, { status: 400 });
    }

    // Get tenant info
    const tenant = await ctx.repo.getTenant(ctx.profile.tenant_id);

    // Convert filter changes to report format
    const filterChanges = ticket.filterChanges.map((fc) => ({
      filterName: fc.filter.name,
      stage: fc.filter.stage,
      quantity: fc.quantity,
    }));

    const reportData = {
      ticketNo: ticket.ticketNo,
      tenantName: tenant?.name ?? '',
      tenantLogo: (tenant as any)?.logo ?? undefined,
      tenantPhone: tenant?.phone ?? undefined,
      tenantEmail: tenant?.email ?? undefined,
      tenantAddress: tenant?.address ?? undefined,
      customerName: ticket.customer.name,
      customerPhone: ticket.customer.phone ?? undefined,
      customerAddress: [
        ticket.customer.district,
        ticket.customer.city,
        ticket.customer.address,
      ].filter(Boolean).join(', ') || undefined,
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
    };

    // Generate PDF
    const pdfBuffer = await generateServiceReport(reportData);

    // Save to Supabase Storage
    const { publicUrl, storagePath } = await saveReportToStorage(
      ctx.profile.tenant_id!,
      ticket.ticketNo,
      pdfBuffer,
    );

    // Update ticket with PDF storage path
    await ctx.repo.updatePdfStoragePath(id, storagePath);

    return NextResponse.json({
      data: { publicUrl, storagePath },
    }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
