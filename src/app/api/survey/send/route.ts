// ──────────────────────────────────────────────
// POST /api/survey/send
// Servis tamamlanınca müşteriye WhatsApp anket linki gönderir
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { SurveyRepository } from '@/repositories/survey.repository';
import { ServiceTicketRepository } from '@/repositories/service-ticket.repository';
import { getWahaManager } from '@/lib/whatsapp/waha-manager';
import { buildSurveyInvitationText } from '@/lib/whatsapp/notify';

export async function POST(request: NextRequest) {
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Yetkisiz erişim' } }, { status: 401 });
  }

  try {
    const body = await request.json();
    if (!body.ticketId) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ticketId zorunludur' } }, { status: 400 });
    }

    const ticketId = String(body.ticketId);
    const surveyRepo = new SurveyRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
    const ticketRepo = new ServiceTicketRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

    // Get ticket details
    const ticket = await ticketRepo.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Servis kaydı bulunamadı' } }, { status: 404 });
    }

    // Get customer phone
    const customerPhone = ticket.customer.phone;
    if (!customerPhone) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Müşterinin telefon numarası bulunamadı' } }, { status: 400 });
    }

    // Create/ensure survey record
    await surveyRepo.sendSurvey(ticketId);

    // Get tenant name
    const tenant = await surveyRepo.getTenant(auth.tenantId!);
    const companyName = tenant?.name ?? 'Firmamız';

    // Build survey URL using APP_URL or fallback
    const baseUrl = process.env.APP_URL ?? `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const surveyUrl = `${baseUrl}/survey/${ticketId}`;

    // Send WhatsApp message
    const waManager = getWahaManager();
    const messageText = buildSurveyInvitationText({
      customerName: ticket.customer.name,
      companyName,
      surveyUrl,
    });

    const result = await waManager.sendMessage(auth.tenantId!, customerPhone, messageText);

    if (!result.success) {
      return NextResponse.json({
        error: { code: 'WHATSAPP_ERROR', message: result.error ?? 'WhatsApp mesajı gönderilemedi' },
      }, { status: 400 });
    }

    return NextResponse.json({
      data: {
        messageId: result.messageId,
        surveyUrl,
        ticketId,
      },
    });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Servis kaydı bulunamadı' } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: err.message ?? 'Bir hata oluştu' } }, { status: 500 });
  }
}
