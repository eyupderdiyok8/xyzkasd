// ──────────────────────────────────────────────
// Water Purifier Service ERP — Survey Repository
// Multi-Tenant SaaS
// ──────────────────────────────────────────────
// Servis sonrası memnuniyet anketi yönetimi.
// ──────────────────────────────────────────────

import { BaseRepository } from './base.repository';

function generateCouponCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'SVY-';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class SurveyRepository extends BaseRepository {
  // ─── Send Survey (create survey record) ─────

  async sendSurvey(ticketId: string): Promise<{ id: string }> {
    // Get ticket to verify access and get tenantId
    const ticket = await this.prisma.serviceTicket.findFirst({
      where: { id: ticketId, deletedAt: null, ...this.tenantFilter() },
      select: { id: true, tenantId: true, status: true },
    });
    if (!ticket) throw new Error('NOT_FOUND');
    if (ticket.status !== 'COMPLETED') throw new Error('Servis henüz tamamlanmamış');

    const survey = await this.prisma.serviceSurvey.upsert({
      where: { ticketId },
      create: {
        ticketId,
        tenantId: ticket.tenantId,
      },
      update: {}, // already exists — no-op
      select: { id: true, tenantId: true },
    });

    await this.auditCreate({
      entity: 'service_survey',
      entityId: survey.id,
      newValues: { ticketId, tenantId: survey.tenantId },
    });

    return survey;
  }

  // ─── Respond (customer submits score) ─────

  async respond(
    ticketId: string,
    data: { score: number; comment?: string },
  ): Promise<{
    survey: { id: string; score: number; couponCode?: string };
    action: 'HIGH_SCORE' | 'LOW_SCORE' | 'NEUTRAL';
  }> {
    const { score, comment } = data;

    if (score < 1 || score > 5) {
      throw new Error('Puan 1-5 arasında olmalıdır');
    }

    const survey = await this.prisma.serviceSurvey.findUnique({
      where: { ticketId },
    });
    if (!survey) throw new Error('ANKET_BULUNAMADI');
    if (survey.respondedAt) throw new Error('ANKET_ZATEN_YANITLANDI');

    let couponCode: string | undefined;

    // Update survey with response
    await this.prisma.serviceSurvey.update({
      where: { ticketId },
      data: {
        score,
        comment: comment ?? null,
        respondedAt: new Date(),
      },
    });

    let action: 'HIGH_SCORE' | 'LOW_SCORE' | 'NEUTRAL' = 'NEUTRAL';

    await this.auditUpdate({
      entity: 'service_survey',
      entityId: survey.id,
      oldValues: { score: null, respondedAt: null },
      newValues: { score, comment: comment ?? null, action },
    });

    if (score >= 4) {
      action = 'HIGH_SCORE';
      // Generate coupon
      couponCode = generateCouponCode();

      // Ensure uniqueness
      let attempts = 0;
      while (await this.prisma.coupon.findFirst({ where: { code: couponCode, tenantId: survey.tenantId } })) {
        couponCode = generateCouponCode();
        attempts++;
        if (attempts > 10) throw new Error('Kupon kodu oluşturulamadı');
      }

      await this.prisma.coupon.create({
        data: {
          tenantId: survey.tenantId,
          ticketId,
          code: couponCode,
          discountPct: 10,
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 gün
        },
      });

      await this.prisma.serviceSurvey.update({
        where: { ticketId },
        data: { couponCode, couponSent: true, googleReviewSent: true },
      });
    } else if (score <= 2) {
      action = 'LOW_SCORE';
      // Mark notification as sent
      await this.prisma.serviceSurvey.update({
        where: { ticketId },
        data: { notificationSent: true },
      });
    }

    const updated = await this.prisma.serviceSurvey.findUnique({
      where: { ticketId },
      select: { id: true, score: true, couponCode: true },
    });

    return { survey: { id: updated!.id, score: updated!.score!, couponCode: updated?.couponCode ?? undefined }, action };
  }

  // ─── Get Survey by Ticket ─────────────────

  async findByTicket(ticketId: string) {
    return this.prisma.serviceSurvey.findFirst({
      where: { ticketId, deletedAt: null, ...this.tenantFilter() },
    });
  }

  // ─── Get Survey by ID ─────────────────────

  async findById(id: string, showDeleted?: boolean) {
    const where: any = { id, ...this.tenantFilter() };
    if (!showDeleted) where.deletedAt = null;
    return this.prisma.serviceSurvey.findFirst({
      where,
      include: {
        ticket: {
          select: {
            ticketNo: true,
            completedAt: true,
            customer: { select: { id: true, name: true, phone: true } },
            device: { select: { id: true, brand: true, model: true, serialNo: true } },
            technician: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  // ─── List Surveys (report) ────────────────

  async findAll(opts?: {
    dateFrom?: Date;
    dateTo?: Date;
    score?: number;
    responded?: boolean;
    showDeleted?: boolean;
  }) {
    const where: any = { ...this.tenantFilter() };
    if (!opts?.showDeleted) where.deletedAt = null;

    if (opts?.dateFrom || opts?.dateTo) {
      where.sentAt = {};
      if (opts.dateFrom) where.sentAt.gte = opts.dateFrom;
      if (opts.dateTo) where.sentAt.lte = opts.dateTo;
    }
    if (opts?.score != null) where.score = opts.score;
    if (opts?.responded === true) where.score = { not: null };
    if (opts?.responded === false) where.score = null;

    return this.prisma.serviceSurvey.findMany({
      where,
      include: {
        ticket: {
          select: {
            ticketNo: true,
            completedAt: true,
            customer: { select: { id: true, name: true, phone: true } },
            device: { select: { id: true, brand: true, model: true, serialNo: true } },
          },
        },
      },
      orderBy: { sentAt: 'desc' },
    });
  }

  // ─── Report Stats ─────────────────────────

  async getStats(opts?: { dateFrom?: Date; dateTo?: Date }) {
    const where: any = { ...this.tenantFilter(), deletedAt: null };

    if (opts?.dateFrom || opts?.dateTo) {
      where.sentAt = {};
      if (opts.dateFrom) where.sentAt.gte = opts.dateFrom;
      if (opts.dateTo) where.sentAt.lte = opts.dateTo;
    }

    const surveys = await this.prisma.serviceSurvey.findMany({ where, select: { score: true } });

    const total = surveys.length;
    const responded = surveys.filter((s) => s.score != null).length;
    const scores = surveys.filter((s) => s.score != null).map((s) => s.score!);
    const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const highScores = scores.filter((s) => s >= 4).length;
    const lowScores = scores.filter((s) => s <= 2).length;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const s of scores) distribution[s] = (distribution[s] ?? 0) + 1;

    return {
      total,
      responded,
      responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
      avgScore: Math.round(avgScore * 10) / 10,
      highScores,
      lowScores,
      distribution,
    };
  }

  // ─── Get Tenant for messaging ─────────────

  async getTenant(tenantId: string) {
    return this.prisma.tenant.findUnique({ where: { id: tenantId } });
  }
}
