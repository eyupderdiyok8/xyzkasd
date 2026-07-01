// ──────────────────────────────────────────────
// Water Purifier Service ERP — BaseRepository Tests
// Multi-Tenant SaaS
//
// Tests: tenantFilter, hasAccess, notDeleted, audit helpers
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseRepository } from '../base.repository';

// ─── Mock AuditService ─────────────────────────

vi.mock('@/lib/audit.service', () => ({
  AuditService: {
    logCreate: vi.fn().mockResolvedValue(undefined),
    logUpdate: vi.fn().mockResolvedValue(undefined),
    logDelete: vi.fn().mockResolvedValue(undefined),
  },
}));

// ─── Concrete implementation for testing ──────

class TestRepository extends BaseRepository {
  async testTenantFilter() {
    return this.tenantFilter();
  }

  async testHasAccess(resourceTenantId: string) {
    return this.hasAccess(resourceTenantId);
  }

  async testNotDeleted(showDeleted?: boolean) {
    return this.notDeleted(showDeleted);
  }

  async testAuditCreate(params: {
    entity: string;
    entityId: string;
    newValues: Record<string, unknown>;
  }) {
    await this.auditCreate(params);
  }

  async testAuditUpdate(params: {
    entity: string;
    entityId: string;
    oldValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
  }) {
    await this.auditUpdate(params);
  }

  async testAuditDelete(params: {
    entity: string;
    entityId: string;
    deletedValues?: Record<string, unknown>;
  }) {
    await this.auditDelete(params);
  }
}

