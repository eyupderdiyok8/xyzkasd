// ──────────────────────────────────────────────
// Water Purifier Service ERP — SurveyRepository Tests
// Multi-Tenant SaaS
//
// Tests: sendSurvey, respond, findByTicket, findById, findAll, getStats.
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SurveyRepository } from '../survey.repository';
import { prismaClient } from '../base.repository';

// ─── Mock ─────────────────────────────────────

vi.mock('../base.repository', () => {
  const mockPrisma = {
    serviceTicket: {
      findFirst: vi.fn(),
    },
    serviceSurvey: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    coupon: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
  };
  return {
    prismaClient: mockPrisma,
    BaseRepository: class {
      protected prisma = mockPrisma;
      protected tenantId: string | null;
      protected role: string;
      protected userId: string | null = null;
      protected ipAddress: string | null = null;

      constructor(context: { tenantId: string | null; role: string; userId?: string | null; ipAddress?: string | null }) {
        this.tenantId = context.tenantId;
        this.role = context.role;
        this.userId = context.userId ?? null;
        this.ipAddress = context.ipAddress ?? null;
      }

      protected tenantFilter(): { tenantId?: string } {
        if (this.role === 'super_admin') return {};
        if (!this.tenantId) throw new Error('Tenant gerekli');
        return { tenantId: this.tenantId };
      }

      protected hasAccess(resourceTenantId: string): boolean {
        if (this.role === 'super_admin') return true;
        return this.tenantId === resourceTenantId;
      }

      protected async auditCreate(_params: any): Promise<void> {}
      protected async auditUpdate(_params: any): Promise<void> {}
      protected async auditDelete(_params: any): Promise<void> {}
    },
  };
});

// ─── Fixtures ─────────────────────────────────

const tenantA = 'tenant-a';
const ticketId = 'ticket-1';

function mockTicket(overrides: Record<string, any> = {}) {
  return {
    id: ticketId,
    tenantId: tenantA,
    status: 'COMPLETED',
    ...overrides,
  };
}

