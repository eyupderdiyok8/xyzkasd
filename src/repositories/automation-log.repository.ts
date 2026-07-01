// ──────────────────────────────────────────────
// Water Purifier Service ERP — AutomationLog Repository
// Multi-Tenant SaaS
// ──────────────────────────────────────────────
// Execution audit trail for automation rules.
// Read-only access for tenants; logs are created by the engine.
// ──────────────────────────────────────────────

import { BaseRepository } from './base.repository';

export interface AutomationLogFilter {
  ruleId?: string;
  trigger?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export class AutomationLogRepository extends BaseRepository {
  /**
   * List execution logs with optional filters.
   */
  async findAll(filter: AutomationLogFilter = {}) {
    const where: Record<string, unknown> = { ...this.tenantFilter(), deletedAt: null };

    if (filter.ruleId) where.ruleId = filter.ruleId;
    if (filter.trigger) where.trigger = filter.trigger;
    if (filter.status) where.status = filter.status;
    if (filter.fromDate || filter.toDate) {
      const executedAt: Record<string, Date> = {};
      if (filter.fromDate) executedAt.gte = new Date(filter.fromDate);
      if (filter.toDate) executedAt.lte = new Date(filter.toDate);
      where.executedAt = executedAt;
    }

    const limit = filter.limit ?? 50;
    const offset = filter.offset ?? 0;

    const [data, total] = await Promise.all([
      this.prisma.automationLog.findMany({
        where,
        orderBy: { executedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          rule: {
            select: { id: true, name: true, trigger: true },
          },
        },
      }),
      this.prisma.automationLog.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  /**
   * Get a single log entry by ID.
   */
  async findById(id: string, showDeleted?: boolean) {
    const where: Record<string, unknown> = { id, ...this.tenantFilter() };
    if (!showDeleted) where.deletedAt = null;
    const log = await this.prisma.automationLog.findFirst({
      where,
      include: {
        rule: {
          select: { id: true, name: true, trigger: true },
        },
      },
    });
    if (!log) throw new Error('NOT_FOUND');
    return log;
  }

  /**
   * Get execution stats summary.
   */
  async getStats(days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const where: Record<string, unknown> = {
      ...this.tenantFilter(),
      deletedAt: null,
      executedAt: { gte: since },
    };

    const logs = await this.prisma.automationLog.findMany({
      where,
      select: { status: true, trigger: true },
    });

    const total = logs.length;
    const byStatus: Record<string, number> = {};
    const byTrigger: Record<string, number> = {};

    for (const log of logs) {
      byStatus[log.status] = (byStatus[log.status] ?? 0) + 1;
      byTrigger[log.trigger] = (byTrigger[log.trigger] ?? 0) + 1;
    }

    return {
      total,
      byStatus,
      byTrigger,
      successRate: total > 0 ? ((byStatus['SUCCESS'] ?? 0) / total) * 100 : 0,
    };
  }
}