describe('BaseRepository', () => {
  // ─── tenantFilter ──────────────────────────

  describe('tenantFilter()', () => {
    it('returns tenantId filter for regular role', () => {
      const repo = new TestRepository({ tenantId: 'tenant-1', role: 'technician' });
      const filter = repo['tenantFilter']();
      expect(filter).toEqual({ tenantId: 'tenant-1' });
    });

    it('returns empty filter for super_admin', () => {
      const repo = new TestRepository({ tenantId: null, role: 'super_admin' });
      const filter = repo['tenantFilter']();
      expect(filter).toEqual({});
    });

    it('returns empty filter for super_admin even with tenantId set', () => {
      const repo = new TestRepository({ tenantId: 'tenant-1', role: 'super_admin' });
      const filter = repo['tenantFilter']();
      expect(filter).toEqual({});
    });

    it('throws error when tenantId is null for non-super-admin', () => {
      const repo = new TestRepository({ tenantId: null, role: 'technician' });
      expect(() => repo['tenantFilter']()).toThrow('Tenant gerekli');
    });

    it('throws error when tenantId is null for manager', () => {
      const repo = new TestRepository({ tenantId: null, role: 'manager' });
      expect(() => repo['tenantFilter']()).toThrow('Tenant gerekli');
    });

    it('throws error when tenantId is null for tenant_admin', () => {
      const repo = new TestRepository({ tenantId: null, role: 'tenant_admin' });
      expect(() => repo['tenantFilter']()).toThrow('Tenant gerekli');
    });

    it('throws error when tenantId is null for viewer', () => {
      const repo = new TestRepository({ tenantId: null, role: 'viewer' });
      expect(() => repo['tenantFilter']()).toThrow('Tenant gerekli');
    });
  });

  // ─── hasAccess ────────────────────────────

  describe('hasAccess()', () => {
    it('returns true for same tenant', () => {
      const repo = new TestRepository({ tenantId: 'tenant-1', role: 'technician' });
      expect(repo['hasAccess']('tenant-1')).toBe(true);
    });

    it('returns false for different tenant', () => {
      const repo = new TestRepository({ tenantId: 'tenant-1', role: 'technician' });
      expect(repo['hasAccess']('tenant-2')).toBe(false);
    });

    it('returns true for super_admin regardless of tenant', () => {
      const repo = new TestRepository({ tenantId: null, role: 'super_admin' });
      expect(repo['hasAccess']('any-tenant')).toBe(true);
    });

    it('returns true for super_admin with specific tenant', () => {
      const repo = new TestRepository({ tenantId: 'tenant-1', role: 'super_admin' });
      expect(repo['hasAccess']('tenant-2')).toBe(true);
    });

    it('returns false for viewer with mismatched tenant', () => {
      const repo = new TestRepository({ tenantId: 'tenant-1', role: 'viewer' });
      expect(repo['hasAccess']('other-tenant')).toBe(false);
    });
  });

  // ─── notDeleted ──────────────────────────

  describe('notDeleted()', () => {
    it('returns { deletedAt: null } when showDeleted is false', () => {
      const repo = new TestRepository({ tenantId: 'tenant-1', role: 'technician' });
      expect(repo['notDeleted'](false)).toEqual({ deletedAt: null });
    });

    it('returns { deletedAt: null } when showDeleted is undefined', () => {
      const repo = new TestRepository({ tenantId: 'tenant-1', role: 'technician' });
      expect(repo['notDeleted']()).toEqual({ deletedAt: null });
    });

    it('returns {} when showDeleted is true', () => {
      const repo = new TestRepository({ tenantId: 'tenant-1', role: 'technician' });
      expect(repo['notDeleted'](true)).toEqual({});
    });
  });

  // ─── Constructor ─────────────────────────

  describe('constructor', () => {
    it('stores tenantId, role, userId, ipAddress', () => {
      const repo = new TestRepository({
        tenantId: 'tenant-1',
        role: 'manager',
        userId: 'user-1',
        ipAddress: '192.168.1.1',
      });
      expect(repo['tenantId']).toBe('tenant-1');
      expect(repo['role']).toBe('manager');
      expect(repo['userId']).toBe('user-1');
      expect(repo['ipAddress']).toBe('192.168.1.1');
    });

    it('defaults userId and ipAddress to null', () => {
      const repo = new TestRepository({ tenantId: 'tenant-1', role: 'technician' });
      expect(repo['userId']).toBeNull();
      expect(repo['ipAddress']).toBeNull();
    });

    it('converts undefined userId to null', () => {
      const repo = new TestRepository({ tenantId: 't-1', role: 'technician', userId: undefined });
      expect(repo['userId']).toBeNull();
    });
  });

  // ─── Audit Helpers ──────────────────────

  describe('auditCreate()', () => {
    let repo: TestRepository;

    beforeEach(() => {
      vi.clearAllMocks();
      repo = new TestRepository({ tenantId: 'tenant-1', role: 'manager', userId: 'user-1', ipAddress: '10.0.0.1' });
    });

    it('logs a CREATE audit entry', async () => {
      const { AuditService } = await import('@/lib/audit.service');
      const params = { entity: 'device', entityId: 'dev-1', newValues: { serialNo: 'SN-001' } };
      await repo['auditCreate'](params);
      expect(AuditService.logCreate).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        userId: 'user-1',
        ipAddress: '10.0.0.1',
        ...params,
      });
    });
  });

  describe('auditUpdate()', () => {
    let repo: TestRepository;

    beforeEach(() => {
      vi.clearAllMocks();
      repo = new TestRepository({ tenantId: 'tenant-1', role: 'manager', userId: 'user-1' });
    });

    it('logs an UPDATE audit entry', async () => {
      const { AuditService } = await import('@/lib/audit.service');
      const params = {
        entity: 'device',
        entityId: 'dev-1',
        oldValues: { status: 'ACTIVE' },
        newValues: { status: 'PASSIVE' },
      };
      await repo['auditUpdate'](params);
      expect(AuditService.logUpdate).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        userId: 'user-1',
        ipAddress: null,
        ...params,
      });
    });
  });

  describe('auditDelete()', () => {
    let repo: TestRepository;

    beforeEach(() => {
      vi.clearAllMocks();
      repo = new TestRepository({ tenantId: 'tenant-1', role: 'manager', userId: 'user-1' });
    });

    it('logs a DELETE audit entry', async () => {
      const { AuditService } = await import('@/lib/audit.service');
      const params = { entity: 'device', entityId: 'dev-1', deletedValues: { serialNo: 'SN-001' } };
      await repo['auditDelete'](params);
      expect(AuditService.logDelete).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        userId: 'user-1',
        ipAddress: null,
        ...params,
      });
    });

    it('logs a DELETE audit entry without deletedValues', async () => {
      const { AuditService } = await import('@/lib/audit.service');
      const params = { entity: 'device', entityId: 'dev-1' };
      await repo['auditDelete'](params);
      expect(AuditService.logDelete).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        userId: 'user-1',
        ipAddress: null,
        ...params,
      });
    });
  });

  // ─── prismaClient singleton ────────────

  describe('prismaClient', () => {
    it('is accessible from BaseRepository', () => {
      const repo = new TestRepository({ tenantId: 't-1', role: 'technician' });
      expect(repo['prisma']).toBeDefined();
    });
  });
});