function mockSurvey(overrides: Record<string, any> = {}) {
  return {
    id: 'survey-1',
    ticketId,
    tenantId: tenantA,
    score: null,
    comment: null,
    respondedAt: null,
    couponCode: null,
    couponSent: false,
    notificationSent: false,
    googleReviewSent: false,
    sentAt: new Date('2025-06-01'),
    deletedAt: null,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-01'),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────

describe('SurveyRepository', () => {
  let repo: SurveyRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new SurveyRepository({ tenantId: tenantA, role: 'technician' });
  });

  // ─── sendSurvey ──────────────────────────

  describe('sendSurvey', () => {
    it('creates a survey record for a completed ticket', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket());
      (prismaClient.serviceSurvey.upsert as any).mockResolvedValue({ id: 'survey-1', tenantId: tenantA });

      const result = await repo.sendSurvey(ticketId);

      expect(result.id).toBe('survey-1');
      expect(prismaClient.serviceTicket.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: ticketId, tenantId: tenantA }),
        }),
      );
    });

    it('throws NOT_FOUND when ticket does not exist', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(null);

      await expect(repo.sendSurvey('nonexistent')).rejects.toThrow('NOT_FOUND');
    });

    it('throws when ticket is not COMPLETED', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket({ status: 'ASSIGNED' }));

      await expect(repo.sendSurvey(ticketId)).rejects.toThrow('Servis henüz tamamlanmamış');
    });
  });

  // ─── respond ─────────────────────────────

  describe('respond', () => {
    it('records a high score (>=4), creates coupon and marks couponSent', async () => {
      (prismaClient.serviceSurvey.findUnique as any).mockResolvedValue(mockSurvey());
      (prismaClient.serviceSurvey.update as any).mockResolvedValue({});
      (prismaClient.coupon.findFirst as any).mockResolvedValue(null); // no collision
      (prismaClient.coupon.create as any).mockResolvedValue({});
      (prismaClient.serviceSurvey.findUnique as any).mockResolvedValue(
        mockSurvey({ score: 5, couponCode: 'SVY-ABCD1234' }),
      );

      const result = await repo.respond(ticketId, { score: 5, comment: 'Harika servis' });

      expect(result.action).toBe('HIGH_SCORE');
      expect(result.survey.score).toBe(5);
      expect(result.survey.couponCode).toBeDefined();

      // Verify coupon was created
      expect(prismaClient.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            discountPct: 10,
            ticketId,
          }),
        }),
      );

      // Verify update for couponSent and googleReviewSent
      const surveyUpdateCalls = (prismaClient.serviceSurvey.update as any).mock.calls;
      const couponSentCall = surveyUpdateCalls.find(
        (c: any) => c[0].data?.couponSent === true,
      );
      expect(couponSentCall).toBeDefined();
    });

    it('records a low score (<=2), marks notificationSent', async () => {
      (prismaClient.serviceSurvey.findUnique as any).mockResolvedValue(mockSurvey());
      (prismaClient.serviceSurvey.update as any).mockResolvedValue({});
      (prismaClient.serviceSurvey.findUnique as any).mockResolvedValue(
        mockSurvey({ score: 2 }),
      );

      const result = await repo.respond(ticketId, { score: 2, comment: 'Membran değişmedi' });

      expect(result.action).toBe('LOW_SCORE');
      expect(result.survey.score).toBe(2);

      // Verify notificationSent update
      const surveyUpdateCalls = (prismaClient.serviceSurvey.update as any).mock.calls;
      const notifCall = surveyUpdateCalls.find(
        (c: any) => c[0].data?.notificationSent === true,
      );
      expect(notifCall).toBeDefined();
    });

    it('records a neutral score (3), no coupon or notification', async () => {
      (prismaClient.serviceSurvey.findUnique as any).mockResolvedValue(mockSurvey());
      (prismaClient.serviceSurvey.update as any).mockResolvedValue({});
      (prismaClient.serviceSurvey.findUnique as any).mockResolvedValue(
        mockSurvey({ score: 3 }),
      );

      const result = await repo.respond(ticketId, { score: 3 });

      expect(result.action).toBe('NEUTRAL');
      expect(result.survey.score).toBe(3);
      expect(prismaClient.coupon.create).not.toHaveBeenCalled();
    });

    it('throws ANKET_BULUNAMADI when survey record does not exist', async () => {
      (prismaClient.serviceSurvey.findUnique as any).mockResolvedValue(null);

      await expect(repo.respond(ticketId, { score: 5 })).rejects.toThrow('ANKET_BULUNAMADI');
    });

    it('throws ANKET_ZATEN_YANITLANDI when survey already responded', async () => {
      (prismaClient.serviceSurvey.findUnique as any).mockResolvedValue(
        mockSurvey({ score: 4, respondedAt: new Date() }),
      );

      await expect(repo.respond(ticketId, { score: 5 })).rejects.toThrow('ANKET_ZATEN_YANITLANDI');
    });

    it('throws validation error for score out of range', async () => {
      await expect(repo.respond(ticketId, { score: 0 })).rejects.toThrow('Puan 1-5 arasında olmalıdır');
      await expect(repo.respond(ticketId, { score: 6 })).rejects.toThrow('Puan 1-5 arasında olmalıdır');
    });

    it('handles coupon code collision by regenerating', async () => {
      (prismaClient.serviceSurvey.findUnique as any).mockResolvedValue(mockSurvey());
      (prismaClient.serviceSurvey.update as any).mockResolvedValue({});
      // First code collides, second succeeds
      (prismaClient.coupon.findFirst as any)
        .mockResolvedValueOnce({ id: 'existing' }) // collision
        .mockResolvedValueOnce(null); // success
      (prismaClient.coupon.create as any).mockResolvedValue({});
      (prismaClient.serviceSurvey.findUnique as any).mockResolvedValue(
        mockSurvey({ score: 5, couponCode: 'SVY-UNIQUE1' }),
      );

      const result = await repo.respond(ticketId, { score: 4 });
      expect(result.survey.couponCode).toBeDefined();
      expect(prismaClient.coupon.findFirst).toHaveBeenCalledTimes(2);
    });
  });

  // ─── findByTicket ─────────────────────────

  describe('findByTicket', () => {
    it('returns survey for a ticket', async () => {
      (prismaClient.serviceSurvey.findFirst as any).mockResolvedValue(mockSurvey());

      const result = await repo.findByTicket(ticketId);

      expect(result).not.toBeNull();
      expect(result!.ticketId).toBe(ticketId);
      const callArgs = (prismaClient.serviceSurvey.findFirst as any).mock.calls[0][0];
      expect(callArgs.where.ticketId).toBe(ticketId);
      expect(callArgs.where.tenantId).toBe(tenantA);
    });

    it('returns null when no survey found', async () => {
      (prismaClient.serviceSurvey.findFirst as any).mockResolvedValue(null);
      const result = await repo.findByTicket('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ─── findById ─────────────────────────────

  describe('findById', () => {
    it('returns survey with ticket relations', async () => {
      const survey = mockSurvey({
        ticket: {
          ticketNo: 'SRV-001',
          completedAt: new Date(),
          customer: { id: 'cust-1', name: 'Ahmet', phone: '5551234567' },
          device: { id: 'dev-1', brand: 'A', model: 'B', serialNo: 'SN-001' },
          technician: { id: 'tech-1', name: 'Mehmet' },
        },
      });
      (prismaClient.serviceSurvey.findFirst as any).mockResolvedValue(survey);

      const result = await repo.findById('survey-1');

      expect(result).not.toBeNull();
      expect(result!.ticket.customer.name).toBe('Ahmet');
      const callArgs = (prismaClient.serviceSurvey.findFirst as any).mock.calls[0][0];
      expect(callArgs.include.ticket).toBeDefined();
    });

    it('returns null when survey does not exist', async () => {
      (prismaClient.serviceSurvey.findFirst as any).mockResolvedValue(null);
      const result = await repo.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ─── findAll ──────────────────────────────

  describe('findAll', () => {
    it('returns surveys with optional filters', async () => {
      (prismaClient.serviceSurvey.findMany as any).mockResolvedValue([
        mockSurvey({ score: 5, sentAt: new Date('2025-06-15') }),
      ]);

      const results = await repo.findAll({
        dateFrom: new Date('2025-06-01'),
        dateTo: new Date('2025-06-30'),
        responded: true,
      });

      expect(results).toHaveLength(1);
      const callArgs = (prismaClient.serviceSurvey.findMany as any).mock.calls[0][0];
      expect(callArgs.where.sentAt).toBeDefined();
      expect(callArgs.where.sentAt.gte).toBeInstanceOf(Date);
      expect(callArgs.where.sentAt.lte).toBeInstanceOf(Date);
      expect(callArgs.where.score).toEqual({ not: null });
      expect(callArgs.orderBy).toEqual({ sentAt: 'desc' });
    });

    it('filters for unresponded surveys', async () => {
      (prismaClient.serviceSurvey.findMany as any).mockResolvedValue([mockSurvey()]);

      await repo.findAll({ responded: false });

      const callArgs = (prismaClient.serviceSurvey.findMany as any).mock.calls[0][0];
      expect(callArgs.where.score).toBeNull();
    });

    it('returns empty array when no surveys', async () => {
      (prismaClient.serviceSurvey.findMany as any).mockResolvedValue([]);
      const results = await repo.findAll();
      expect(results).toEqual([]);
    });
  });

  // ─── getStats ─────────────────────────────

  describe('getStats', () => {
    it('calculates survey stats correctly', async () => {
      (prismaClient.serviceSurvey.findMany as any).mockResolvedValue([
        mockSurvey({ score: 5 }),
        mockSurvey({ score: 4 }),
        mockSurvey({ score: 3 }),
        mockSurvey({ score: 2 }),
        mockSurvey({ score: null }), // unresponded
      ]);

      const stats = await repo.getStats();

      expect(stats.total).toBe(5);
      expect(stats.responded).toBe(4);
      expect(stats.responseRate).toBe(80);
      expect(stats.avgScore).toBe(3.5); // (5+4+3+2)/4
      expect(stats.highScores).toBe(2);
      expect(stats.lowScores).toBe(1);
      expect(stats.distribution[5]).toBe(1);
      expect(stats.distribution[4]).toBe(1);
      expect(stats.distribution[3]).toBe(1);
      expect(stats.distribution[2]).toBe(1);
      expect(stats.distribution[1]).toBe(0);
    });

    it('returns zeros when no surveys', async () => {
      (prismaClient.serviceSurvey.findMany as any).mockResolvedValue([]);

      const stats = await repo.getStats();

      expect(stats.total).toBe(0);
      expect(stats.responded).toBe(0);
      expect(stats.responseRate).toBe(0);
      expect(stats.avgScore).toBe(0);
      expect(stats.highScores).toBe(0);
      expect(stats.lowScores).toBe(0);
    });

    it('filters by date range', async () => {
      (prismaClient.serviceSurvey.findMany as any).mockResolvedValue([]);

      await repo.getStats({
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-12-31'),
      });

      const callArgs = (prismaClient.serviceSurvey.findMany as any).mock.calls[0][0];
      expect(callArgs.where.sentAt.gte).toBeInstanceOf(Date);
      expect(callArgs.where.sentAt.lte).toBeInstanceOf(Date);
    });
  });

  // ─── getTenant ────────────────────────────

  describe('getTenant', () => {
    it('returns tenant by id', async () => {
      (prismaClient.tenant.findUnique as any).mockResolvedValue({ id: tenantA, name: 'Test Tenant' });

      const result = await repo.getTenant(tenantA);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(tenantA);
      expect(prismaClient.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: tenantA },
      });
    });

    it('returns null for unknown tenant', async () => {
      (prismaClient.tenant.findUnique as any).mockResolvedValue(null);
      const result = await repo.getTenant('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ─── Tenant Isolation ────────────────────

  describe('tenant isolation', () => {
    it('filters by tenant for non-super-admin', () => {
      const r = new SurveyRepository({ tenantId: tenantA, role: 'technician' });
      expect(r['tenantFilter']()).toEqual({ tenantId: tenantA });
    });

    it('does not filter for super_admin', () => {
      const r = new SurveyRepository({ tenantId: null, role: 'super_admin' });
      expect(r['tenantFilter']()).toEqual({});
    });

    it('throws if tenantId is missing for non-super-admin', () => {
      const r = new SurveyRepository({ tenantId: null, role: 'technician' });
      expect(() => r['tenantFilter']()).toThrow('Tenant gerekli');
    });
  });
});
