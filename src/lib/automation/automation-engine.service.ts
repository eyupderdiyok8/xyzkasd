// ──────────────────────────────────────────────
// Water Purifier Service ERP — Automation Engine
// Multi-Tenant SaaS
//
// Event-driven: trigger → condition matching → action execution
// Actions execute sequentially (wait blocks, then next action runs).
// ──────────────────────────────────────────────

import type { PrismaClient } from '@prisma/client';
import { BaseRepository } from '@/repositories/base.repository';
import {
  AutomationRuleRepository,
  type AutomationRuleEntity,
} from '@/repositories/automation-rule.repository';
import { MessagingFactory, renderTemplate } from '@/lib/messaging';
import type {
  AutomationTrigger,
  Condition,
  RuleAction,
  RuleEvaluationResult,
  TriggerContext,
  TriggerFireResult,
} from './types';

/**
 * Context path resolver — extracts nested values from a trigger context
 * using dot notation like "customer.tags" or "device.model".
 */
function resolveContextPath(context: TriggerContext, path: string): unknown {
  if (path.startsWith('data.')) {
    const rest = path.slice(5);
    return rest.split('.').reduce<unknown>((obj, key) => {
      if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
      return undefined;
    }, context.data);
  }
  // Direct property on context itself
  return (context as unknown as Record<string, unknown>)[path];
}

/**
 * Evaluate a single condition against the trigger context.
 */
function evaluateCondition(condition: Condition, context: TriggerContext): boolean {
  const actual = resolveContextPath(context, condition.field);

  switch (condition.operator) {
    case 'eq':
      return actual === condition.value;

    case 'neq':
      return actual !== condition.value;

    case 'contains':
      if (typeof actual === 'string' && typeof condition.value === 'string') {
        return actual.toLowerCase().includes(condition.value.toLowerCase());
      }
      if (Array.isArray(actual)) {
        return actual.includes(condition.value);
      }
      return String(actual).includes(String(condition.value));

    case 'gt':
      return Number(actual) > Number(condition.value);

    case 'gte':
      return Number(actual) >= Number(condition.value);

    case 'lt':
      return Number(actual) < Number(condition.value);

    case 'lte':
      return Number(actual) <= Number(condition.value);

    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(actual);

    case 'nin':
      return Array.isArray(condition.value) && !condition.value.includes(actual);

    case 'exists':
      return actual !== undefined && actual !== null && actual !== '';

    case 'notExists':
      return actual === undefined || actual === null || actual === '';

    default:
      return false;
  }
}

/**
 * Check cooldown: if the rule has fired within cooldownMin minutes, skip it.
 */
function isInCooldown(
  lastFiredAt: Date | null,
  cooldownMin: number,
): boolean {
  if (!lastFiredAt || cooldownMin <= 0) return false;
  const elapsed = (Date.now() - lastFiredAt.getTime()) / 1000 / 60;
  return elapsed < cooldownMin;
}

/**
 * Replace {{context.path}} placeholders in a string with values from the context.
 */
function interpolateTemplate(template: string, context: TriggerContext): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, path: string) => {
    const value = resolveContextPath(context, path.trim());
    return value !== undefined && value !== null ? String(value) : `{{${path.trim()}}}`;
  });
}

// ──────────────────────────────────────────────
// Action Executors
// ──────────────────────────────────────────────

/** Dependencies injected into every action executor. */
export interface ActionExecutorDeps {
  prisma: PrismaClient;
  tenantId: string;
}

type ActionExecutor = (
  action: RuleAction,
  context: TriggerContext,
  log: (msg: string) => void,
  deps: ActionExecutorDeps,
) => Promise<{ success: boolean; error?: string }>;

