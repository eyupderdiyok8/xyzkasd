// ──────────────────────────────────────────────
// Water Purifier Service ERP — Automation Engine Tests
// Multi-Tenant SaaS
//
// Unit tests for condition evaluation, cooldown,
// action executors, and full trigger flow.
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AutomationEngine } from '../automation-engine.service';
import type { AutomationTrigger, Condition, TriggerContext } from '../types';

// ─── Mock Prisma ──────────────────────────────────

const mockPrisma = {
  automationRule: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  automationLog: { create: vi.fn() },
  messageTemplate: { findUnique: vi.fn() },
  serviceSurvey: { create: vi.fn() },
  serviceTicket: { create: vi.fn() },
  technician: { findUnique: vi.fn() },
  $executeRawUnsafe: vi.fn(),
};

const mockRuleEntity = {
  id: 'rule-1',
  tenantId: 'tenant-1',
  name: 'Test Rule',
  description: null,
  trigger: 'service.completed' as AutomationTrigger,
  conditions: [] as Condition[],
  actions: [{ type: 'sendMessage' as const, params: { channel: 'WHATSAPP', templateId: 'tmpl-1', to: '+905551234567' } }],
  isActive: true,
  priority: 10,
  cooldownMin: 0,
  lastFiredAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRuleEntity(overrides: Record<string, any> = {}) {
  return { ...mockRuleEntity, ...overrides };
}

vi.mock('@/repositories/base.repository', () => {
  return {
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

/** Create a mock rule repo instance with controllable findByName */
function createMockRuleRepo(findByTriggerImpl?: (trigger: string) => any[]) {
  const defaultFindByTrigger = vi.fn().mockImplementation(
    (trigger: string) => findByTriggerImpl ? findByTriggerImpl(trigger) : [makeRuleEntity()],
  );
  return {
    findAll: vi.fn().mockResolvedValue([]),
    findByTrigger: defaultFindByTrigger,
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    toggleActive: vi.fn(),
    delete: vi.fn(),
    markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
  };
}

vi.mock('@/repositories/automation-rule.repository', () => ({
  AutomationRuleRepository: class {
    findAll = vi.fn().mockResolvedValue([]);
    findByTrigger = vi.fn().mockResolvedValue([makeRuleEntity()]);
    findById = vi.fn();
    create = vi.fn();
    update = vi.fn();
    toggleActive = vi.fn();
    delete = vi.fn();
    markFired = vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() });
  },
}));

vi.mock('@/lib/messaging', () => ({
  MessagingFactory: {
    create: vi.fn(() => ({
      sendMessage: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
      sendTemplate: vi.fn().mockResolvedValue({ success: true, messageId: 'msg-1' }),
      sendBulk: vi.fn().mockResolvedValue({ success: 1, failed: 0, errors: [] }),
    })),
    reset: vi.fn(),
  },
  renderTemplate: vi.fn((template: string) => template),
}));

// ─── Helper ───────────────────────────────────────

function makeContext(overrides: Partial<TriggerContext> = {}): TriggerContext {
  return {
    trigger: 'service.completed',
    timestamp: new Date(),
    tenantId: 'tenant-1',
    entityType: 'service_ticket',
    entityId: 'ticket-1',
    data: { customerName: 'Ahmet', status: 'COMPLETED' },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────

describe('AutomationEngine', () => {
  let engine: AutomationEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new AutomationEngine({ tenantId: 'tenant-1', role: 'admin' });
    mockPrisma.automationLog.create.mockResolvedValue({ id: 'log-1' });
    mockPrisma.messageTemplate.findUnique.mockResolvedValue({
      id: 'tmpl-1', tenantId: 'tenant-1', name: 'Test', content: 'Hello {{customer_name}}',
      variables: '["customer_name"]', isActive: true, createdAt: new Date(), updatedAt: new Date(),
    });
  });

  // ─── fireTrigger — flow ─────────────────────────

  describe('fireTrigger', () => {
    it('returns TriggerFireResult with matched rules', async () => {
      const result = await engine.fireTrigger(makeContext());
      expect(result.trigger).toBe('service.completed');
      expect(result.rulesMatched).toBe(1);
      expect(result.rulesExecuted).toHaveLength(1);
    });

    it('returns empty rulesExecuted when no matching rules', async () => {
      // Replace the engine's ruleRepo with one returning empty
      const mockRepo = createMockRuleRepo(() => []);
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext({ trigger: 'customer.created' }));
      expect(result.rulesMatched).toBe(0);
      expect(result.rulesExecuted).toHaveLength(0);
    });

    it('handles errors gracefully for individual rule failures', async () => {
      mockPrisma.automationLog.create.mockRejectedValueOnce(new Error('DB error'));

      const result = await engine.fireTrigger(makeContext());
      expect(result.rulesExecuted).toHaveLength(1);
      expect(result.rulesExecuted[0].error).toBeDefined();
    });
  });

  // ─── Condition evaluation ──────────────────────

  describe('condition evaluation', () => {
    function withConditions(conditions: Condition[]) {
      const mockRepo = createMockRuleRepo(() => [makeRuleEntity({ conditions })]);
      (engine as any).ruleRepo = mockRepo;
    }

    it('returns conditionsMet=true when no conditions (always match)', async () => {
      const result = await engine.fireTrigger(makeContext());
      expect(result.rulesExecuted[0].conditionsMet).toBe(true);
    });

    it('returns conditionsMet=false when condition fails', async () => {
      withConditions([{ field: 'data.status', operator: 'eq', value: 'CANCELLED' }]);
      const result = await engine.fireTrigger(makeContext({ data: { status: 'COMPLETED' } }));
      expect(result.rulesExecuted[0].conditionsMet).toBe(false);
    });

    it('supports eq operator', async () => {
      withConditions([{ field: 'data.status', operator: 'eq', value: 'COMPLETED' }]);
      const result = await engine.fireTrigger(makeContext({ data: { status: 'COMPLETED' } }));
      expect(result.rulesExecuted[0].conditionsMet).toBe(true);
    });

    it('supports neq operator', async () => {
      withConditions([{ field: 'data.status', operator: 'neq', value: 'CANCELLED' }]);
      const result = await engine.fireTrigger(makeContext({ data: { status: 'COMPLETED' } }));
      expect(result.rulesExecuted[0].conditionsMet).toBe(true);
    });

    it('supports contains operator on string', async () => {
      withConditions([{ field: 'data.note', operator: 'contains', value: 'acil' }]);
      const result = await engine.fireTrigger(makeContext({ data: { note: 'Acil durum' } }));
      expect(result.rulesExecuted[0].conditionsMet).toBe(true);
    });

    it('supports gt operator', async () => {
      withConditions([{ field: 'data.priority', operator: 'gt', value: 3 }]);
      const result = await engine.fireTrigger(makeContext({ data: { priority: 5 } }));
      expect(result.rulesExecuted[0].conditionsMet).toBe(true);
    });

    it('supports gte operator (equal and greater)', async () => {
      withConditions([{ field: 'data.score', operator: 'gte', value: 4 }]);
      let result = await engine.fireTrigger(makeContext({ data: { score: 4 } }));
      expect(result.rulesExecuted[0].conditionsMet).toBe(true);

      result = await engine.fireTrigger(makeContext({ data: { score: 5 } }));
      expect(result.rulesExecuted[0].conditionsMet).toBe(true);
    });

    it('supports lt operator', async () => {
      withConditions([{ field: 'data.score', operator: 'lt', value: 3 }]);
      const result = await engine.fireTrigger(makeContext({ data: { score: 2 } }));
      expect(result.rulesExecuted[0].conditionsMet).toBe(true);
    });

    it('supports lte operator', async () => {
      withConditions([{ field: 'data.score', operator: 'lte', value: 2 }]);
      const result = await engine.fireTrigger(makeContext({ data: { score: 2 } }));
      expect(result.rulesExecuted[0].conditionsMet).toBe(true);
    });

    it('supports in operator', async () => {
      withConditions([{ field: 'data.status', operator: 'in', value: ['PENDING', 'ASSIGNED'] }]);
      const result = await engine.fireTrigger(makeContext({ data: { status: 'ASSIGNED' } }));
      expect(result.rulesExecuted[0].conditionsMet).toBe(true);
    });

    it('supports nin operator', async () => {
      withConditions([{ field: 'data.status', operator: 'nin', value: ['CANCELLED', 'COMPLETED'] }]);
      const result = await engine.fireTrigger(makeContext({ data: { status: 'PENDING' } }));
      expect(result.rulesExecuted[0].conditionsMet).toBe(true);
    });

    it('supports exists operator', async () => {
      withConditions([{ field: 'data.technicianNote', operator: 'exists', value: '' }]);
      const result = await engine.fireTrigger(makeContext({ data: { technicianNote: 'Not var' } }));
      expect(result.rulesExecuted[0].conditionsMet).toBe(true);
    });

    it('supports notExists operator', async () => {
      withConditions([{ field: 'data.technicianNote', operator: 'notExists', value: '' }]);
      const result = await engine.fireTrigger(makeContext({ data: {} }));
      expect(result.rulesExecuted[0].conditionsMet).toBe(true);
    });

    it('evaluates multiple conditions with AND logic', async () => {
      // All conditions met
      withConditions([
        { field: 'data.status', operator: 'eq', value: 'COMPLETED' },
        { field: 'data.customerName', operator: 'exists', value: '' },
      ]);
      let result = await engine.fireTrigger(makeContext({ data: { status: 'COMPLETED', customerName: 'Ahmet' } }));
      expect(result.rulesExecuted[0].conditionsMet).toBe(true);

      // One condition fails
      withConditions([
        { field: 'data.status', operator: 'eq', value: 'COMPLETED' },
        { field: 'data.extraField', operator: 'exists', value: '' },
      ]);
      result = await engine.fireTrigger(makeContext({ data: { status: 'COMPLETED' } }));
      expect(result.rulesExecuted[0].conditionsMet).toBe(false);
    });
  });

  // ─── Active/Inactive rules ──────────────────────

  describe('rule active state', () => {
    it('skips inactive rules', async () => {
      const mockRepo = createMockRuleRepo(() => [makeRuleEntity({ isActive: false })]);
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext());
      expect(result.rulesExecuted[0].conditionsMet).toBe(false);
      expect(result.rulesExecuted[0].actionsExecuted).toBe(0);
    });
  });

  // ─── Action execution ────────────────────────────

  describe('action execution', () => {
    function withActions(actions: any[]) {
      const mockRepo = createMockRuleRepo(() => [makeRuleEntity({ actions })]);
      (engine as any).ruleRepo = mockRepo;
    }

    it('executes sendMessage action with template', async () => {
      mockPrisma.messageTemplate.findUnique.mockResolvedValue({
        id: 'tmpl-1', content: 'Merhaba {{customer_name}}',
        variables: '["customer_name"]', isActive: true,
        name: 'Test', tenantId: 'tenant-1', createdAt: new Date(), updatedAt: new Date(),
      });
      withActions([{ type: 'sendMessage', params: { channel: 'WHATSAPP', templateId: 'tmpl-1', to: '+905551234567' } }]);

      const result = await engine.fireTrigger(makeContext({ data: { customerName: 'Ahmet' } }));
      expect(result.rulesExecuted[0].actionsExecuted).toBe(1);
    });

    it('reports failure for unknown action type', async () => {
      withActions([{ type: 'nonexistent' as any, params: {} }]);

      const result = await engine.fireTrigger(makeContext());
      expect(result.rulesExecuted[0].actionsFailed).toBe(1);
      expect(result.rulesExecuted[0].actionsExecuted).toBe(0);
    });

    it('executes multiple actions sequentially', async () => {
      withActions([
        { type: 'wait', params: { amount: 0, unit: 'minutes' } },
        { type: 'sendMessage', params: { channel: 'WHATSAPP', templateId: 'tmpl-1', to: '+905551234567' } },
        { type: 'sendSurvey', params: { to: '+905551234567' } },
      ]);

      const result = await engine.fireTrigger(makeContext());
      expect(result.rulesExecuted[0].actionsExecuted).toBe(3);
      expect(result.rulesExecuted[0].actionsFailed).toBe(0);
    });

    it('executes createTicket action', async () => {
      mockPrisma.serviceTicket.create.mockResolvedValue({ id: 'new-ticket', ticketNo: 'AUTO-XXXX' });
      withActions([{ type: 'createTicket', params: { issueDesc: 'Auto created', deviceIdPath: 'data.deviceId', customerIdPath: 'data.customerId' } }]);

      const result = await engine.fireTrigger(makeContext({ data: { deviceId: 'device-1', customerId: 'cust-1' } }));
      expect(result.rulesExecuted[0].actionsExecuted).toBe(1);
      expect(mockPrisma.serviceTicket.create).toHaveBeenCalled();
    });

    it('executes webhook action', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: true });

      withActions([{ type: 'webhook', params: { url: 'https://example.com/hook', method: 'POST' } }]);
      const result = await engine.fireTrigger(makeContext());
      expect(result.rulesExecuted[0].actionsExecuted).toBe(1);

      globalThis.fetch = originalFetch;
    });
  });
});
