import { NextResponse } from 'next/server';
import { ServiceTicketRepository } from '@/repositories/service-ticket.repository';
import { SurveyRepository } from '@/repositories/survey.repository';
import { requireRole } from '@/lib/supabase/require-role';
import { AutomationEngine } from '@/lib/automation';
import { generateServiceReport, saveReportToStorage } from '@/lib/storage/service-report';
import { getWahaManager } from '@/lib/whatsapp/waha-manager';
import { buildSurveyInvitationText } from '@/lib/whatsapp/notify';
import { getSetting } from '@/lib/system-settings';

async function getRepo() {
  const auth = await requireRole('technician');
  if (!auth.ok) return null;
  return { repo: new ServiceTicketRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId }), role: auth.role, tenantId: auth.tenantId };
}

/** Auto-generate PDF report for a completed ticket and save to storage. */
async function autoGeneratePdf(
  repo: ServiceTicketRepository,
  tenantId: string,
  ticketId: string,
) {
  try {
    const ticket = await repo.findById(ticketId);
    if (ticket.status !== 'COMPLETED') return;

    const tenant = await repo.getTenant(tenantId);
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
      customerAddress: [ticket.customer.district, ticket.customer.city, ticket.customer.address]
        .filter(Boolean)
        .join(', ') || undefined,
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

    const pdfBuffer = await generateServiceReport(reportData);
    const { publicUrl, storagePath } = await saveReportToStorage(tenantId, ticket.ticketNo, pdfBuffer);
    await repo.updatePdfStoragePath(ticketId, storagePath);
    return { publicUrl, storagePath };
  } catch {
    // PDF auto-generation failure should not block the response
    console.error('PDF auto-generation failed for ticket:', ticketId);
  }
}

/** Auto-send WhatsApp survey invitation after service completion. */
async function autoSendSurvey(
  repo: ServiceTicketRepository,
  tenantId: string,
  ticketId: string,
) {
  try {
    const ticket = await repo.findById(ticketId);
    if (ticket.status !== 'COMPLETED') return;
    const customerPhone = ticket.customer.phone;
    if (!customerPhone) return;

    const surveyRepo = new SurveyRepository({ tenantId, role: 'super_admin' });
    await surveyRepo.sendSurvey(ticketId);

    const tenant = await surveyRepo.getTenant(tenantId);
    const baseUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const surveyUrl = `${baseUrl}/survey/${ticketId}`;

    // Tenant'ın özel anket mesajı → system setting → hardcoded default
    const customMessage = (tenant as any)?.surveyMessage;
    const systemDefault = await getSetting('default_survey_message').catch(() => null);
    const messageText = customMessage
      ? customMessage
          .replace(/\{\{customer_name\}\}/g, ticket.customer.name)
          .replace(/\{\{survey_url\}\}/g, surveyUrl)
          .replace(/\{\{company_name\}\}/g, tenant?.name ?? 'Firmamız')
      : systemDefault
        ? systemDefault
            .replace(/\{\{customer_name\}\}/g, ticket.customer.name)
            .replace(/\{\{survey_url\}\}/g, surveyUrl)
            .replace(/\{\{company_name\}\}/g, tenant?.name ?? 'Firmamız')
        : buildSurveyInvitationText({
            customerName: ticket.customer.name,
            companyName: tenant?.name ?? 'Firmamız',
            surveyUrl,
          });

    const waManager = getWahaManager();
    await waManager.sendMessage(tenantId, customerPhone, messageText);
  } catch {
    // Survey send failure should not block the response
    console.error('Survey auto-send failed for ticket:', ticketId);
  }
}

/**
 * GET /api/service-tickets/:id
 */
export async function GET(_: unknown, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getRepo();
  if (!ctx) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Giriş yapmalısınız' } }, { status: 401 });

  try {
    const ticket = await ctx.repo.findById(id);
    return NextResponse.json({ data: ticket });
  } catch {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Servis kaydı bulunamadı' } }, { status: 404 });
  }
}

/**
 * PUT /api/service-tickets/:id — Complete the service
 * Body: {
 *   tdsBefore?, tdsAfter?, pressureBefore?, pressureAfter?,
 *   leakCheck?, leakNotes?, workDone?, customerNote?,
 *   signatureDataUrl?, signatureName?, resolution?,
 *   filterChanges?: [{ filterId, quantity?, notes? }]
 * }
 */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getRepo();
  if (!ctx) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Giriş yapmalısınız' } }, { status: 401 });

  let b;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  try {
    const updated = await ctx.repo.completeService(id, {
      tdsBefore: b.tdsBefore != null ? Number(b.tdsBefore) : null,
      tdsAfter: b.tdsAfter != null ? Number(b.tdsAfter) : null,
      pressureBefore: b.pressureBefore != null ? Number(b.pressureBefore) : null,
      pressureAfter: b.pressureAfter != null ? Number(b.pressureAfter) : null,
      leakCheck: b.leakCheck != null ? Boolean(b.leakCheck) : null,
      leakNotes: b.leakNotes ?? null,
      workDone: b.workDone ?? null,
      customerNote: b.customerNote ?? null,
      expenses: b.expenses ?? null,
      serviceParts: b.serviceParts ?? null,
      signatureDataUrl: b.signatureDataUrl ?? null,
      signatureName: b.signatureName ?? null,
      resolution: b.resolution ?? null,
      filterChanges: b.filterChanges ?? [],
    });

    // Auto-generate PDF report (non-blocking, fire-and-forget)
    autoGeneratePdf(ctx.repo, ctx.tenantId ?? '', id);

    // Auto-send survey invitation (non-blocking, fire-and-forget)
    autoSendSurvey(ctx.repo, ctx.tenantId ?? '', id);

    // Fetch full ticket with relations for survey + automation context
    const fullTicket = await ctx.repo.findById(id).catch(() => null);

    // Fire automation engine: service.completed trigger (non-blocking)
    if (fullTicket) {
      try {
        const engine = new AutomationEngine({ tenantId: ctx.tenantId, role: ctx.role! });
        engine.fireTrigger({
          trigger: 'service.completed',
          timestamp: new Date(),
          tenantId: ctx.tenantId ?? '',
          entityType: 'service_ticket',
          entityId: id,
          data: {
            ticketId: id,
            ticketNo: fullTicket.ticketNo,
            customerId: fullTicket.customerId,
            customerName: fullTicket.customer?.name,
            customerPhone: fullTicket.customer?.phone,
            deviceId: fullTicket.deviceId,
            deviceModel: fullTicket.device?.model,
            deviceBrand: fullTicket.device?.brand,
            deviceSerial: fullTicket.device?.serialNo,
            technicianId: fullTicket.technicianId,
            technicianName: fullTicket.technician?.name,
            completedAt: fullTicket.completedAt?.toISOString(),
            status: fullTicket.status,
          },
        }).catch(() => {
          // Best-effort — automation failure should not block the response
        });
      } catch {
        // Best-effort
      }
    }

    return NextResponse.json({ data: updated, warnings: (updated as any).warnings ?? [] });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') {
      return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
