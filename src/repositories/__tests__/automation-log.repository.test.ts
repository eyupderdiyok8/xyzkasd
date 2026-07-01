// ──────────────────────────────────────────────
// Water Purifier Service ERP — AutomationLog Repository Tests
// Multi-Tenant SaaS
//
// Tests for log listing, filtering, and stats.
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutomationLogRepository } from '../automation-log.repository';

// ─── Mock Prisma ──────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  automationLog: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  },
}));

vi.mock('../base.repository', () => {
  return {
    prismaClient: mockPrisma,
    BaseRepository: class {
      protected prisma = mockPrisma;
      protected tenantId: string | null = 'tenant-1';
      protected role: string = 'admin';
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

// ─── Fixtures ─────────────────────────────────────

function mockLog(overrides: Record<string, any> = {}) {
  return {
    id: 'log-1',
    tenantId: 'tenant-1',
    ruleId: 'rule-1',
    trigger: 'service.completed',
    entityType: 'service_ticket',
    entityId: 'ticket-1',
    context: '{}',
    status: 'SUCCESS',
    actionsJson: '[]',
    result: null,
    errorMsg: null,
    deletedAt: null,
    executedAt: new Date('2025-06-01'),
    rule: { id: 'rule-1', name: 'Test Rule', trigger: 'service.completed' },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────

describe('AutomationLogRepository', () => {
  let repo: AutomationLogRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new AutomationLogRepository({ tenantId: 'tenant-1', role: 'admin' });
  });

  // ─── findAll ────────────────────────────────────

  describe('findAll', () => {
    it('returns paginated logs with total count', async () => {
      mockPrisma.automationLog.findMany.mockResolvedValue([mockLog()]);
      mockPrisma.automationLog.count.mockResolvedValue(1);

      const result = await repo.findAll();

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });

    it('includes rule relation in results', async () => {
      mockPrisma.automationLog.findMany.mockResolvedValue([mockLog()]);
      mockPrisma.automationLog.count.mockResolvedValue(1);

      const result = await repo.findAll();

      expect(result.data[0].rule).toBeDefined();
      expect(result.data[0].rule.name).toBe('Test Rule');
    });

    it('filters by ruleId', async () => {
      mockPrisma.automationLog.findMany.mockResolvedValue([mockLog()]);
      mockPrisma.automationLog.count.mockResolvedValue(1);

      await repo.findAll({ ruleId: 'rule-1' });

      expect(mockPrisma.automationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ruleId: 'rule-1' }),
        }),
      );
    });

    it('filters by status', async () => {
      mockPrisma.automationLog.findMany.mockResolvedValue([mockLog()]);
      mockPrisma.automationLog.count.mockResolvedValue(1);

      await repo.findAll({ status: 'FAILED' });

      expect(mockPrisma.automationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    });

    it('filters by trigger', async () => {
      mockPrisma.automationLog.findMany.mockResolvedValue([mockLog()]);
      mockPrisma.automationLog.count.mockResolvedValue(1);

      await repo.findAll({ trigger: 'maintenance.due' });

      expect(mockPrisma.automationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ trigger: 'maintenance.due' }),
        }),
      );
    });

    it('filters by date range', async () => {
      mockPrisma.automationLog.findMany.mockResolvedValue([mockLog()]);
      mockPrisma.automationLog.count.mockResolvedValue(1);

      await repo.findAll({
        fromDate: '2025-01-01',
        toDate: '2025-12-31',
      });

      const callWhere = mockPrisma.automationLog.findMany.mock.calls[0][0].where;
      expect(callWhere.executedAt).toBeDefined();
      expect(callWhere.executedAt.gte).toBeInstanceOf(Date);
      expect(callWhere.executedAt.lte).toBeInstanceOf(Date);
    });

    it('orders by executedAt descending', async () => {
      mockPrisma.automationLog.findMany.mockResolvedValue([]);
      mockPrisma.automationLog.count.mockResolvedValue(0);

      await repo.findAll();

      expect(mockPrisma.automationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { executedAt: 'desc' },
        }),
      );
    });

    it('applies pagination limit and offset', async () => {
      mockPrisma.automationLog.findMany.mockResolvedValue([]);
      mockPrisma.automationLog.count.mockResolvedValue(0);

      await repo.findAll({ limit: 10, offset: 20 });

      expect(mockPrisma.automationLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
    });

    it('returns empty data when no logs exist', async () => {
      mockPrisma.automationLog.findMany.mockResolvedValue([]);
      mockPrisma.automationLog.count.mockResolvedValue(0);

      const result = await repo.findAll();
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ─── findById ───────────────────────────────────

  describe('findById', () => {
    it('returns a single log by ID', async () => {
      mockPrisma.automationLog.findFirst.mockResolvedValue(mockLog());

      const log = await repo.findById('log-1');
      expect(log.id).toBe('log-1');
    });

    it('throws NOT_FOUND when log does not exist', async () => {
      mockPrisma.automationLog.findFirst.mockResolvedValue(null);

      await expect(repo.findById('nonexistent')).rejects.toThrow('NOT_FOUND');
    });

    it('includes rule relation', async () => {
      mockPrisma.automationLog.findFirst.mockResolvedValue(mockLog());

      const log = await repo.findById('log-1');
      expect(log.rule).toBeDefined();
      expect(log.rule.name).toBe('Test Rule');
    });
  });

  // ─── getStats ─────────────────────────────────

  describe('getStats', () => {
    it('returns stats summary for the last N days', async () => {
      mockPrisma.automationLog.findMany.mockResolvedValue([
        mockLog({ status: 'SUCCESS', trigger: 'service.completed' }),
        mockLog({ status: 'SUCCESS', trigger: 'service.completed', id: 'log-2' }),
        mockLog({ status: 'FAILED', trigger: 'maintenance.due', id: 'log-3' }),
      ]);

      const stats = await repo.getStats(30);

      expect(stats.total).toBe(3);
      expect(stats.byStatus.SUCCESS).toBe(2);
      expect(stats.byStatus.FAILED).toBe(1);
      expect(stats.byTrigger['service.completed']).toBe(2);
      expect(stats.byTrigger['maintenance.due']).toBe(1);
      expect(stats.successRate).toBeCloseTo(66.67, 1);
    });

    it('returns zero success rate when no logs', async () => {
      mockPrisma.automationLog.findMany.mockResolvedValue([]);

      const stats = await repo.getStats(30);

      expect(stats.total).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('filters by tenant scope', async () => {
      mockPrisma.automationLog.findMany.mockResolvedValue([]);

      await repo.getStats(30);

      const callWhere = mockPrisma.automationLog.findMany.mock.calls[0][0].where;
      expect(callWhere.tenantId).toBe('tenant-1');
    });
  });
});
