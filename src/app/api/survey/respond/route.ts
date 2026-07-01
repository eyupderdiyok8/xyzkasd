// ──────────────────────────────────────────────
// POST /api/survey/respond
// Müşteri anket puanını gönderir (public — auth yok)
// Body: { ticketId: string, score: 1-5, comment?: string }
//
// Puan >= 4 ise → kupon oluştur + Google Review linki
// Puan <= 2 ise → yüksek öncelikli bildirim
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { SurveyRepository } from '@/repositories/survey.repository';
import { ServiceTicketRepository } from '@/repositories/service-ticket.repository';
import { AutomationEngine } from '@/lib/automation';
import { getWahaManager } from '@/lib/whatsapp/waha-manager';
import { buildHighScoreThanksText, buildLowScoreNotificationText } from '@/lib/whatsapp/notify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.ticketId || body.score == null) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'ticketId ve score zorunludur' } },
        { status: 400 },
      );
    }

    const ticketId = String(body.ticketId);
    const score = Number(body.score);

    if (score < 1 || score > 5 || !Number.isInteger(score)) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Puan 1-5 arasında bir tam sayı olmalıdır' } },
        { status: 400 },
      );
    }

    // ── Resolve tenant from ticket ───────────────
    const ticketRepo = new ServiceTicketRepository({ tenantId: null, role: 'super_admin' });
    const ticket = await ticketRepo.findById(ticketId).catch(() => null);
    if (!ticket) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Servis kaydı bulunamadı' } },
        { status: 404 },
      );
    }

    const tenantId = ticket.tenantId;
    const surveyRepo = new SurveyRepository({ tenantId, role: 'super_admin' });

    // ── Record response ──────────────────────────
    const { survey, action } = await surveyRepo.respond(ticketId, {
      score,
      comment: body.comment ?? null,
    });

    const waManager = getWahaManager();
    const results: Record<string, any> = {};

    // ── High score (>=4): send coupon + Google Review ──
    if (action === 'HIGH_SCORE' && survey.couponCode) {
      // Tenant'ın kendi Google Review linki, yoksa env fallback
      const tenant = await surveyRepo.getTenant(tenantId);
      const googleReviewUrl = (tenant as any)?.googleReviewUrl
        || process.env.GOOGLE_REVIEW_URL
        || undefined;
      const thankYouText = buildHighScoreThanksText({
        customerName: ticket.customer.name,
        couponCode: survey.couponCode,
        discountPct: 10,
        googleReviewUrl: googleReviewUrl ?? 'https://g.page/r/review',
      });

      const msgResult = await waManager.sendMessage(tenantId, ticket.customer.phone, thankYouText);
      results.couponSent = msgResult.success;
      results.googleReviewSent = msgResult.success;
    }

    // ── Low score (<=2): notify manager ──────────
    if (action === 'LOW_SCORE') {
      // Build notification text
      const notifyText = buildLowScoreNotificationText({
        customerName: ticket.customer.name,
        ticketNo: ticket.ticketNo,
        score,
        comment: body.comment ?? undefined,
      });

      // Send to tenant admin/manager WhatsApp number
      const tenant = await surveyRepo.getTenant(tenantId);
      const notifyPhone = tenant?.phone;
      if (notifyPhone) {
        const msgResult = await waManager.sendMessage(tenantId, notifyPhone, notifyText);
        results.notificationSent = msgResult.success;
      }
    }

    // ── Fire automation engine: survey.response trigger ──
    try {
      const engine = new AutomationEngine({ tenantId, role: 'manager' });
      engine.fireTrigger({
        trigger: 'survey.response',
        timestamp: new Date(),
        tenantId,
        entityType: 'service_survey',
        entityId: survey.id,
        data: {
          ticketId,
          ticketNo: ticket.ticketNo,
          score,
          comment: body.comment ?? null,
          action,
          couponCode: survey.couponCode ?? null,
          customerId: ticket.customerId,
          customerName: ticket.customer.name,
          customerPhone: ticket.customer.phone,
          deviceId: ticket.deviceId,
          deviceModel: ticket.device?.model,
          technicianId: ticket.technicianId,
          technicianName: ticket.technician?.name,
        },
      }).catch(() => {
        // Best-effort — automation failure should not block the response
      });
    } catch {
      // Best-effort
    }

    return NextResponse.json({
      data: {
        ticketId,
        score,
        action,
        couponCode: survey.couponCode ?? null,
        results,
      },
    });
  } catch (err: any) {
    if (err.message === 'ANKET_BULUNAMADI') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Bu servis için anket bulunamadı' } },
        { status: 404 },
      );
    }
    if (err.message === 'ANKET_ZATEN_YANITLANDI') {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Bu anket daha önce yanıtlanmış' } },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message ?? 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}
