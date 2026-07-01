// ──────────────────────────────────────────────
// Water Purifier Service ERP — Audit Service
// Multi-Tenant SaaS
// ──────────────────────────────────────────────
// Tüm kritik CRUD işlemlerinin denetim günlüğü.
// Kim, ne zaman, hangi IP'den, ne yaptı, eski/yeni değer kaydedilir.
// ──────────────────────────────────────────────

import { prisma } from '@/lib/prisma';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export interface AuditLogInput {
  tenantId?: string | null;
  userId?: string | null;
  action: AuditAction;
  entity: string;          // e.g. 'customer', 'device', 'service_ticket'
  entityId?: string | null;
  metadata?: Record<string, unknown> | null; // old/new values
  ipAddress?: string | null;
}

export class AuditService {
  /**
   * Log a single audit entry.
   * This is the core method; all helpers delegate here.
   */
  static async log(input: AuditLogInput): Promise<void> {
    await prisma.auditLog.create({
      data: {
        tenantId: input.tenantId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ipAddress: input.ipAddress ?? null,
      },
    });
  }

  /**
   * Log a CREATE operation.
   */
  static async logCreate(params: {
    tenantId?: string | null;
    userId?: string | null;
    entity: string;
    entityId: string;
    newValues: Record<string, unknown>;
    ipAddress?: string | null;
  }): Promise<void> {
    await AuditService.log({
      tenantId: params.tenantId,
      userId: params.userId,
      action: 'CREATE',
      entity: params.entity,
      entityId: params.entityId,
      metadata: { new: params.newValues },
      ipAddress: params.ipAddress,
    });
  }

  /**
   * Log an UPDATE operation with old/new value comparison.
   */
  static async logUpdate(params: {
    tenantId?: string | null;
    userId?: string | null;
    entity: string;
    entityId: string;
    oldValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
    ipAddress?: string | null;
  }): Promise<void> {
    await AuditService.log({
      tenantId: params.tenantId,
      userId: params.userId,
      action: 'UPDATE',
      entity: params.entity,
      entityId: params.entityId,
      metadata: { old: params.oldValues, new: params.newValues },
      ipAddress: params.ipAddress,
    });
  }

  /**
   * Log a DELETE operation.
   */
  static async logDelete(params: {
    tenantId?: string | null;
    userId?: string | null;
    entity: string;
    entityId: string;
    deletedValues?: Record<string, unknown>;
    ipAddress?: string | null;
  }): Promise<void> {
    await AuditService.log({
      tenantId: params.tenantId,
      userId: params.userId,
      action: 'DELETE',
      entity: params.entity,
      entityId: params.entityId,
      metadata: params.deletedValues ? { deleted: params.deletedValues } : null,
      ipAddress: params.ipAddress,
    });
  }
}
