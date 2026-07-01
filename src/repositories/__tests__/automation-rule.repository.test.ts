// ──────────────────────────────────────────────
// Water Purifier Service ERP — AutomationRule Repository Tests
// Multi-Tenant SaaS
//
// Tests for CRUD, toggle, findByTrigger, and tenant isolation.
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutomationRuleRepository } from '../automation-rule.repository';

// ─── Mock Prisma ──────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  automationRule: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  automationLog: {
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
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

function mockRule(overrides: Record<string, any> = {}) {
  return {
    id: 'rule-1',
    tenantId: 'tenant-1',
    name: 'Test Rule',
    description: 'A test automation rule',
    trigger: 'service.completed',
    conditions: JSON.stringify([{ field: 'data.status', operator: 'eq', value: 'COMPLETED' }]),
    actions: JSON.stringify([{ type: 'sendMessage', params: { channel: 'WHATSAPP', templateId: 'tmpl-1', to: '+905551234567' } }]),
    isActive: true,
    priority: 10,
    cooldownMin: 0,
    lastFiredAt: null,
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────

describe('AutomationRuleRepository', () => {
  let repo: AutomationRuleRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new AutomationRuleRepository({ tenantId: 'tenant-1', role: 'admin' });
  });

  // ─── findAll ────────────────────────────────────

  describe('findAll', () => {
    it('returns all active rules by default', async () => {
      mockPrisma.automationRule.findMany.mockResolvedValue([
        mockRule(),
        mockRule({ id: 'rule-2', name: 'Rule 2', priority: 5 }),
      ]);

      const rules = await repo.findAll();

      expect(rules).toHaveLength(2);
      expect(mockPrisma.automationRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isActive: true, deletedAt: null }),
        }),
      );
    });

    it('includes inactive rules when includeInactive=true', async () => {
      mockPrisma.automationRule.findMany.mockResolvedValue([
        mockRule(),
        mockRule({ id: 'rule-2', isActive: false }),
      ]);

      const rules = await repo.findAll(true);
      expect(rules).toHaveLength(2);
    });

    it('parses conditions and actions from JSON strings', async () => {
      mockPrisma.automationRule.findMany.mockResolvedValue([mockRule()]);

      const rules = await repo.findAll();
      expect(Array.isArray(rules[0].conditions)).toBe(true);
      expect(Array.isArray(rules[0].actions)).toBe(true);
      expect(rules[0].conditions[0]).toHaveProperty('field');
      expect(rules[0].actions[0]).toHaveProperty('type');
    });

    it('orders by priority desc then createdAt asc', async () => {
      mockPrisma.automationRule.findMany.mockResolvedValue([]);

      await repo.findAll();

      expect(mockPrisma.automationRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        }),
      );
    });
  });

  // ─── findByTrigger ──────────────────────────────

  describe('findByTrigger', () => {
    it('returns only active rules for the given trigger', async () => {
      mockPrisma.automationRule.findMany.mockResolvedValue([
        mockRule(),
      ]);

      const rules = await repo.findByTrigger('service.completed');

      expect(rules).toHaveLength(1);
      expect(mockPrisma.automationRule.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            trigger: 'service.completed',
            isActive: true,
            deletedAt: null,
          }),
        }),
      );
    });

    it('returns empty array when no matching trigger', async () => {
      mockPrisma.automationRule.findMany.mockResolvedValue([]);

      const rules = await repo.findByTrigger('customer.created');
      expect(rules).toHaveLength(0);
    });
  });

  // ─── findById ───────────────────────────────────

  describe('findById', () => {
    it('returns rule when it exists and belongs to tenant', async () => {
      mockPrisma.automationRule.findFirst.mockResolvedValue(mockRule());

      const rule = await repo.findById('rule-1');
      expect(rule.id).toBe('rule-1');
    });

    it('throws NOT_FOUND when rule does not exist', async () => {
      mockPrisma.automationRule.findFirst.mockResolvedValue(null);

      await expect(repo.findById('nonexistent')).rejects.toThrow('NOT_FOUND');
    });

    it('throws NOT_FOUND when rule belongs to different tenant', async () => {
      mockPrisma.automationRule.findFirst.mockResolvedValue(null);

      await expect(repo.findById('other-tenant-rule')).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── create ────────────────────────────────────

  describe('create', () => {
    it('creates a new automation rule', async () => {
      mockPrisma.automationRule.create.mockResolvedValue(mockRule());

      const rule = await repo.create({
        name: 'Test Rule',
        description: 'A test',
        trigger: 'service.completed',
        conditions: [{ field: 'data.status', operator: 'eq', value: 'COMPLETED' }],
        actions: [{ type: 'sendMessage', params: { channel: 'WHATSAPP', templateId: 'tmpl-1', to: '+905551234567' } }],
        isActive: true,
        priority: 10,
        cooldownMin: 0,
      });

      expect(rule.id).toBe('rule-1');
      expect(mockPrisma.automationRule.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            name: 'Test Rule',
            trigger: 'service.completed',
          }),
        }),
      );
    });

    it('throws when no tenant context', async () => {
      const noTenantRepo = new AutomationRuleRepository({ tenantId: null, role: 'admin' });
      await expect(noTenantRepo.create({
        name: 'Test',
        trigger: 'service.completed',
        actions: [{ type: 'sendMessage', params: {} }],
      })).rejects.toThrow('Tenant gerekli');
    });

    it('serializes conditions and actions as JSON', async () => {
      mockPrisma.automationRule.create.mockResolvedValue(mockRule());

      await repo.create({
        name: 'Test Rule',
        trigger: 'service.completed',
        conditions: [{ field: 'x', operator: 'eq', value: 'y' }],
        actions: [{ type: 'wait', params: { amount: 5, unit: 'minutes' } }],
      });

      const callData = mockPrisma.automationRule.create.mock.calls[0][0].data;
      expect(typeof callData.conditions).toBe('string');
      expect(typeof callData.actions).toBe('string');
      expect(JSON.parse(callData.conditions)).toEqual([{ field: 'x', operator: 'eq', value: 'y' }]);
    });
  });

  // ─── update ────────────────────────────────────

  describe('update', () => {
    it('updates rule fields', async () => {
      mockPrisma.automationRule.findFirst.mockResolvedValue(mockRule());
      mockPrisma.automationRule.update.mockResolvedValue(mockRule({ name: 'Updated Rule' }));

      const updated = await repo.update('rule-1', { name: 'Updated Rule' });
      expect(updated.name).toBe('Updated Rule');
    });

    it('only updates provided fields', async () => {
      mockPrisma.automationRule.findFirst.mockResolvedValue(mockRule());
      mockPrisma.automationRule.update.mockResolvedValue(mockRule());

      await repo.update('rule-1', { priority: 20 });

      const callData = mockPrisma.automationRule.update.mock.calls[0][0].data;
      expect(callData.priority).toBe(20);
      expect(callData.name).toBeUndefined(); // not in update payload
    });
  });

  // ─── toggleActive ──────────────────────────────

  describe('toggleActive', () => {
    it('enables a rule', async () => {
      mockPrisma.automationRule.findFirst.mockResolvedValue(mockRule());
      mockPrisma.automationRule.update.mockResolvedValue(mockRule({ isActive: true }));

      await repo.toggleActive('rule-1', true);
      expect(mockPrisma.automationRule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rule-1' },
          data: { isActive: true },
        }),
      );
    });

    it('disables a rule', async () => {
      mockPrisma.automationRule.findFirst.mockResolvedValue(mockRule());
      mockPrisma.automationRule.update.mockResolvedValue(mockRule({ isActive: false }));

      await repo.toggleActive('rule-1', false);
      expect(mockPrisma.automationRule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rule-1' },
          data: { isActive: false },
        }),
      );
    });

    it('throws NOT_FOUND when toggling nonexistent rule', async () => {
      mockPrisma.automationRule.findFirst.mockResolvedValue(null);

      await expect(repo.toggleActive('nonexistent', true)).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── delete ─────────────────────────────────────

  describe('delete', () => {
    it('soft-deletes a rule by setting deletedAt', async () => {
      mockPrisma.automationRule.findFirst.mockResolvedValue(mockRule());
      mockPrisma.automationRule.update.mockResolvedValue(mockRule({ deletedAt: new Date() }));

      await repo.delete('rule-1');

      expect(mockPrisma.automationRule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rule-1' },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });
  });

  // ─── markFired ──────────────────────────────────

  describe('markFired', () => {
    it('updates lastFiredAt timestamp', async () => {
      mockPrisma.automationRule.update.mockResolvedValue(mockRule({ lastFiredAt: new Date() }));

      await repo.markFired('rule-1');

      expect(mockPrisma.automationRule.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rule-1' },
          data: { lastFiredAt: expect.any(Date) },
        }),
      );
    });
  });
});
