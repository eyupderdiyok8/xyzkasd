// ──────────────────────────────────────────────
// Water Purifier Service ERP — AutomationRule Repository
// Multi-Tenant SaaS
//
// Event-driven automation rules CRUD.
// Rules are tenant-scoped with multi-tenant isolation.
// ──────────────────────────────────────────────

import { BaseRepository } from './base.repository';
import type { AutomationRule as PrismaAutomationRule } from "@/lib/generated/client";
import type {
  AutomationTrigger,
  Condition,
  CreateRuleInput,
  RuleAction,
  UpdateRuleInput,
} from '@/lib/automation/types';

/** Serialized rule with parsed JSON fields */
export interface AutomationRuleEntity {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  trigger: AutomationTrigger;
  conditions: Condition[];
  actions: RuleAction[];
  isActive: boolean;
  priority: number;
  cooldownMin: number;
  lastFiredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function parseRule(rule: PrismaAutomationRule): AutomationRuleEntity {
  return {
    ...rule,
    trigger: rule.trigger as AutomationTrigger,
    conditions: JSON.parse(rule.conditions) as Condition[],
    actions: JSON.parse(rule.actions) as RuleAction[],
  };
}

export class AutomationRuleRepository extends BaseRepository {
  // ─── List rules ──────────────────────────────

  async findAll(includeInactive = false, showDeleted?: boolean) {
    const where: Record<string, unknown> = this.tenantFilter();
    if (!showDeleted) where.deletedAt = null;
    if (!includeInactive) where.isActive = true;

    const rules = await this.prisma.automationRule.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return rules.map(parseRule);
  }

  /** Find rules matching a specific trigger (only active ones by default). */
  async findByTrigger(trigger: AutomationTrigger) {
    const where: Record<string, unknown> = {
      ...this.tenantFilter(),
      trigger,
      isActive: true,
      deletedAt: null,
    };

    const rules = await this.prisma.automationRule.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    return rules.map(parseRule);
  }

  // ─── Get by ID ──────────────────────────────

  async findById(id: string, showDeleted?: boolean): Promise<AutomationRuleEntity> {
    const where: Record<string, unknown> = { id, ...this.tenantFilter() };
    if (!showDeleted) where.deletedAt = null;

    const rule = await this.prisma.automationRule.findFirst({
      where,
    });
    if (!rule) throw new Error('NOT_FOUND');
    return parseRule(rule);
  }

  // ─── Create ────────────────────────────────

  async create(input: CreateRuleInput) {
    const tenantId = this.tenantId;
    if (!tenantId) throw new Error('Tenant gerekli');

    const rule = await this.prisma.automationRule.create({
      data: {
        tenantId,
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        trigger: input.trigger,
        conditions: JSON.stringify(input.conditions ?? []),
        actions: JSON.stringify(input.actions),
        isActive: input.isActive ?? true,
        priority: input.priority ?? 0,
        cooldownMin: input.cooldownMin ?? 0,
      },
    });

    await this.auditCreate({
      entity: 'automation_rule',
      entityId: rule.id,
      newValues: { name: rule.name, trigger: rule.trigger, isActive: rule.isActive, priority: rule.priority },
    });

    return rule;
  }

  // ─── Update ────────────────────────────────

  async update(id: string, input: UpdateRuleInput) {
    const original = await this.findById(id); // access control + existence
    const oldValues = { name: original.name, isActive: original.isActive, trigger: original.trigger, priority: original.priority };

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.description !== undefined) data.description = input.description.trim() || null;
    if (input.trigger !== undefined) data.trigger = input.trigger;
    if (input.conditions !== undefined) data.conditions = JSON.stringify(input.conditions);
    if (input.actions !== undefined) data.actions = JSON.stringify(input.actions);
    if (input.isActive !== undefined) data.isActive = input.isActive;
    if (input.priority !== undefined) data.priority = input.priority;
    if (input.cooldownMin !== undefined) data.cooldownMin = input.cooldownMin;

    const updated = await this.prisma.automationRule.update({
      where: { id },
      data,
    });

    await this.auditUpdate({
      entity: 'automation_rule',
      entityId: id,
      oldValues,
      newValues: { name: updated.name, isActive: updated.isActive, trigger: updated.trigger, priority: updated.priority },
    });

    return parseRule(updated);
  }

  // ─── Toggle active ─────────────────────────

  async toggleActive(id: string, isActive: boolean) {
    const original = await this.findById(id);
    await this.prisma.automationRule.update({
      where: { id },
      data: { isActive },
    });

    await this.auditUpdate({
      entity: 'automation_rule',
      entityId: id,
      oldValues: { isActive: original.isActive },
      newValues: { isActive },
    });
  }

  // ─── Delete ───────────────────────────────

  async delete(id: string) {
    const original = await this.findById(id);
    await this.prisma.automationRule.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditDelete({
      entity: 'automation_rule',
      entityId: id,
      deletedValues: { name: original.name, trigger: original.trigger },
    });
  }

  // ─── Mark last fired ──────────────────────

  async markFired(id: string) {
    return this.prisma.automationRule.update({
      where: { id },
      data: { lastFiredAt: new Date() },
    });
  }
}
