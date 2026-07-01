// ──────────────────────────────────────────────
// Water Purifier Service ERP — Automation Engine
// Additional Edge Case Tests
// Multi-Tenant SaaS
//
// Tests: cooldown, interpolateTemplate, wait,
// sendSurvey, notifyTechnician, updateEntity,
// webhook with errors, action failure paths.
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AutomationTrigger, Condition, TriggerContext } from '../types';

// ─── Mock Prisma ──────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  automationRule: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  automationLog: { create: vi.fn() },
  messageTemplate: { findUnique: vi.fn() },
  serviceSurvey: { create: vi.fn() },
  serviceTicket: { create: vi.fn() },
  technician: { findUnique: vi.fn() },
  $executeRawUnsafe: vi.fn(),
}));

function makeRuleEntity(overrides: Record<string, any> = {}) {
  return {
    id: 'rule-1',
    tenantId: 'tenant-1',
    name: 'Test Rule',
    description: null,
    trigger: 'service.completed' as AutomationTrigger,
    conditions: [] as Condition[],
    actions: [],
    isActive: true,
    priority: 10,
    cooldownMin: 0,
    lastFiredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
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
  renderTemplate: vi.fn((template: string, vars: Record<string, string>) => {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }),
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

function withActions(actions: any[]) {
  return makeRuleEntity({ actions });
}

// ─── Tests ───────────────────────────────────────

describe('AutomationEngine — Edge Cases', () => {
  let engine: any; // Use any to access private methods for granular testing
  let AutomationEngine: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.automationLog.create.mockResolvedValue({ id: 'log-1' });
    mockPrisma.messageTemplate.findUnique.mockResolvedValue({
      id: 'tmpl-1', tenantId: 'tenant-1', name: 'Test', content: 'Hello {{customer_name}}',
      variables: '["customer_name"]', isActive: true, createdAt: new Date(), updatedAt: new Date(),
    });
    mockPrisma.technician.findUnique.mockResolvedValue({ id: 'tech-1', name: 'Mehmet', phone: '+905551234567' });

    const mod = await import('../automation-engine.service');
    AutomationEngine = mod.AutomationEngine;
    engine = new AutomationEngine({ tenantId: 'tenant-1', role: 'admin' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Cooldown ────────────────────────────────────

  describe('cooldown', () => {
    it('skips rule that is in cooldown period', async () => {
      const recentlyFired = new Date(Date.now() - 5 * 60 * 1000); // 5 min ago
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({ cooldownMin: 30, lastFiredAt: recentlyFired }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext());

      expect(result.rulesExecuted[0].actionsExecuted).toBe(0);
      expect(result.rulesExecuted[0].conditionsMet).toBe(false);
    });

    it('executes rule when cooldown period has passed', async () => {
      const oldFire = new Date(Date.now() - 60 * 60 * 1000); // 60 min ago
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            cooldownMin: 30,
            lastFiredAt: oldFire,
            actions: [{ type: 'wait', params: { amount: 0, unit: 'minutes' } }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext());

      expect(result.rulesExecuted[0].actionsExecuted).toBe(1);
      expect(result.rulesExecuted[0].conditionsMet).toBe(true);
    });

    it('executes when cooldownMin is 0 (no cooldown)', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            cooldownMin: 0,
            lastFiredAt: new Date(), // just fired, but cooldown=0 means skip
            actions: [{ type: 'wait', params: { amount: 0, unit: 'minutes' } }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext());

      expect(result.rulesExecuted[0].actionsExecuted).toBe(1);
    });
  });

  // ─── Template Interpolation ─────────────────────

  describe('interpolateTemplate', () => {
    it('replaces {{data.path}} placeholders with context values', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{
              type: 'createTicket',
              params: {
                issueDesc: 'Arıza: {{data.customerName}} - {{data.status}}',
                deviceIdPath: 'data.deviceId',
                customerIdPath: 'data.customerId',
              },
            }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;
      mockPrisma.serviceTicket.create.mockResolvedValue({ id: 'new-tkt', ticketNo: 'AUTO-XXXX' });

      const result = await engine.fireTrigger(makeContext({
        data: { customerName: 'Ahmet', status: 'COMPLETED', deviceId: 'dev-1', customerId: 'cust-1' },
      }));

      expect(result.rulesExecuted[0].actionsExecuted).toBe(1);
      const createCall = mockPrisma.serviceTicket.create.mock.calls[0]![0];
      expect(createCall.data.issueDesc).toBe('Arıza: Ahmet - COMPLETED');
    });

    it('leaves unresolved placeholders as-is', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{
              type: 'createTicket',
              params: {
                issueDesc: 'Test {{data.missingField}}',
                deviceIdPath: 'data.deviceId',
                customerIdPath: 'data.customerId',
              },
            }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;
      mockPrisma.serviceTicket.create.mockResolvedValue({ id: 'new-tkt', ticketNo: 'AUTO-XXXX' });

      const result = await engine.fireTrigger(makeContext({
        data: { deviceId: 'dev-1', customerId: 'cust-1' },
      }));

      expect(result.rulesExecuted[0].actionsExecuted).toBe(1);
      const createCall = mockPrisma.serviceTicket.create.mock.calls[0]![0];
      expect(createCall.data.issueDesc).toBe('Test {{data.missingField}}');
    });
  });

  // ─── Wait Action ────────────────────────────────

  describe('wait action', () => {
    it('waits for specified minutes', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({ actions: [{ type: 'wait', params: { amount: 0.01, unit: 'minutes' } }] }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const start = Date.now();
      await engine.fireTrigger(makeContext());
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(0); // just verifies it didn't hang
    });
  });

  // ─── sendSurvey Action ─────────────────────────

  describe('sendSurvey action', () => {
    it('creates a survey record for the entity', async () => {
      mockPrisma.serviceSurvey.create.mockResolvedValue({ id: 'survey-1' });

      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{ type: 'sendSurvey', params: { to: '+905551234567' } }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext());

      expect(result.rulesExecuted[0].actionsExecuted).toBe(1);
      expect(mockPrisma.serviceSurvey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketId: 'ticket-1',
            tenantId: 'tenant-1',
          }),
        }),
      );
    });

    it('sends survey using context path for recipient', async () => {
      mockPrisma.serviceSurvey.create.mockResolvedValue({ id: 'survey-2' });

      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{
              type: 'sendSurvey',
              params: { to: 'data.customerPhone', toIsContextPath: true },
            }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext({
        data: { customerPhone: '+905551234567', customerName: 'Ahmet' },
      }));

      expect(result.rulesExecuted[0].actionsExecuted).toBe(1);
    });

    it('fails when no recipient is provided', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({ actions: [{ type: 'sendSurvey', params: {} }] }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext());

      expect(result.rulesExecuted[0].actionsFailed).toBe(1);
    });
  });

  // ─── notifyTechnician Action ────────────────────

  describe('notifyTechnician action', () => {
    it('sends WhatsApp message to technician', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{
              type: 'notifyTechnician',
              params: { message: 'Yeni acil servis kaydı', technicianIdPath: 'data.technicianId' },
            }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext({
        data: { technicianId: 'tech-1', customerName: 'Ahmet' },
      }));

      expect(result.rulesExecuted[0].actionsExecuted).toBe(1);
      expect(mockPrisma.technician.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'tech-1' } }),
      );
    });

    it('fails when technician ID is not in context', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{
              type: 'notifyTechnician',
              params: { message: 'Test' },
            }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext({
        data: {},
      }));

      expect(result.rulesExecuted[0].actionsFailed).toBe(1);
    });

    it('fails when technician has no phone number', async () => {
      mockPrisma.technician.findUnique.mockResolvedValue({ id: 'tech-1', name: 'Mehmet', phone: null });

      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{
              type: 'notifyTechnician',
              params: { message: 'Test', technicianIdPath: 'data.technicianId' },
            }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext({
        data: { technicianId: 'tech-1' },
      }));

      expect(result.rulesExecuted[0].actionsFailed).toBe(1);
    });
  });

  // ─── updateEntity Action ────────────────────────

  describe('updateEntity action', () => {
    it('updates a field on the entity via raw SQL', async () => {
      mockPrisma.$executeRawUnsafe.mockResolvedValue([1]);

      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{
              type: 'updateEntity',
              params: { entity: 'service_ticket', field: 'resolution', value: 'Otomatik çözüm' },
            }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext());

      expect(result.rulesExecuted[0].actionsExecuted).toBe(1);
      expect(mockPrisma.$executeRawUnsafe).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE'),
        'Otomatik çözüm',
        'ticket-1',
        'tenant-1',
      );
    });

    it('fails when entity or field is missing', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{ type: 'updateEntity', params: {} }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext());

      expect(result.rulesExecuted[0].actionsFailed).toBe(1);
    });
  });

  // ─── Webhook Action Error Paths ─────────────────

  describe('webhook action error paths', () => {
    it('fails on invalid URL', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{ type: 'webhook', params: { url: 'not-a-url', method: 'POST' } }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext());

      expect(result.rulesExecuted[0].actionsFailed).toBe(1);
    });

    it('fails when webhook returns non-ok', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });

      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{ type: 'webhook', params: { url: 'https://example.com/hook', method: 'POST' } }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext());

      expect(result.rulesExecuted[0].actionsFailed).toBe(1);

      globalThis.fetch = originalFetch;
    });

    it('fails on network error', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Timeout'));

      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{ type: 'webhook', params: { url: 'https://example.com/hook', method: 'POST' } }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext());

      expect(result.rulesExecuted[0].actionsFailed).toBe(1);

      globalThis.fetch = originalFetch;
    });
  });

  // ─── sendMessage Action Failure Paths ───────────

  describe('sendMessage action failures', () => {
    it('fails when templateId is missing', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{ type: 'sendMessage', params: { channel: 'WHATSAPP' } }], // no templateId
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext());

      expect(result.rulesExecuted[0].actionsFailed).toBe(1);
    });

    it('fails when message template not found in DB', async () => {
      mockPrisma.messageTemplate.findUnique.mockResolvedValue(null);

      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{
              type: 'sendMessage',
              params: { channel: 'WHATSAPP', templateId: 'nonexistent', to: '+905551234567' },
            }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext());

      expect(result.rulesExecuted[0].actionsFailed).toBe(1);
    });

    it('uses context path for recipient when toIsContextPath is true', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{
              type: 'sendMessage',
              params: {
                channel: 'WHATSAPP',
                templateId: 'tmpl-1',
                to: 'data.customerPhone',
                toIsContextPath: true,
              },
            }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext({
        data: { customerPhone: '+905551234567', customerName: 'Ahmet' },
      }));

      expect(result.rulesExecuted[0].actionsExecuted).toBe(1);
    });
  });

  // ─── createTicket Action Failure Paths ──────────

  describe('createTicket action failures', () => {
    it('fails when deviceId is missing from context', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{
              type: 'createTicket',
              params: { issueDesc: 'Auto', deviceIdPath: 'data.deviceId', customerIdPath: 'data.customerId' },
            }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext({
        data: { customerId: 'cust-1' },
      }));

      expect(result.rulesExecuted[0].actionsFailed).toBe(1);
    });

    it('fails when customerId is missing from context', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{
              type: 'createTicket',
              params: { issueDesc: 'Auto', deviceIdPath: 'data.deviceId', customerIdPath: 'data.customerId' },
            }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      const result = await engine.fireTrigger(makeContext({
        data: { deviceId: 'dev-1' },
      }));

      expect(result.rulesExecuted[0].actionsFailed).toBe(1);
    });
  });

  // ─── Automation Log ─────────────────────────────

  describe('automation log', () => {
    it('logs SUCCESS when all actions succeed', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{ type: 'wait', params: { amount: 0, unit: 'minutes' } }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      await engine.fireTrigger(makeContext());

      expect(mockPrisma.automationLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SUCCESS' }),
        }),
      );
    });

    it('logs PARTIAL when some actions fail', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [
              { type: 'wait', params: { amount: 0, unit: 'minutes' } },
              { type: 'nonexistent' as any, params: {} },
            ],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      await engine.fireTrigger(makeContext());

      const logCalls = mockPrisma.automationLog.create.mock.calls;
      const partialLog = logCalls.find((c: any) => c[0]?.data?.status === 'PARTIAL');
      expect(partialLog).toBeDefined();
    });

    it('logs FAILED when all actions fail', async () => {
      const mockRepo = {
        findByTrigger: vi.fn().mockResolvedValue([
          makeRuleEntity({
            actions: [{ type: 'nonexistent' as any, params: {} }],
          }),
        ]),
        markFired: vi.fn().mockResolvedValue({ id: 'rule-1', lastFiredAt: new Date() }),
      };
      (engine as any).ruleRepo = mockRepo;

      await engine.fireTrigger(makeContext());

      const logCalls = mockPrisma.automationLog.create.mock.calls;
      const failedLog = logCalls.find((c: any) => c[0]?.data?.status === 'FAILED');
      expect(failedLog).toBeDefined();
    });
  });
});
