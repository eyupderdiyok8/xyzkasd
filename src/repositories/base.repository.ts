import { PrismaClient } from '@prisma/client';
import { AuditService } from '@/lib/audit.service';
import type { AuditAction } from '@/lib/audit.service';
export const prismaClient = new PrismaClient();

export interface RepositoryContext {
  tenantId: string | null;
  role: string;
  userId?: string | null;
  ipAddress?: string | null;
}

export abstract class BaseRepository {
  protected prisma = prismaClient;
  protected tenantId: string | null;
  protected role: string;
  protected userId: string | null;
  protected ipAddress: string | null;

  constructor(context: RepositoryContext) {
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

  /**
   * Helper for soft-delete filtering.
   * Returns { deletedAt: null } when showDeleted is false/undefined,
   * or {} when showDeleted is true (include soft-deleted).
   */
  protected notDeleted(showDeleted?: boolean) {
    if (showDeleted) return {};
    return { deletedAt: null };
  }

  // ─── Audit Helpers ────────────────────────────

  /**
   * Log a CREATE operation for the current tenant context.
   */
  protected async auditCreate(params: {
    entity: string;
    entityId: string;
    newValues: Record<string, unknown>;
  }): Promise<void> {
    await AuditService.logCreate({
      tenantId: this.tenantId,
      userId: this.userId,
      ipAddress: this.ipAddress,
      ...params,
    });
  }

  /**
   * Log an UPDATE operation for the current tenant context.
   */
  protected async auditUpdate(params: {
    entity: string;
    entityId: string;
    oldValues: Record<string, unknown>;
    newValues: Record<string, unknown>;
  }): Promise<void> {
    await AuditService.logUpdate({
      tenantId: this.tenantId,
      userId: this.userId,
      ipAddress: this.ipAddress,
      ...params,
    });
  }

  /**
   * Log a DELETE operation for the current tenant context.
   */
  protected async auditDelete(params: {
    entity: string;
    entityId: string;
    deletedValues?: Record<string, unknown>;
  }): Promise<void> {
    await AuditService.logDelete({
      tenantId: this.tenantId,
      userId: this.userId,
      ipAddress: this.ipAddress,
      ...params,
    });
  }
}