const actionExecutors: Record<string, ActionExecutor> = {
  async wait(action, _context, log, _deps) {
    const amount = Number(action.params.amount) || 0;
    const unit = String(action.params.unit || 'minutes');
    const ms = unit === 'days'
      ? amount * 86400000
      : unit === 'hours'
        ? amount * 3600000
        : amount * 60000;

    if (ms > 0) {
      log(`Waiting ${amount} ${unit} (${ms}ms)`);
      await new Promise((resolve) => setTimeout(resolve, ms));
    }
    return { success: true };
  },

  async sendMessage(action, context, log, deps) {
    const channel = String(action.params.channel || 'WHATSAPP');
    const templateId = String(action.params.templateId || '');
    const toRaw = String(action.params.to || '');
    const toIsContextPath = Boolean(action.params.toIsContextPath);

    const recipient = toIsContextPath
      ? String(resolveContextPath(context, toRaw) ?? '')
      : toRaw;

    if (!recipient || !templateId) {
      return { success: false, error: 'Missing recipient or templateId' };
    }

    try {
      // Look up the message template
      const template = await deps.prisma.messageTemplate.findUnique({
        where: { id: templateId },
      });
      if (!template) {
        return { success: false, error: `Message template not found: ${templateId}` };
      }

      // Build variable values from trigger context data
      const ctxData = context.data ?? {};
      const rendered = renderTemplate(template.content, {
        customer_name: String(ctxData.customerName ?? ctxData.customer_name ?? ''),
        device_brand: String(ctxData.deviceBrand ?? ctxData.device_brand ?? ''),
        device_model: String(ctxData.deviceModel ?? ctxData.device_model ?? ''),
        company_name: String(ctxData.companyName ?? ctxData.company_name ?? ''),
        phone: String(recipient),
        technician: String(ctxData.technician ?? ctxData.technicianName ?? ''),
        next_service_date: String(ctxData.nextServiceDate ?? ctxData.next_service_date ?? ''),
        survey_link: String(ctxData.surveyLink ?? ctxData.survey_link ?? ''),
        discount_code: String(ctxData.discountCode ?? ctxData.discount_code ?? ''),
        coupon_code: String(ctxData.couponCode ?? ctxData.coupon_code ?? ''),
        google_review_link: String(ctxData.googleReviewLink ?? ctxData.google_review_link ?? ''),
      });

      // Send via the appropriate messaging channel
      const messagingService = MessagingFactory.create({ channel: channel as any });
      const result = await messagingService.sendMessage({
        to: recipient,
        content: rendered,
      });

      log(`Message sent via ${channel} to ${recipient}: ${result.success ? 'OK' : result.error}`);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `sendMessage failed: ${msg}` };
    }
  },

  async sendSurvey(action, context, log, deps) {
    const toRaw = String(action.params.to || '');
    const toIsContextPath = Boolean(action.params.toIsContextPath);
    const recipient = toIsContextPath
      ? String(resolveContextPath(context, toRaw) ?? '')
      : toRaw;

    if (!recipient) {
      return { success: false, error: 'Missing recipient for survey' };
    }

    try {
      // Create a ServiceSurvey record linked to the entity
      await deps.prisma.serviceSurvey.create({
        data: {
          ticketId: context.entityType === 'service_ticket' ? context.entityId : '',
          tenantId: deps.tenantId,
          score: null,
          sentAt: new Date(),
        },
      });

      log(`Survey queued for ${recipient} (entity: ${context.entityType}:${context.entityId})`);
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `sendSurvey failed: ${msg}` };
    }
  },

  async createTicket(action, context, _log, deps) {
    const issueDesc = interpolateTemplate(
      String(action.params.issueDesc || ''),
      context,
    );
    const deviceIdPath = String(action.params.deviceIdPath || 'data.deviceId');
    const customerIdPath = String(action.params.customerIdPath || 'data.customerId');

    const deviceId = String(resolveContextPath(context, deviceIdPath) ?? '');
    const customerId = String(resolveContextPath(context, customerIdPath) ?? '');

    if (!deviceId || !customerId) {
      return { success: false, error: 'Missing deviceId or customerId from context' };
    }

    try {
      const ticket = await deps.prisma.serviceTicket.create({
        data: {
          tenantId: deps.tenantId,
          customerId,
          deviceId,
          issueDesc,
          status: 'PENDING',
          ticketNo: `AUTO-${Date.now().toString(36).toUpperCase()}`,
        },
      });
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `createTicket failed: ${msg}` };
    }
  },

  async notifyTechnician(action, context, log, deps) {
    const message = interpolateTemplate(
      String(action.params.message || ''),
      context,
    );
    const techIdPath = String(
      action.params.technicianIdPath || 'data.technicianId',
    );
    const technicianId = String(resolveContextPath(context, techIdPath) ?? '');

    if (!technicianId) {
      return { success: false, error: 'Technician ID not found in context' };
    }

    try {
      // Look up technician's phone
      const technician = await deps.prisma.technician.findUnique({
        where: { id: technicianId },
        select: { phone: true, name: true },
      });

      if (!technician || !technician.phone) {
        return { success: false, error: 'Technician not found or has no phone' };
      }

      // Send WhatsApp message to technician
      const whatsapp = MessagingFactory.create({ channel: 'WHATSAPP' });
      const result = await whatsapp.sendMessage({
        to: technician.phone,
        content: message,
      });

      log(`Notified technician ${technician.name} (${technician.phone}): ${result.success ? 'OK' : result.error}`);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `notifyTechnician failed: ${msg}` };
    }
  },

  async updateEntity(action, context, _log, deps) {
    const entity = String(action.params.entity || '');
    const field = String(action.params.field || '');
    const value = action.params.value;

    if (!entity || !field) {
      return { success: false, error: 'Missing entity or field' };
    }

    try {
      const entityId = String(resolveContextPath(context, `data.${entity}Id`) ?? context.entityId ?? '');
      if (!entityId) {
        return { success: false, error: `Entity ID not found for ${entity}` };
      }

      // Prisma model map: translate entity names to Prisma model keys
      const modelMap: Record<string, string> = {
        service_ticket: 'serviceTicket',
        device: 'device',
        customer: 'customer',
        serviceTicket: 'serviceTicket',
      };
      const modelKey = modelMap[entity] ?? entity;

      // Use raw execute to dynamically update any entity
      await deps.prisma.$executeRawUnsafe(
        `UPDATE "${entity.replace(/_/g, '_')}" SET "${field}" = ? WHERE id = ? AND tenant_id = ?`,
        value as string | number | boolean,
        entityId,
        deps.tenantId,
      );

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `updateEntity failed: ${msg}` };
    }
  },

  async webhook(action, context, _log, _deps) {
    const url = interpolateTemplate(String(action.params.url || ''), context);
    const method = String(action.params.method || 'POST').toUpperCase() as
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'PATCH';

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { success: false, error: `Invalid webhook URL: ${url}` };
    }

    try {
      const body = action.params.bodyTemplate
        ? interpolateTemplate(String(action.params.bodyTemplate), context)
        : undefined;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(action.params.headers as Record<string, string> | undefined),
      };

      const fetchOptions: RequestInit = { method, headers };
      if (body && method !== 'GET') {
        fetchOptions.body = body;
      }

      const response = await fetch(url, {
        ...fetchOptions,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Webhook returned ${response.status}`,
        };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: `Webhook failed: ${msg}` };
    }
  },
};

// ──────────────────────────────────────────────
// Engine — Public API
// ──────────────────────────────────────────────

export class AutomationEngine extends BaseRepository {
  private ruleRepo: AutomationRuleRepository;

  constructor(context: { tenantId: string | null; role: string }) {
    super(context);
    this.ruleRepo = new AutomationRuleRepository(context);
  }

  /**
   * Fire a trigger event — find matching rules, evaluate conditions,
   * and execute actions sequentially.
   */
  async fireTrigger(context: TriggerContext): Promise<TriggerFireResult> {
    const rules = await this.ruleRepo.findByTrigger(context.trigger);

    const result: TriggerFireResult = {
      trigger: context.trigger,
      entityType: context.entityType,
      entityId: context.entityId,
      rulesMatched: rules.length,
      rulesExecuted: [],
    };

    for (const rule of rules) {
      const evalResult = await this.evaluateAndExecute(rule, context);
      result.rulesExecuted.push(evalResult);
    }

    return result;
  }

  /**
   * Evaluate a single rule's conditions and, if met, execute its actions.
   */
  private async evaluateAndExecute(
    rule: AutomationRuleEntity,
    context: TriggerContext,
  ): Promise<RuleEvaluationResult> {
    const logEntries: string[] = [];
    const log = (msg: string) => logEntries.push(msg);

    const evalResult: RuleEvaluationResult = {
      ruleId: rule.id,
      ruleName: rule.name,
      conditionsMet: false,
      actionsExecuted: 0,
      actionsFailed: 0,
      logId: '',
    };

    try {
      // ── 1. Check if rule is active ──
      if (!rule.isActive) {
        return evalResult;
      }

      // ── 2. Check cooldown ──
      if (isInCooldown(rule.lastFiredAt, rule.cooldownMin)) {
        log(`Rule "${rule.name}" in cooldown (last: ${rule.lastFiredAt})`);
        return evalResult;
      }

      // ── 3. Evaluate conditions ──
      const conditionsMet = rule.conditions.length === 0
        ? true // no conditions = always match
        : rule.conditions.every((c) => evaluateCondition(c, context));

      evalResult.conditionsMet = conditionsMet;

      if (!conditionsMet) {
        log(`Conditions not met for rule "${rule.name}"`);
        return evalResult;
      }

      log(`Conditions met for rule "${rule.name}"`);

      // ── 4. Execute actions sequentially ──
      let executed = 0;
      let failed = 0;

      for (const action of rule.actions) {
        const executor = actionExecutors[action.type];
        if (!executor) {
          failed++;
          log(`Unknown action type: ${action.type}`);
          continue;
        }

        const actionResult = await executor(action, context, log, {
          prisma: this.prisma,
          tenantId: context.tenantId,
        });
        if (actionResult.success) {
          executed++;
          log(`Action ${action.type} succeeded`);
        } else {
          failed++;
          log(`Action ${action.type} failed: ${actionResult.error}`);
        }
      }

      evalResult.actionsExecuted = executed;
      evalResult.actionsFailed = failed;

      // ── 5. Log execution to database ──
      const logRecord = await this.prisma.automationLog.create({
        data: {
          tenantId: context.tenantId,
          ruleId: rule.id,
          trigger: context.trigger,
          entityType: context.entityType,
          entityId: context.entityId,
          context: JSON.stringify(context),
          status: failed === 0 ? 'SUCCESS' : executed > 0 ? 'PARTIAL' : 'FAILED',
          actionsJson: JSON.stringify(rule.actions),
          result: JSON.stringify({ actionsExecuted: executed, actionsFailed: failed }),
          errorMsg: failed > 0 ? `${failed} action(s) failed` : null,
        },
      });

      evalResult.logId = logRecord.id;

      // ── 6. Update lastFiredAt ──
      await this.ruleRepo.markFired(rule.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      evalResult.error = msg;

      // Log the failure
      try {
        await this.prisma.automationLog.create({
          data: {
            tenantId: context.tenantId,
            ruleId: rule.id,
            trigger: context.trigger,
            entityType: context.entityType,
            entityId: context.entityId,
            context: JSON.stringify(context),
            status: 'FAILED',
            actionsJson: JSON.stringify(rule.actions),
            errorMsg: msg,
          },
        });
      } catch {
        // Best-effort logging
      }
    }

    return evalResult;
  }
}


