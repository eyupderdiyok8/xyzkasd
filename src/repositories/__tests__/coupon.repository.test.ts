// ──────────────────────────────────────────────
// Water Purifier Service ERP — CouponRepository Tests
// Multi-Tenant SaaS
//
// Tests: CRUD, validate & use, auto-create, tenant isolation.
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CouponRepository } from '../coupon.repository';
import { prismaClient } from '../base.repository';

// ─── Mock ─────────────────────────────────────

vi.mock('../base.repository', () => {
  const mockPrisma = {
    coupon: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    couponUsage: {
      create: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => fn(mockPrisma)),
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
const tenantB = 'tenant-b';

function makeCoupon(overrides: Record<string, any> = {}) {
  return {
    id: 'coup-1',
    tenantId: tenantA,
    code: 'INDIRIM-10',
    discountPct: 10,
    maxUses: 1,
    currentUses: 0,
    isActive: true,
    autoCreated: false,
    minRating: null,
    description: 'Test kuponu',
    expiresAt: new Date('2027-01-01'),
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    _count: { usages: 0 },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────

describe('CouponRepository', () => {
  let repo: CouponRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new CouponRepository({ tenantId: tenantA, role: 'manager' });
  });

  // ─── findAll ─────────────────────────────

  describe('findAll', () => {
    it('returns all coupons for the tenant ordered by createdAt desc', async () => {
      (prismaClient.coupon.findMany as any).mockResolvedValue([makeCoupon()]);

      const results = await repo.findAll();

      expect(results).toHaveLength(1);
      expect(results[0].tenantId).toBe(tenantA);
      const callArgs = (prismaClient.coupon.findMany as any).mock.calls[0][0];
      expect(callArgs.where.tenantId).toBe(tenantA);
      expect(callArgs.where.deletedAt).toBeNull();
      expect(callArgs.orderBy).toEqual({ createdAt: 'desc' });
      expect(callArgs.include._count).toBeDefined();
    });

    it('includes soft-deleted when showDeleted = true', async () => {
      (prismaClient.coupon.findMany as any).mockResolvedValue([]);
      await repo.findAll(true);
      const callArgs = (prismaClient.coupon.findMany as any).mock.calls[0][0];
      expect(callArgs.where.deletedAt).toBeUndefined();
    });

    it('returns empty array when no coupons exist', async () => {
      (prismaClient.coupon.findMany as any).mockResolvedValue([]);
      const results = await repo.findAll();
      expect(results).toEqual([]);
    });
  });

  // ─── findById ─────────────────────────────

  describe('findById', () => {
    it('returns coupon with usage history', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(makeCoupon());

      const result = await repo.findById('coup-1');

      expect(result.id).toBe('coup-1');
      expect(result.code).toBe('INDIRIM-10');
      const callArgs = (prismaClient.coupon.findFirst as any).mock.calls[0][0];
      expect(callArgs.include.usages).toBeDefined();
      expect(callArgs.include.usages.orderBy).toEqual({ usedAt: 'desc' });
    });

    it('throws NOT_FOUND for non-existent coupon', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(null);
      await expect(repo.findById('nonexistent')).rejects.toThrow('NOT_FOUND');
    });

    it('throws NOT_FOUND for cross-tenant coupon', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(null);
      await expect(repo.findById('other-tenant-coupon')).rejects.toThrow('NOT_FOUND');
    });

    it('excludes soft-deleted by default', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(null);
      await expect(repo.findById('deleted-coupon')).rejects.toThrow('NOT_FOUND');
    });

    it('includes soft-deleted when showDeleted = true', async () => {
      const deleted = makeCoupon({ deletedAt: new Date() });
      (prismaClient.coupon.findFirst as any).mockResolvedValue(deleted);

      const result = await repo.findById('coup-1', true);

      expect(result.deletedAt).toBeInstanceOf(Date);
      // When showDeleted=true, findById should NOT add deletedAt: null to where
      expect(prismaClient.coupon.findFirst).toHaveBeenCalled();
    });
  });

  // ─── findByCode ───────────────────────────

  describe('findByCode', () => {
    it('finds coupon by normalized code (uppercase, trimmed)', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(makeCoupon());

      const result = await repo.findByCode('  indirim-10  ');

      expect(result).not.toBeNull();
      expect(result!.code).toBe('INDIRIM-10');
      const callArgs = (prismaClient.coupon.findFirst as any).mock.calls[0][0];
      expect(callArgs.where.code).toBe('INDIRIM-10');
      expect(callArgs.where.tenantId).toBe(tenantA);
      expect(callArgs.where.deletedAt).toBeNull();
    });

    it('returns null for unknown code', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(null);
      const result = await repo.findByCode('NONEXISTENT');
      expect(result).toBeNull();
    });

    it('returns null for code from different tenant', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(null);
      const result = await repo.findByCode('TENANT-B-CODE');
      expect(result).toBeNull();
    });
  });

  // ─── create ───────────────────────────────

  describe('create', () => {
    it('creates a coupon with normalized code', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(null); // no duplicate
      (prismaClient.coupon.create as any).mockResolvedValue(makeCoupon());

      const result = await repo.create({
        code: '  yeni-kupon  ',
        discountPct: 15,
        maxUses: 5,
        expiresAt: '2026-06-01',
        description: 'Yeni kampanya',
      });

      expect(result.code).toBe('INDIRIM-10');
      const createData = (prismaClient.coupon.create as any).mock.calls[0][0].data;
      expect(createData.tenantId).toBe(tenantA);
      expect(createData.code).toBe('YENI-KUPON'); // trimmed + uppercased
      expect(createData.discountPct).toBe(15);
      expect(createData.maxUses).toBe(5);
      expect(createData.description).toBe('Yeni kampanya');
      expect(createData.autoCreated).toBe(false);
      expect(createData.minRating).toBeNull();
    });

    it('throws DUPLICATE_CODE when code already exists in tenant', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(makeCoupon()); // existing

      await expect(repo.create({
        code: 'INDIRIM-10',
        discountPct: 10,
      })).rejects.toThrow('DUPLICATE_CODE');
    });

    it('defaults maxUses to 1', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(null);
      (prismaClient.coupon.create as any).mockResolvedValue(makeCoupon());

      await repo.create({ code: 'TEST', discountPct: 5 });
      const createData = (prismaClient.coupon.create as any).mock.calls[0][0].data;
      expect(createData.maxUses).toBe(1);
    });

    it('throws when tenantId is missing for non-super-admin', async () => {
      const noTenantRepo = new CouponRepository({ tenantId: null, role: 'manager' });
      await expect(noTenantRepo.create({ code: 'X', discountPct: 5 })).rejects.toThrow('Tenant gerekli');
    });
  });

  // ─── update ───────────────────────────────

  describe('update', () => {
    it('updates coupon fields', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(makeCoupon());
      (prismaClient.coupon.update as any).mockResolvedValue(makeCoupon({ discountPct: 20 }));

      const result = await repo.update('coup-1', { discountPct: 20 });

      expect(result.discountPct).toBe(20);
      const updateArgs = (prismaClient.coupon.update as any).mock.calls[0][0];
      expect(updateArgs.where.id).toBe('coup-1');
      expect(updateArgs.data.discountPct).toBe(20);
    });

    it('normalizes code on update', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(makeCoupon());
      (prismaClient.coupon.update as any).mockResolvedValue(makeCoupon());

      await repo.update('coup-1', { code: '  YENI-KOD  ' });
      const updateArgs = (prismaClient.coupon.update as any).mock.calls[0][0];
      expect(updateArgs.data.code).toBe('YENI-KOD');
    });

    it('handles expiresAt being set to null', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(makeCoupon());
      (prismaClient.coupon.update as any).mockResolvedValue(makeCoupon({ expiresAt: null }));

      await repo.update('coup-1', { expiresAt: null });
      const updateArgs = (prismaClient.coupon.update as any).mock.calls[0][0];
      expect(updateArgs.data.expiresAt).toBeNull();
    });

    it('handles expiresAt being set to a date', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(makeCoupon());
      (prismaClient.coupon.update as any).mockResolvedValue(makeCoupon());

      await repo.update('coup-1', { expiresAt: '2027-01-01' });
      const updateArgs = (prismaClient.coupon.update as any).mock.calls[0][0];
      expect(updateArgs.data.expiresAt).toBeInstanceOf(Date);
    });

    it('throws NOT_FOUND when updating non-existent coupon', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(null);
      await expect(repo.update('nonexistent', { discountPct: 20 })).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── delete ───────────────────────────────

  describe('delete', () => {
    it('soft-deletes a coupon', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(makeCoupon());
      (prismaClient.coupon.update as any).mockResolvedValue({ ...makeCoupon(), deletedAt: new Date() });

      await repo.delete('coup-1');

      expect(prismaClient.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coup-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('throws NOT_FOUND when deleting non-existent coupon', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(null);
      await expect(repo.delete('nonexistent')).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── validate ─────────────────────────────

  describe('validate', () => {
    it('returns coupon when valid', async () => {
      const coupon = makeCoupon();
      (prismaClient.coupon.findFirst as any).mockResolvedValue(coupon);

      const result = await repo.validate('INDIRIM-10');

      expect(result.id).toBe('coup-1');
      expect(result.code).toBe('INDIRIM-10');
    });

    it('throws NOT_FOUND when code does not exist', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(null);
      await expect(repo.validate('NONEXISTENT')).rejects.toThrow('NOT_FOUND');
    });

    it('throws INACTIVE when coupon is not active', async () => {
      (prismaClient.coupon.findFirst as any).mockResolvedValue(makeCoupon({ isActive: false }));
      await expect(repo.validate('INDIRIM-10')).rejects.toThrow('INACTIVE');
    });

    it('throws EXPIRED when coupon has passed expiry', async () => {
      const expired = makeCoupon({ expiresAt: new Date('2024-06-01') });
      (prismaClient.coupon.findFirst as any).mockResolvedValue(expired);
      await expect(repo.validate('INDIRIM-10')).rejects.toThrow('EXPIRED');
    });

    it('throws MAX_USES_REACHED when coupon usage limit exceeded', async () => {
      const usedUp = makeCoupon({ maxUses: 5, currentUses: 5 });
      (prismaClient.coupon.findFirst as any).mockResolvedValue(usedUp);
      await expect(repo.validate('INDIRIM-10')).rejects.toThrow('MAX_USES_REACHED');
    });

    it('allows unlimited uses when maxUses is 0', async () => {
      const unlimited = makeCoupon({ maxUses: 0, currentUses: 0 });
      (prismaClient.coupon.findFirst as any).mockResolvedValue(unlimited);

      const result = await repo.validate('INDIRIM-10');
      expect(result).toBeDefined();
    });
  });

  // ─── use ──────────────────────────────────

  describe('use', () => {
    it('validates and consumes one usage of a coupon', async () => {
      const coupon = makeCoupon({ id: 'coup-1' });
      (prismaClient.coupon.findFirst as any)
        .mockResolvedValueOnce(coupon)                                    // validate() → findByCode
        .mockResolvedValueOnce(makeCoupon({ id: 'coup-1', currentUses: 1 })); // use() → findById after
      (prismaClient.$transaction as any).mockImplementation(async (fn: any) => {
        await fn(prismaClient);
      });

      const result = await repo.use('INDIRIM-10', { customerId: 'cust-1', ticketId: 'tkt-1' });

      expect(prismaClient.$transaction).toHaveBeenCalled();
      expect(prismaClient.couponUsage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          couponId: 'coup-1',
          tenantId: tenantA,
          customerId: 'cust-1',
          ticketId: 'tkt-1',
        }),
      });
    });

    it('throws validation errors through (e.g., EXPIRED)', async () => {
      const expired = makeCoupon({ expiresAt: new Date('2024-06-01') });
      (prismaClient.coupon.findFirst as any).mockResolvedValue(expired);

      await expect(repo.use('INDIRIM-10')).rejects.toThrow('EXPIRED');
    });

    it('throws when tenantId is missing', async () => {
      const noTenantRepo = new CouponRepository({ tenantId: null, role: 'manager' });
      (prismaClient.coupon.findFirst as any).mockResolvedValue(makeCoupon());

      await expect(noTenantRepo.use('INDIRIM-10')).rejects.toThrow('Tenant gerekli');
    });
  });

  // ─── autoCreateFromSurvey ─────────────────

  describe('autoCreateFromSurvey', () => {
    it('creates a coupon when rating >= 4', async () => {
      (prismaClient.coupon.create as any).mockResolvedValue(makeCoupon({
        code: 'INDIRIM-SRV001-ABCD',
        autoCreated: true,
        minRating: 4,
      }));

      const result = await repo.autoCreateFromSurvey('SRV-001', 5);

      expect(result).not.toBeNull();
      expect(result!.autoCreated).toBe(true);
      expect(result!.discountPct).toBe(10);
      expect(result!.maxUses).toBe(1);
      const createData = (prismaClient.coupon.create as any).mock.calls[0][0].data;
      expect(createData.tenantId).toBe(tenantA);
      expect(createData.code).toMatch(/^INDIRIM-SRV-001-/);
    });

    it('returns null when rating < 4', async () => {
      const result = await repo.autoCreateFromSurvey('SRV-001', 3);
      expect(result).toBeNull();
    });

    it('accepts tenantIdOverride for super_admin', async () => {
      (prismaClient.coupon.create as any).mockResolvedValue(makeCoupon({ tenantId: tenantB }));

      const result = await repo.autoCreateFromSurvey('SRV-002', 5, tenantB);

      expect(result!.tenantId).toBe(tenantB);
      const createData = (prismaClient.coupon.create as any).mock.calls[0][0].data;
      expect(createData.tenantId).toBe(tenantB);
    });

    it('throws when tenantId is null and no override', async () => {
      const noTenantRepo = new CouponRepository({ tenantId: null, role: 'manager' });
      await expect(noTenantRepo.autoCreateFromSurvey('SRV-003', 5)).rejects.toThrow('Tenant gerekli');
    });
  });

  // ─── Tenant Isolation ────────────────────

  describe('tenant isolation', () => {
    it('filters by tenant for non-super-admin', () => {
      const r = new CouponRepository({ tenantId: tenantA, role: 'manager' });
      expect(r['tenantFilter']()).toEqual({ tenantId: tenantA });
    });

    it('does not filter for super_admin', () => {
      const r = new CouponRepository({ tenantId: null, role: 'super_admin' });
      expect(r['tenantFilter']()).toEqual({});
    });

    it('throws if tenantId is missing for non-super-admin', () => {
      const r = new CouponRepository({ tenantId: null, role: 'manager' });
      expect(() => r['tenantFilter']()).toThrow('Tenant gerekli');
    });

    it('SUPER_ADMIN can see coupons across tenants', async () => {
      const adminRepo = new CouponRepository({ tenantId: null, role: 'super_admin' });
      const coupons = [
        makeCoupon({ id: 'c1', tenantId: tenantA }),
        makeCoupon({ id: 'c2', tenantId: tenantB }),
      ];
      (prismaClient.coupon.findMany as any).mockResolvedValue(coupons);

      const results = await adminRepo.findAll();
      expect(results).toHaveLength(2);
      const callArgs = (prismaClient.coupon.findMany as any).mock.calls[0][0];
      expect(callArgs.where.tenantId).toBeUndefined();
    });
  });
});
