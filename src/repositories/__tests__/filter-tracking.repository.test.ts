import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterTrackingRepository } from '../filter-tracking.repository';
import { prismaClient } from '../base.repository';

// ──────────────────────────────────────────────
// FilterTrackingRepository — Unit Tests
// ──────────────────────────────────────────────

vi.mock('../base.repository', () => {
  const mockPrisma = {
    device: {
      findFirst: vi.fn(),
    },
    deviceFilter: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    filterCatalog: {
      findMany: vi.fn(),
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

      protected async auditCreate(_params: any): Promise<void> {}
      protected async auditUpdate(_params: any): Promise<void> {}
      protected async auditDelete(_params: any): Promise<void> {}
    },
  };
});

describe('FilterTrackingRepository', () => {
  const tenantId = 'tenant-1';
  const role = 'technician';
  const deviceId = 'device-1';
  let repo: FilterTrackingRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new FilterTrackingRepository({ tenantId, role });
  });

  // ─── Mock Data ─────────────────────────────

  const mockDeviceFilter = {
    id: 'filter-1',
    deviceId,
    filterCatalogId: 'catalog-1',
    tenantId,
    installedAt: new Date('2025-01-15'),
    expectedLifespanDays: 365,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    filterCatalog: {
      id: 'catalog-1',
      name: 'Sediment Filtre',
      stage: 'SEDIMENT',
      sku: 'SED-100',
    },
  };

  // ─── computeLifecycle (private via mapWithLifecycle) ───

  describe('computeLifecycle', () => {
    it('should compute remaining days for a filter installed today', () => {
      vi.useFakeTimers();
      const now = new Date('2025-06-29');
      vi.setSystemTime(now);

      const installedAt = new Date('2025-06-29'); // installed today
      const result = repo['computeLifecycle'](installedAt, 365);

      expect(result.remainingDays).toBe(365);
      expect(result.remainingPercent).toBe(100);
      // next maintenance = installedAt + 365 days
      expect(result.nextMaintenanceAt.toISOString().slice(0, 10)).toBe('2026-06-29');

      vi.useRealTimers();
    });

    it('should compute zero remaining for an expired filter', () => {
      vi.useFakeTimers();
      const now = new Date('2026-06-29');
      vi.setSystemTime(now);

      const installedAt = new Date('2025-01-15'); // over a year ago
      const result = repo['computeLifecycle'](installedAt, 365);

      expect(result.remainingDays).toBe(0);
      expect(result.remainingPercent).toBe(0);

      vi.useRealTimers();
    });

    it('should compute partial remaining for a partially-worn filter', () => {
      vi.useFakeTimers();
      const now = new Date('2025-07-15');
      vi.setSystemTime(now);

      const installedAt = new Date('2025-01-15'); // 181 days ago
      const result = repo['computeLifecycle'](installedAt, 365);

      // 365 - 181 = 184 remaining
      expect(result.remainingDays).toBe(184);
      // 184 / 365 ≈ 50.4% → round to 50
      expect(result.remainingPercent).toBe(50);

      vi.useRealTimers();
    });

    it('should handle exactly half lifespan elapsed', () => {
      vi.useFakeTimers();
      const now = new Date('2025-07-16'); // 182 days after Jan 15
      vi.setSystemTime(now);

      const installedAt = new Date('2025-01-15');
      const result = repo['computeLifecycle'](installedAt, 364); // exactly 2 * 182

      expect(result.remainingDays).toBe(182);
      expect(result.remainingPercent).toBe(50);

      vi.useRealTimers();
    });

    it('should handle zero expected lifespan gracefully', () => {
      vi.useFakeTimers();
      const now = new Date('2025-06-29');
      vi.setSystemTime(now);

      const installedAt = new Date('2025-06-29');
      const result = repo['computeLifecycle'](installedAt, 0);

      expect(result.remainingDays).toBe(0);
      expect(result.remainingPercent).toBe(0);
      // next maintenance = installedAt + 0 days = installedAt
      expect(result.nextMaintenanceAt.toISOString().slice(0, 10)).toBe('2025-06-29');

      vi.useRealTimers();
    });

    it('should compute next maintenance date from installedAt + expectedLifespanDays', () => {
      vi.useFakeTimers();
      const now = new Date('2025-06-01');
      vi.setSystemTime(now);

      const installedAt = new Date('2025-03-01'); // 92 days ago
      const result = repo['computeLifecycle'](installedAt, 180);

      // next maintenance = installedAt + 180 days = 2025-08-28
      expect(result.nextMaintenanceAt.toISOString().slice(0, 10)).toBe('2025-08-28');

      vi.useRealTimers();
    });
  });

  // ─── findByDevice ──────────────────────────

  describe('findByDevice', () => {
    it('should return filters for a device with lifecycle info', async () => {
      vi.useFakeTimers();
      const now = new Date('2025-06-29');
      vi.setSystemTime(now);

      (prismaClient.device.findFirst as any).mockResolvedValue({ id: deviceId });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([mockDeviceFilter]);

      const result = await repo.findByDevice(deviceId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('filter-1');
      expect(result[0].remainingDays).toBeGreaterThan(0);
      expect(result[0].remainingPercent).toBeGreaterThan(0);
      expect(result[0].filterCatalog.name).toBe('Sediment Filtre');
      expect(prismaClient.deviceFilter.findMany).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should throw NOT_FOUND when device does not belong to tenant', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue(null);

      await expect(repo.findByDevice(deviceId)).rejects.toThrow('NOT_FOUND');
    });

    it('should return empty array when no filters installed', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue({ id: deviceId });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([]);

      const result = await repo.findByDevice(deviceId);
      expect(result).toEqual([]);
    });

    it('should order filters by installedAt descending', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue({ id: deviceId });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([mockDeviceFilter]);

      await repo.findByDevice(deviceId);

      const callArgs = (prismaClient.deviceFilter.findMany as any).mock.calls[0][0];
      expect(callArgs.orderBy).toEqual({ installedAt: 'desc' });
    });
  });

  // ─── add ───────────────────────────────────

  describe('add', () => {
    it('should install a new filter with lifecycle info', async () => {
      vi.useFakeTimers();
      const now = new Date('2025-06-29');
      vi.setSystemTime(now);

      (prismaClient.device.findFirst as any).mockResolvedValue({ id: deviceId });
      (prismaClient.deviceFilter.create as any).mockResolvedValue(mockDeviceFilter);

      const input = {
        filterCatalogId: 'catalog-1',
        installedAt: '2025-01-15',
        expectedLifespanDays: 365,
        notes: null,
      };

      const result = await repo.add(deviceId, input);

      expect(result.id).toBe('filter-1');
      expect(result.remainingDays).toBeGreaterThan(0);
      expect(result.remainingPercent).toBeGreaterThan(0);
      expect(prismaClient.deviceFilter.create).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should default installedAt to now when not provided', async () => {
      vi.useFakeTimers();
      const now = new Date('2025-06-29');
      vi.setSystemTime(now);

      (prismaClient.device.findFirst as any).mockResolvedValue({ id: deviceId });
      (prismaClient.deviceFilter.create as any).mockResolvedValue({
        ...mockDeviceFilter,
        installedAt: now,
      });

      await repo.add(deviceId, {
        filterCatalogId: 'catalog-1',
        expectedLifespanDays: 365,
      });

      const createData = (prismaClient.deviceFilter.create as any).mock.calls[0][0].data;
      expect(createData.installedAt).toBeUndefined(); // not set explicitly → prisma defaults to now()

      vi.useRealTimers();
    });

    it('should throw NOT_FOUND when device does not exist', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue(null);

      await expect(
        repo.add(deviceId, {
          filterCatalogId: 'catalog-1',
          expectedLifespanDays: 365,
        }),
      ).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── update ────────────────────────────────

  describe('update', () => {
    it('should update filter fields and return recomputed lifecycle', async () => {
      vi.useFakeTimers();
      const now = new Date('2025-06-29');
      vi.setSystemTime(now);

      (prismaClient.deviceFilter.findFirst as any).mockResolvedValue(mockDeviceFilter);
      (prismaClient.deviceFilter.update as any).mockResolvedValue(mockDeviceFilter);

      const result = await repo.update('filter-1', { notes: 'Yeni not' });

      expect(result.remainingDays).toBeGreaterThan(0);
      expect(prismaClient.deviceFilter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'filter-1' },
          data: expect.objectContaining({ notes: 'Yeni not' }),
        }),
      );

      vi.useRealTimers();
    });

    it('should throw NOT_FOUND when filter does not exist', async () => {
      (prismaClient.deviceFilter.findFirst as any).mockResolvedValue(null);

      await expect(
        repo.update('nonexistent', { notes: 'test' }),
      ).rejects.toThrow('NOT_FOUND');
    });

    it('should update expectedLifespanDays', async () => {
      (prismaClient.deviceFilter.findFirst as any).mockResolvedValue(mockDeviceFilter);
      (prismaClient.deviceFilter.update as any).mockResolvedValue(mockDeviceFilter);

      await repo.update('filter-1', { expectedLifespanDays: 180 });

      const updateData = (prismaClient.deviceFilter.update as any).mock.calls[0][0].data;
      expect(updateData.expectedLifespanDays).toBe(180);
    });
  });

  // ─── remove ────────────────────────────────

  describe('remove', () => {
    it('should soft delete a filter tracking entry', async () => {
      const now = new Date();
      (prismaClient.deviceFilter.findFirst as any).mockResolvedValue(mockDeviceFilter);
      (prismaClient.deviceFilter.update as any).mockResolvedValue({ ...mockDeviceFilter, deletedAt: now });

      await repo.remove('filter-1');

      expect(prismaClient.deviceFilter.update).toHaveBeenCalledWith({
        where: { id: 'filter-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NOT_FOUND when deleting nonexistent filter', async () => {
      (prismaClient.deviceFilter.findFirst as any).mockResolvedValue(null);

      await expect(repo.remove('nonexistent')).rejects.toThrow('NOT_FOUND');
    });

    it('should enforce tenant isolation', async () => {
      // Filter exists but belongs to different tenant
      (prismaClient.deviceFilter.findFirst as any).mockResolvedValue(null);

      await expect(repo.remove('filter-other-tenant')).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── findAll ───────────────────────────────

  describe('findAll', () => {
    it('should return all filters across tenant with device info', async () => {
      vi.useFakeTimers();
      const now = new Date('2025-06-29');
      vi.setSystemTime(now);

      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([
        {
          ...mockDeviceFilter,
          device: {
            id: 'device-1',
            serialNo: 'SN-001',
            brand: 'AquaPure',
            model: 'AP-5000',
          },
        },
      ]);

      const result = await repo.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].device).toBeDefined();
      expect(result[0].device!.serialNo).toBe('SN-001');
      expect(result[0].remainingDays).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    it('should return empty array when no filters exist', async () => {
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([]);

      const result = await repo.findAll();
      expect(result).toEqual([]);
    });
  });

  // ─── findOverdue ───────────────────────────

  describe('findOverdue', () => {
    it('should return filters with remainingDays <= 30', async () => {
      vi.useFakeTimers();
      const now = new Date('2025-12-01'); // far future to make filters overdue
      vi.setSystemTime(now);

      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([
        {
          ...mockDeviceFilter,
          id: 'filter-overdue',
          installedAt: new Date('2024-01-01'), // very old → overdue
          device: { id: 'device-1', serialNo: 'SN-001', brand: 'A', model: 'B' },
        },
        {
          ...mockDeviceFilter,
          id: 'filter-ok',
          installedAt: new Date('2025-11-30'), // installed yesterday → ok
          device: { id: 'device-2', serialNo: 'SN-002', brand: 'C', model: 'D' },
        },
      ]);

      const result = await repo.findOverdue();

      // At least the very old filter should be in the result
      expect(result.length).toBeGreaterThanOrEqual(1);
      expect(result.some((f) => f.id === 'filter-overdue')).toBe(true);

      vi.useRealTimers();
    });

    it('should return empty when all filters are within lifespan', async () => {
      vi.useFakeTimers();
      const now = new Date('2025-06-29');
      vi.setSystemTime(now);

      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([
        {
          ...mockDeviceFilter,
          id: 'filter-new',
          installedAt: new Date('2025-06-29'), // installed today
          device: { id: 'device-1', serialNo: 'SN-001', brand: 'A', model: 'B' },
        },
      ]);

      const result = await repo.findOverdue();

      // remainingDays should be 365, well over 30
      const newFilter = result.find((f) => f.id === 'filter-new');
      if (newFilter) {
        // If returned, remainingDays must be <= 30
        expect(newFilter.remainingDays).toBeLessThanOrEqual(30);
      } else {
        expect(result).toHaveLength(0);
      }

      vi.useRealTimers();
    });
  });

  // ─── Tenant Isolation ─────────────────────

  describe('tenant isolation', () => {
    it('should filter by tenant for non-super-admin', () => {
      const r = new FilterTrackingRepository({ tenantId: 'tenant-a', role: 'technician' });
      expect(r['tenantFilter']()).toEqual({ tenantId: 'tenant-a' });
    });

    it('should not filter for super_admin', () => {
      const r = new FilterTrackingRepository({ tenantId: null, role: 'super_admin' });
      expect(r['tenantFilter']()).toEqual({});
    });

    it('should throw if tenantId is missing for non-super-admin', () => {
      const r = new FilterTrackingRepository({ tenantId: null, role: 'technician' });
      expect(() => r['tenantFilter']()).toThrow('Tenant gerekli');
    });
  });
});
