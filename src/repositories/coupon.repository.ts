import { BaseRepository } from './base.repository';

interface CreateCouponInput {
  code: string;
  discountPct: number;
  maxUses?: number;
  expiresAt?: string | null;
  description?: string | null;
  autoCreated?: boolean;
  minRating?: number | null;
}

export class CouponRepository extends BaseRepository {
  // ─── List ───────────────────────────────────

  async findAll(showDeleted?: boolean) {
    const where: Record<string, unknown> = this.tenantFilter();
    if (!showDeleted) where.deletedAt = null;

    return this.prisma.coupon.findMany({
      where,
      include: { _count: { select: { usages: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Get by ID ─────────────────────────────

  async findById(id: string, showDeleted?: boolean) {
    const where: any = { id, ...this.tenantFilter() };
    if (!showDeleted) where.deletedAt = null;

    const coupon = await this.prisma.coupon.findFirst({
      where,
      include: {
        usages: {
          include: {
            customer: { select: { id: true, name: true } },
            ticket: { select: { id: true, ticketNo: true } },
          },
          orderBy: { usedAt: 'desc' },
        },
      },
    });
    if (!coupon) throw new Error('NOT_FOUND');
    return coupon;
  }

  // ─── Find by code ──────────────────────────

  async findByCode(code: string) {
    return this.prisma.coupon.findFirst({
      where: { code: code.trim().toUpperCase(), deletedAt: null, ...this.tenantFilter() },
    });
  }

  // ─── Create ─────────────────────────────────

  async create(input: CreateCouponInput) {
    const tenantId = this.tenantId;
    if (!tenantId) throw new Error('Tenant gerekli');

    const code = input.code.trim().toUpperCase();

    // Check for duplicate code within the tenant
    const existing = await this.findByCode(code);
    if (existing) {
      throw new Error('DUPLICATE_CODE');
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        tenantId,
        code,
        discountPct: input.discountPct,
        maxUses: input.maxUses ?? 1,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        description: input.description ?? null,
        autoCreated: input.autoCreated ?? false,
        minRating: input.minRating ?? null,
      },
    });

    await this.auditCreate({
      entity: 'coupon',
      entityId: coupon.id,
      newValues: { code: coupon.code, discountPct: coupon.discountPct, maxUses: coupon.maxUses, autoCreated: coupon.autoCreated },
    });

    return coupon;
  }

  // ─── Update ─────────────────────────────────

  async update(
    id: string,
    input: Partial<{
      code: string;
      discountPct: number;
      maxUses: number;
      expiresAt: string | null;
      isActive: boolean;
      description: string | null;
    }>,
  ) {
    const original = await this.findById(id); // ensure access
    const oldValues = { code: original.code, discountPct: original.discountPct, isActive: original.isActive, maxUses: original.maxUses };

    const data: any = { ...input };
    if (input.code) data.code = input.code.trim().toUpperCase();
    if (input.expiresAt !== undefined) {
      data.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    }

    const updated = await this.prisma.coupon.update({ where: { id }, data });

    await this.auditUpdate({
      entity: 'coupon',
      entityId: id,
      oldValues,
      newValues: { code: updated.code, discountPct: updated.discountPct, isActive: updated.isActive },
    });

    return updated;
  }

  // ─── Delete ─────────────────────────────────

  async delete(id: string) {
    const original = await this.findById(id);
    await this.prisma.coupon.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditDelete({
      entity: 'coupon',
      entityId: id,
      deletedValues: { code: original.code, discountPct: original.discountPct },
    });
  }

  // ─── Validate & Use ─────────────────────────

  /**
   * Validate a coupon code without consuming it.
   * Returns the coupon if valid, or throws with a descriptive error.
   */
  async validate(code: string) {
    const coupon = await this.findByCode(code);
    if (!coupon) throw new Error('NOT_FOUND');
    if (!coupon.isActive) throw new Error('INACTIVE');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) throw new Error('EXPIRED');
    if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) throw new Error('MAX_USES_REACHED');
    return coupon;
  }

  /**
   * Validate and consume one usage of a coupon.
   * Records usage against an optional customer and/or ticket.
   */
  async use(code: string, opts?: { customerId?: string; ticketId?: string }) {
    const coupon = await this.validate(code);
    const tenantId = this.tenantId;
    if (!tenantId) throw new Error('Tenant gerekli');

    await this.prisma.$transaction(async (tx) => {
      // Increment usage count
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { currentUses: { increment: 1 } },
      });

      // Record usage
      await tx.couponUsage.create({
        data: {
          couponId: coupon.id,
          tenantId,
          customerId: opts?.customerId ?? null,
          ticketId: opts?.ticketId ?? null,
        },
      });
    });

    // Return refreshed coupon
    return this.findById(coupon.id);
  }

  // ─── Auto-create from survey ─────────────────

  /**
   * Create a discount coupon automatically when a survey rating >= minRating.
   * The coupon code includes the ticket number for traceability.
   */
  async autoCreateFromSurvey(ticketNo: string, rating: number, tenantIdOverride?: string) {
    const tenantId = tenantIdOverride ?? this.tenantId;
    if (!tenantId) throw new Error('Tenant gerekli');

    const minRating = 4; // default threshold
    if (rating < minRating) return null;

    const code = `INDIRIM-${ticketNo}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    return this.prisma.coupon.create({
      data: {
        tenantId,
        code,
        discountPct: 10,
        maxUses: 1,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        autoCreated: true,
        minRating,
        description: `Otomatik oluşturuldu — ${ticketNo}, puan: ${rating}`,
      },
    });
  }
}
