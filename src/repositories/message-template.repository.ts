// ──────────────────────────────────────────────
// Water Purifier Service ERP — MessageTemplate Repository
// Multi-Tenant SaaS
// ──────────────────────────────────────────────
// Tenant bazlı mesaj şablonlarının CRUD işlemleri.
// Tüm sorgular tenant bazlı izolasyon ile çalışır.
// ──────────────────────────────────────────────

import { BaseRepository } from './base.repository';

interface CreateTemplateInput {
  name: string;
  content: string;
  variables?: string; // JSON string of variable list
  tenantId?: string;  // override for SUPER_ADMIN
}

interface UpdateTemplateInput {
  name?: string;
  content?: string;
  variables?: string;
  isActive?: boolean;
}

export class MessageTemplateRepository extends BaseRepository {
  // ─── List (active) ──────────────────────────

  async findAll(includeInactive = false, showDeleted?: boolean) {
    const where: Record<string, unknown> = this.tenantFilter();
    if (!showDeleted) where.deletedAt = null;
    if (!includeInactive) where.isActive = true;

    return this.prisma.messageTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Get by ID ──────────────────────────────

  async findById(id: string, showDeleted?: boolean) {
    const where: Record<string, unknown> = { id, ...this.tenantFilter() };
    if (!showDeleted) where.deletedAt = null;

    const tmpl = await this.prisma.messageTemplate.findFirst({
      where,
    });
    if (!tmpl) throw new Error('NOT_FOUND');
    return tmpl;
  }

  // ─── Create ─────────────────────────────────

  async create(input: CreateTemplateInput) {
    const tenantId = input.tenantId ?? this.tenantId;
    if (!tenantId) throw new Error('Tenant gerekli');

    const tmpl = await this.prisma.messageTemplate.create({
      data: {
        name: input.name.trim(),
        content: input.content.trim(),
        variables: input.variables ?? '',
        tenantId,
      },
    });

    await this.auditCreate({
      entity: 'message_template',
      entityId: tmpl.id,
      newValues: { name: tmpl.name, isActive: tmpl.isActive },
    });

    return tmpl;
  }

  // ─── Update ─────────────────────────────────

  async update(id: string, input: UpdateTemplateInput) {
    const original = await this.findById(id); // access control + existence
    const oldValues = { name: original.name, isActive: original.isActive };

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.content !== undefined) data.content = input.content.trim();
    if (input.variables !== undefined) data.variables = input.variables;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    const updated = await this.prisma.messageTemplate.update({
      where: { id },
      data,
    });

    await this.auditUpdate({
      entity: 'message_template',
      entityId: id,
      oldValues,
      newValues: { name: updated.name, isActive: updated.isActive },
    });

    return updated;
  }

  // ─── Delete (soft delete) ──

  async delete(id: string) {
    const original = await this.findById(id);
    await this.prisma.messageTemplate.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditDelete({
      entity: 'message_template',
      entityId: id,
      deletedValues: { name: original.name },
    });
  }
}
