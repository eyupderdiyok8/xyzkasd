// ──────────────────────────────────────────────
// Water Purifier Service ERP — ReportRepository Tests
// Multi-Tenant SaaS
//
// Tests: Dashboard stats, technician perf, satisfaction,
// most-changed filters, monthly forecast.
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportRepository } from '../report.repository';
import { prismaClient } from '../base.repository';

// ─── Mock ─────────────────────────────────────

vi.mock('../base.repository', () => {
  const mockPrisma = {
    serviceTicket: {
      findMany: vi.fn(),
    },
    technician: {
      findMany: vi.fn(),
    },
    serviceSurvey: {
      findMany: vi.fn(),
    },
    filterChange: {
      groupBy: vi.fn(),
    },
    filterCatalog: {
      findMany: vi.fn(),
    },
    device: {
      findMany: vi.fn(),
    },
    deviceFilter: {
      count: vi.fn(),
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

      protected async auditCreate(_: any): Promise<void> {}
      protected async auditUpdate(_: any): Promise<void> {}
      protected async auditDelete(_: any): Promise<void> {}
    },
  };
});

// ─── Fixtures ─────────────────────────────────

const tenantId = 'tenant-1';

function makeTicket(overrides: Record<string, any> = {}) {
  return {
    id: 'tkt-1',
    ticketNo: 'SRV-001',
    status: 'COMPLETED',
    customer: { name: 'Ahmet', phone: '5551234567' },
    technician: { name: 'Mehmet' },
    scheduledAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeTech(overrides: Record<string, any> = {}) {
  return {
    id: 'tech-1',
    name: 'Mehmet Teknisyen',
    isActive: true,
    serviceTickets: [],
    ...overrides,
  };
}

function makeSurvey(overrides: Record<string, any> = {}) {
  return {
    id: 'svy-1',
    score: 5,
    respondedAt: new Date(),
    sentAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────

describe('ReportRepository', () => {
  let repo: ReportRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ReportRepository({ tenantId, role: 'manager' });
  });

  // ─── getDashboardStats ───────────────────

  describe('getDashboardStats', () => {
    it('returns today service count and lists', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-29T10:00:00'));

      (prismaClient.serviceTicket.findMany as any).mockResolvedValue([makeTicket()]);
      // Upcoming maintenance: 3 filters due within 30 days from June 29
      (prismaClient.device.findMany as any).mockResolvedValue([
        {
          deviceFilters: [
            { installedAt: new Date('2025-01-11'), expectedLifespanDays: 170 }, // due Jun 30
            { installedAt: new Date('2025-02-15'), expectedLifespanDays: 140 }, // due ~Jul 5
            { installedAt: new Date('2025-04-01'), expectedLifespanDays: 100 }, // due ~Jul 10
          ],
        },
      ]);

      const stats = await repo.getDashboardStats();

      expect(stats.todayServiceCount).toBe(1);
      expect(stats.todayServices).toHaveLength(1);
      expect(stats.todayServices[0].ticketNo).toBe('SRV-001');
      expect(stats.todayServices[0].customer.name).toBe('Ahmet');
      expect(stats.upcomingMaintenanceCount).toBeGreaterThanOrEqual(1);
      expect(stats.overdueMaintenanceCount).toBe(0);

      // Verify date filter
      const callArgs = (prismaClient.serviceTicket.findMany as any).mock.calls[0][0];
      expect(callArgs.where.createdAt.gte).toBeInstanceOf(Date);
      expect(callArgs.where.createdAt.lte).toBeInstanceOf(Date);

      vi.useRealTimers();
    });

    it('returns zero counts when no data', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-29'));

      (prismaClient.serviceTicket.findMany as any).mockResolvedValue([]);
      (prismaClient.deviceFilter.count as any).mockResolvedValue(0);
      (prismaClient.device.findMany as any).mockResolvedValue([]);

      const stats = await repo.getDashboardStats();

      expect(stats.todayServiceCount).toBe(0);
      expect(stats.upcomingMaintenanceCount).toBe(0);
      expect(stats.overdueMaintenanceCount).toBe(0);

      vi.useRealTimers();
    });
  });

  // ─── getTechnicianPerformance ────────────

  describe('getTechnicianPerformance', () => {
    it('calculates performance metrics', async () => {
      (prismaClient.technician.findMany as any).mockResolvedValue([
        makeTech({
          name: 'Mehmet',
          serviceTickets: [
            { status: 'COMPLETED', surveys: [{ score: 5 }] },
            { status: 'COMPLETED', surveys: [{ score: 4 }] },
            { status: 'ASSIGNED', surveys: [] },
          ],
        }),
      ]);

      const results = await repo.getTechnicianPerformance();

      expect(results).toHaveLength(1);
      expect(results[0].technicianName).toBe('Mehmet');
      expect(results[0].totalServices).toBe(3);
      expect(results[0].completedServices).toBe(2);
      expect(results[0].avgScore).toBe(4.5);
      expect(results[0].surveyCount).toBe(2);
    });

    it('returns empty array when no techs', async () => {
      (prismaClient.technician.findMany as any).mockResolvedValue([]);
      const results = await repo.getTechnicianPerformance();
      expect(results).toEqual([]);
    });

    it('handles tech with no completed services', async () => {
      (prismaClient.technician.findMany as any).mockResolvedValue([
        makeTech({
          serviceTickets: [
            { status: 'ASSIGNED', surveys: [] },
            { status: 'PENDING', surveys: [] },
          ],
        }),
      ]);

      const results = await repo.getTechnicianPerformance();

      expect(results[0].completedServices).toBe(0);
      expect(results[0].avgScore).toBe(0);
      expect(results[0].surveyCount).toBe(0);
    });

    it('filters by tenant', async () => {
      (prismaClient.technician.findMany as any).mockResolvedValue([]);
      await repo.getTechnicianPerformance();
      const callArgs = (prismaClient.technician.findMany as any).mock.calls[0][0];
      expect(callArgs.where.tenantId).toBe(tenantId);
    });
  });

  // ─── getSatisfactionSummary ──────────────

  describe('getSatisfactionSummary', () => {
    it('calculates satisfaction stats', async () => {
      (prismaClient.serviceSurvey.findMany as any).mockResolvedValue([
        makeSurvey({ score: 5 }),
        makeSurvey({ score: 4 }),
        makeSurvey({ score: 3 }),
        makeSurvey({ score: 2 }),
        makeSurvey({ score: 1 }),
        makeSurvey({ score: null, respondedAt: null }), // unresponded
      ]);

      const summary = await repo.getSatisfactionSummary();

      expect(summary.total).toBe(6);
      expect(summary.responded).toBe(5);
      expect(summary.responseRate).toBe(83); // round(5/6*100)
      expect(summary.avgScore).toBe(3);
      expect(summary.highScores).toBe(2);
      expect(summary.lowScores).toBe(2);
      expect(summary.distribution).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 });
    });

    it('returns zeros when no surveys', async () => {
      (prismaClient.serviceSurvey.findMany as any).mockResolvedValue([]);

      const summary = await repo.getSatisfactionSummary();

      expect(summary.total).toBe(0);
      expect(summary.avgScore).toBe(0);
      expect(summary.highScores).toBe(0);
    });

    it('applies date filters', async () => {
      (prismaClient.serviceSurvey.findMany as any).mockResolvedValue([]);

      await repo.getSatisfactionSummary({
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-12-31'),
      });

      const callArgs = (prismaClient.serviceSurvey.findMany as any).mock.calls[0][0];
      expect(callArgs.where.sentAt.gte).toBeInstanceOf(Date);
      expect(callArgs.where.sentAt.lte).toBeInstanceOf(Date);
    });
  });

  // ─── getMostChangedFilters ───────────────

  describe('getMostChangedFilters', () => {
    it('returns top changed filters', async () => {
      (prismaClient.filterChange.groupBy as any).mockResolvedValue([
        { filterId: 'fc-1', _count: { filterId: 15 } },
        { filterId: 'fc-2', _count: { filterId: 8 } },
      ]);
      (prismaClient.filterCatalog.findMany as any).mockResolvedValue([
        { id: 'fc-1', name: 'Sediment Filtre', stage: 'SEDIMENT' },
        { id: 'fc-2', name: 'Karbon Blok', stage: 'CARBON_BLOCK' },
      ]);

      const results = await repo.getMostChangedFilters(5);

      expect(results).toHaveLength(2);
      expect(results[0].filterName).toBe('Sediment Filtre');
      expect(results[0].changeCount).toBe(15);
      expect(results[1].filterName).toBe('Karbon Blok');
      expect(results[1].stage).toBe('CARBON_BLOCK');
    });

    it('returns empty array when no changes', async () => {
      (prismaClient.filterChange.groupBy as any).mockResolvedValue([]);
      const results = await repo.getMostChangedFilters();
      expect(results).toEqual([]);
    });

    it('uses default limit of 10', async () => {
      (prismaClient.filterChange.groupBy as any).mockResolvedValue([]);
      await repo.getMostChangedFilters();
      const callArgs = (prismaClient.filterChange.groupBy as any).mock.calls[0][0];
      expect(callArgs.take).toBe(10);
    });

    it('handles missing catalog entries (unknown filter)', async () => {
      (prismaClient.filterChange.groupBy as any).mockResolvedValue([
        { filterId: 'unknown-id', _count: { filterId: 5 } },
      ]);
      (prismaClient.filterCatalog.findMany as any).mockResolvedValue([]);

      const results = await repo.getMostChangedFilters();

      expect(results[0].filterName).toBe('Bilinmeyen Filtre');
      expect(results[0].stage).toBe('OTHER');
    });
  });

  // ─── getMonthlyMaintenanceForecast ───────

  describe('getMonthlyMaintenanceForecast', () => {
    it('returns 12-month forecast starting from current month', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15'));

      (prismaClient.device.findMany as any).mockResolvedValue([
        {
          id: 'dev-1',
          deviceFilters: [
            { installedAt: new Date('2024-06-15'), expectedLifespanDays: 365 }, // due Jun 2025
          ],
        },
      ]);

      const forecast = await repo.getMonthlyMaintenanceForecast();

      expect(forecast).toHaveLength(12);
      expect(forecast[0].month).toBe('2025-06');
      expect(forecast[0].label).toBe('Haziran 2025');
      // Filter installed Jun 15 2024 + 365 days = Jun 15 2025 → month 2025-06
      expect(forecast[0].count).toBe(1);

      // Other months should be 0
      expect(forecast[1].count).toBe(0);
      expect(forecast[11].month).toBe('2026-05');

      vi.useRealTimers();
    });

    it('returns zeros for all months when no devices', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15'));

      (prismaClient.device.findMany as any).mockResolvedValue([]);

      const forecast = await repo.getMonthlyMaintenanceForecast();

      expect(forecast).toHaveLength(12);
      for (const m of forecast) {
        expect(m.count).toBe(0);
      }

      vi.useRealTimers();
    });

    it('filters by tenant', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-15'));

      (prismaClient.device.findMany as any).mockResolvedValue([]);

      await repo.getMonthlyMaintenanceForecast();

      const callArgs = (prismaClient.device.findMany as any).mock.calls[0][0];
      expect(callArgs.where.tenantId).toBe(tenantId);
      expect(callArgs.where.status).toBe('ACTIVE');
      expect(callArgs.where.customerId).toEqual({ not: null });

      vi.useRealTimers();
    });
  });

  // ─── Tenant Isolation ────────────────────

  describe('tenant isolation', () => {
    it('filters by tenant for non-super-admin', () => {
      const r = new ReportRepository({ tenantId: 'tenant-a', role: 'manager' });
      expect(r['tenantFilter']()).toEqual({ tenantId: 'tenant-a' });
    });

    it('does not filter for super_admin', () => {
      const r = new ReportRepository({ tenantId: null, role: 'super_admin' });
      expect(r['tenantFilter']()).toEqual({});
    });

    it('throws if tenantId is missing for non-super-admin', () => {
      const r = new ReportRepository({ tenantId: null, role: 'manager' });
      expect(() => r['tenantFilter']()).toThrow('Tenant gerekli');
    });
  });
});
