import { BaseRepository } from './base.repository';

export interface DeviceFilterWithComputed {
  id: string;
  deviceId: string;
  filterCatalogId: string;
  filterCatalog: {
    id: string;
    name: string;
    stage: string;
    sku: string | null;
  };
  installedAt: string;
  expectedLifespanDays: number;
  remainingDays: number;
  remainingPercent: number;
  nextMaintenanceAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceFilterInput {
  filterCatalogId: string;
  installedAt?: string;
  expectedLifespanDays: number;
  notes?: string | null;
}

export class FilterTrackingRepository extends BaseRepository {
  /**
   * Compute lifecycle fields from installedAt + expectedLifespanDays.
   */
  private computeLifecycle(installedAt: Date, expectedLifespanDays: number) {
    const now = new Date();
    const msSinceInstalled = now.getTime() - installedAt.getTime();
    const daysSinceInstalled = Math.max(0, Math.floor(msSinceInstalled / (1000 * 60 * 60 * 24)));

    const remainingDays = Math.max(0, expectedLifespanDays - daysSinceInstalled);
    const remainingPercent = expectedLifespanDays > 0
      ? Math.round((remainingDays / expectedLifespanDays) * 100)
      : 0;

    const nextMaintenanceAt = new Date(installedAt);
    nextMaintenanceAt.setDate(nextMaintenanceAt.getDate() + expectedLifespanDays);

    return { remainingDays, remainingPercent, nextMaintenanceAt };
  }

  /**
   * Map a raw DeviceFilter row to the computed shape.
   */
  private mapWithLifecycle(row: any): DeviceFilterWithComputed {
    const installed = new Date(row.installedAt);
    const { remainingDays, remainingPercent, nextMaintenanceAt } = this.computeLifecycle(
      installed,
      row.expectedLifespanDays,
    );

    return {
      id: row.id,
      deviceId: row.deviceId,
      filterCatalogId: row.filterCatalogId,
      filterCatalog: {
        id: row.filterCatalog.id,
        name: row.filterCatalog.name,
        stage: row.filterCatalog.stage,
        sku: row.filterCatalog.sku,
      },
      installedAt: row.installedAt.toISOString?.() ?? row.installedAt,
      expectedLifespanDays: row.expectedLifespanDays,
      remainingDays,
      remainingPercent,
      nextMaintenanceAt: nextMaintenanceAt.toISOString(),
      notes: row.notes ?? null,
      createdAt: row.createdAt.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt.toISOString?.() ?? row.updatedAt,
    };
  }

  // ─── List filters on a device ───────────────

  async findByDevice(deviceId: string) {
    await this.ensureDeviceAccess(deviceId);

    const rows = await this.prisma.deviceFilter.findMany({
      where: { deviceId, deletedAt: null, ...this.tenantFilter() },
      include: {
        filterCatalog: {
          select: { id: true, name: true, stage: true, sku: true },
        },
      },
      orderBy: { installedAt: 'desc' },
    });

    return rows.map((r) => this.mapWithLifecycle(r));
  }

  // ─── Install a filter on a device ───────────

  async add(deviceId: string, input: DeviceFilterInput) {
    await this.ensureDeviceAccess(deviceId);
    return this.addOrUpdate(deviceId, input);
  }

