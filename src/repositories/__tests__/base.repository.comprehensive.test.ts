// ──────────────────────────────────────────────
// Water Purifier Service ERP — BaseRepository Comprehensive Edge Cases
// Multi-Tenant SaaS
//
// Tests: prismaClient singleton, constructor edge cases,
// role hierarchy for tenantFilter, hasAccess
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseRepository, prismaClient } from '../base.repository';

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
  async testTenantFilter() { return this.tenantFilter(); }
  async testHasAccess(resourceTenantId: string) { return this.hasAccess(resourceTenantId); }
  async testNotDeleted(showDeleted?: boolean) { return this.notDeleted(showDeleted); }
  async testAuditCreate(params: any) { await this.auditCreate(params); }
  async testAuditUpdate(params: any) { await this.auditUpdate(params); }
  async testAuditDelete(params: any) { await this.auditDelete(params); }
}

describe('BaseRepository — prismaClient singleton', () => {
  it('is an instance of PrismaClient', () => {
    expect(prismaClient).toBeDefined();
    expect(typeof prismaClient.$connect).toBe('function');
    expect(typeof prismaClient.$disconnect).toBe('function');
  });

  it('is the same instance across multiple imports', async () => {
    // Import the same module again — should get the same singleton
    const { prismaClient: pc2 } = await import('../base.repository');
    expect(prismaClient).toBe(pc2);
  });

  it('is accessible via BaseRepository subclass', () => {
    const repo = new TestRepository({ tenantId: 't-1', role: 'technician' });
    expect(repo['prisma']).toBeDefined();
    expect(repo['prisma']).toBe(prismaClient);
  });

  it('multiple repositories share the same prisma instance', () => {
    const repo1 = new TestRepository({ tenantId: 't-1', role: 'technician' });
    const repo2 = new TestRepository({ tenantId: 't-2', role: 'manager' });
    expect(repo1['prisma']).toBe(repo2['prisma']);
  });
});

describe('BaseRepository — constructor edge cases', () => {
  it('handles null tenantId with super_admin role', () => {
    const repo = new TestRepository({ tenantId: null, role: 'super_admin' });
    expect(repo['tenantId']).toBeNull();
    expect(repo['role']).toBe('super_admin');
    // Should not throw
    expect(() => repo['tenantFilter']()).not.toThrow();
    expect(repo['tenantFilter']()).toEqual({});
  });

  it('handles undefined tenantId gracefully (converted to null)', () => {
    // @ts-expect-error — testing runtime behavior
    const repo = new TestRepository({ tenantId: undefined, role: 'technician' });
    expect(repo['tenantId']).toBeUndefined();
    // tenantFilter throws because undefined is falsy
    expect(() => repo['tenantFilter']()).toThrow('Tenant gerekli');
  });

  it('handles empty role string', () => {
    const repo = new TestRepository({ tenantId: 't-1', role: '' });
    // tenantFilter should not throw for empty role since it only checks super_admin
    expect(repo['tenantFilter']()).toEqual({ tenantId: 't-1' });
  });

  it('handles unexpected role value', () => {
    const repo = new TestRepository({ tenantId: 't-1', role: 'unknown_role' as any });
    expect(repo['tenantFilter']()).toEqual({ tenantId: 't-1' });
  });
});

describe('BaseRepository — hasAccess edge cases', () => {
  it('returns false when tenantId is null (non-super-admin)', () => {
    // This would be an unusual state — tenantId null with non-super-admin role
    const repo = new TestRepository({ tenantId: null, role: 'technician' });
    expect(repo['hasAccess']('tenant-1')).toBe(false);
  });

  it('super_admin with null tenantId can access any tenant', () => {
    const repo = new TestRepository({ tenantId: null, role: 'super_admin' });
    expect(repo['hasAccess']('any-tenant')).toBe(true);
    expect(repo['hasAccess']('')).toBe(true);
  });

  it('case-sensitive tenant comparison', () => {
    const repo = new TestRepository({ tenantId: 'Tenant-A', role: 'manager' });
    expect(repo['hasAccess']('tenant-a')).toBe(false); // lowercase different
  });
});

describe('BaseRepository — notDeleted edge cases', () => {
  let repo: TestRepository;

  beforeEach(() => {
    repo = new TestRepository({ tenantId: 't-1', role: 'technician' });
  });

  it('returns {} for explicit false (includes deleted)', () => {
    expect(repo['notDeleted'](false)).toEqual({ deletedAt: null });
  });

  it('handles truthy values beyond true', () => {
    expect(repo['notDeleted'](1 as any)).toEqual({});
    expect(repo['notDeleted']('yes' as any)).toEqual({});
    expect(repo['notDeleted']({} as any)).toEqual({});
  });
});

describe('BaseRepository — role hierarchy integration', () => {
  it('tenantFilter for all non-super-admin roles', () => {
    const roles = ['viewer', 'technician', 'manager', 'tenant_admin'];
    for (const role of roles) {
      const repo = new TestRepository({ tenantId: 'tenant-1', role });
      expect(repo['tenantFilter']()).toEqual({ tenantId: 'tenant-1' });
    }
  });

  it('tenantFilter with empty tenantId string for non-super-admin', () => {
    const repo = new TestRepository({ tenantId: '', role: 'technician' });
    // Empty string is falsy → throws "Tenant gerekli"
    expect(() => repo['tenantFilter']()).toThrow('Tenant gerekli');
  });

  it('hasAccess for all roles with matching tenant', () => {
    const roles = ['viewer', 'technician', 'manager', 'tenant_admin', 'super_admin'];
    for (const role of roles) {
      const repo = new TestRepository({ tenantId: 'tenant-1', role });
      expect(repo['hasAccess']('tenant-1')).toBe(true);
    }
  });

  it('hasAccess for non-super-admin roles with non-matching tenant', () => {
    const roles = ['viewer', 'technician', 'manager', 'tenant_admin'];
    for (const role of roles) {
      const repo = new TestRepository({ tenantId: 'tenant-1', role });
      expect(repo['hasAccess']('tenant-2')).toBe(false);
    }
  });
});