  async addOrUpdate(deviceId: string, input: DeviceFilterInput) {
    await this.ensureDeviceAccess(deviceId);

    const data: any = {
      deviceId,
      filterCatalogId: input.filterCatalogId,
      tenantId: this.tenantId!,
      expectedLifespanDays: input.expectedLifespanDays,
      notes: input.notes ?? null,
    };

    if (input.installedAt) {
      data.installedAt = new Date(input.installedAt);
    }

    const existing = await this.prisma.deviceFilter.findFirst({
      where: {
        deviceId,
        filterCatalogId: input.filterCatalogId,
        deletedAt: null,
        ...this.tenantFilter(),
      },
      select: { id: true },
    });

    const row = existing
      ? await this.prisma.deviceFilter.update({
          where: { id: existing.id },
          data: {
            installedAt: data.installedAt ?? new Date(),
            expectedLifespanDays: data.expectedLifespanDays,
            notes: data.notes,
          },
          include: {
            filterCatalog: {
              select: { id: true, name: true, stage: true, sku: true },
            },
          },
        })
      : await this.prisma.deviceFilter.create({
      data,
      include: {
        filterCatalog: {
          select: { id: true, name: true, stage: true, sku: true },
        },
      },
    });

    if (existing) {
      await this.auditUpdate({
        entity: 'device_filter',
        entityId: row.id,
        oldValues: { filterCatalogId: input.filterCatalogId },
        newValues: { deviceId, filterCatalogId: input.filterCatalogId, expectedLifespanDays: input.expectedLifespanDays },
      });
    } else {
      await this.auditCreate({
        entity: 'device_filter',
        entityId: row.id,
        newValues: { deviceId, filterCatalogId: input.filterCatalogId, expectedLifespanDays: input.expectedLifespanDays },
      });
    }

    return this.mapWithLifecycle(row);
  }

  async addMany(deviceId: string, inputs: DeviceFilterInput[]) {
    const results = [];
    for (const input of inputs) {
      results.push(await this.addOrUpdate(deviceId, input));
    }
    return results;
  }

  // ─── Update a filter tracking entry ─────────

  async update(id: string, input: Partial<DeviceFilterInput>) {
    const existing = await this.ensureAccess(id);
    const oldValues = { filterCatalogId: existing.filterCatalogId, expectedLifespanDays: existing.expectedLifespanDays, notes: existing.notes };

    const data: any = {};
    if (input.filterCatalogId !== undefined) data.filterCatalogId = input.filterCatalogId;
    if (input.expectedLifespanDays !== undefined) data.expectedLifespanDays = input.expectedLifespanDays;
    if (input.installedAt !== undefined) data.installedAt = new Date(input.installedAt);
    if (input.notes !== undefined) data.notes = input.notes;

    const row = await this.prisma.deviceFilter.update({
      where: { id },
      data,
      include: {
        filterCatalog: {
          select: { id: true, name: true, stage: true, sku: true },
        },
      },
    });

    await this.auditUpdate({
      entity: 'device_filter',
      entityId: id,
      oldValues,
      newValues: { filterCatalogId: row.filterCatalogId, expectedLifespanDays: row.expectedLifespanDays, notes: row.notes },
    });

    return this.mapWithLifecycle(row);
  }

  // ─── Remove a filter tracking entry ─────────

  async remove(id: string) {
    const existing = await this.ensureAccess(id);
    await this.prisma.deviceFilter.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditDelete({
      entity: 'device_filter',
      entityId: id,
      deletedValues: { filterCatalogId: existing.filterCatalogId, expectedLifespanDays: existing.expectedLifespanDays },
    });
  }

  // ─── Find ALL filters across tenant ──────────

  async findAll() {
    const rows = await this.prisma.deviceFilter.findMany({
      where: { ...this.tenantFilter(), deletedAt: null },
      include: {
        filterCatalog: {
          select: { id: true, name: true, stage: true, sku: true },
        },
        device: {
          select: { id: true, serialNo: true, brand: true, model: true },
        },
      },
      orderBy: { installedAt: 'desc' },
    });

    return rows.map((r) => {
      const computed = this.mapWithLifecycle(r);
      return { ...computed, device: (r as any).device };
    });
  }

  // ─── Find overdue / due-soon filters ─────────

  async findOverdue() {
    const rows = await this.findAll();
    return rows.filter((r) => r.remainingDays <= 30); // due within 30 days or overdue
  }

  // ─── Helpers ────────────────────────────────

  private async ensureDeviceAccess(deviceId: string) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, deletedAt: null, ...this.tenantFilter() },
      select: { id: true },
    });
    if (!device) throw new Error('NOT_FOUND');
  }

  private async ensureAccess(id: string) {
    const row = await this.prisma.deviceFilter.findFirst({
      where: { id, deletedAt: null, ...this.tenantFilter() },
    });
    if (!row) throw new Error('NOT_FOUND');
    return row;
  }
}
