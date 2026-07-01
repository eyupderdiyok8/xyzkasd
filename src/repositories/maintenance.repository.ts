import { BaseRepository } from './base.repository';

interface MaintenanceDevice {
  id: string;
  serialNo: string;
  brand: string;
  model: string;
  status: string;
  installDate: Date | null;
  customer: { id: string; name: string; phone: string } | null;
  customerId: string | null;
  deviceFilters: Array<{
    id: string;
    installedAt: Date;
    expectedLifespanDays: number;
    filterCatalog: { name: string; stage: string };
  }>;
  deviceMaintenance: Array<{
    id: string;
    maintenanceType: string;
    scheduledDate: Date | null;
    completedDate: Date | null;
  }>;
}

export class MaintenanceRepository extends BaseRepository {
  /**
   * Find devices with upcoming maintenance (within the next N days).
   * Uses DeviceFilter expectedLifespanDays + installedAt to calculate next due date.
   */
  async findUpcomingMaintenance(daysAhead: number) {
    const devices = await this.prisma.device.findMany({
      where: {
        ...this.tenantFilter(),
        deletedAt: null,
        status: 'ACTIVE',
        customerId: { not: null },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        deviceFilters: {
          include: { filterCatalog: { select: { name: true, stage: true } } },
          orderBy: { installedAt: 'desc' },
        },
        deviceMaintenance: {
          orderBy: { scheduledDate: 'desc' },
          take: 5,
        },
      },
    });

    const now = new Date();
    const targetDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const results: Array<{
      device: MaintenanceDevice;
      daysUntilDue: number;
      dueDate: Date;
      reason: string;
      filterName?: string;
    }> = [];

    for (const device of devices) {
      // Check from DeviceFilter (installed filter lifespan)
      for (const df of device.deviceFilters) {
        const dueDate = new Date(df.installedAt.getTime() + df.expectedLifespanDays * 24 * 60 * 60 * 1000);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue <= daysAhead && daysUntilDue >= 0) {
          results.push({
            device: device as MaintenanceDevice,
            daysUntilDue,
            dueDate,
            reason: `filter_lifespan`,
            filterName: df.filterCatalog.name,
          });
        }
      }

      // Check from DeviceMaintenance scheduled dates
      // (e.g., manually scheduled maintenance)
      for (const dm of device.deviceMaintenance) {
        if (!dm.scheduledDate || dm.completedDate) continue;
        const daysUntilDue = Math.ceil((dm.scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue <= daysAhead && daysUntilDue >= 0) {
          results.push({
            device: device as MaintenanceDevice,
            daysUntilDue,
            dueDate: dm.scheduledDate,
            reason: dm.maintenanceType,
          });
        }
      }
    }

    return results;
  }

  /**
   * Find devices with overdue maintenance.
   */
  async findOverdueMaintenance() {
    const devices = await this.prisma.device.findMany({
      where: {
        ...this.tenantFilter(),
        deletedAt: null,
        status: 'ACTIVE',
        customerId: { not: null },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        deviceFilters: {
          include: { filterCatalog: { select: { name: true, stage: true } } },
          orderBy: { installedAt: 'desc' },
        },
        deviceMaintenance: {
          orderBy: { scheduledDate: 'desc' },
          take: 5,
        },
      },
    });

    const now = new Date();
    const results: Array<{
      device: MaintenanceDevice;
      daysOverdue: number;
      dueDate: Date;
      reason: string;
      filterName?: string;
    }> = [];

    for (const device of devices) {
      // Check from DeviceFilter
      for (const df of device.deviceFilters) {
        const dueDate = new Date(df.installedAt.getTime() + df.expectedLifespanDays * 24 * 60 * 60 * 1000);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue >= 1) {
          results.push({
            device: device as MaintenanceDevice,
            daysOverdue,
            dueDate,
            reason: `filter_lifespan`,
            filterName: df.filterCatalog.name,
          });
        }
      }

      // Check from DeviceMaintenance scheduled dates
      for (const dm of device.deviceMaintenance) {
        if (!dm.scheduledDate || dm.completedDate) continue;
        const daysOverdue = Math.floor((now.getTime() - dm.scheduledDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysOverdue >= 1) {
          results.push({
            device: device as MaintenanceDevice,
            daysOverdue,
            dueDate: dm.scheduledDate,
            reason: dm.maintenanceType,
          });
        }
      }
    }

    return results;
  }

  /**
   * Log a maintenance reminder in the database.
   */
  async logReminder(input: {
    deviceId: string;
    tenantId: string;
    customerId: string;
    maintenanceId?: string;
    reminderType: string;
    recipientPhone?: string;
    messageText?: string;
    status: string;
    sentAt?: Date;
    errorMessage?: string;
  }) {
    const reminder = await this.prisma.maintenanceReminder.create({ data: input });

    await this.auditCreate({
      entity: 'maintenance_reminder',
      entityId: reminder.id,
      newValues: {
        deviceId: input.deviceId,
        reminderType: input.reminderType,
        status: input.status,
        recipientPhone: input.recipientPhone ?? null,
      },
    });

    return reminder;
  }

  /**
   * Find reminders sent for a given device and type within a time window
   * to avoid duplicate sends.
   */
  async findRecentReminder(deviceId: string, reminderType: string, withinHours: number = 23) {
    const since = new Date(Date.now() - withinHours * 60 * 60 * 1000);
    return this.prisma.maintenanceReminder.findFirst({
      where: {
        deviceId,
        reminderType,
        createdAt: { gte: since },
      },
    });
  }

  /**
   * Get reminders for dashboard display.
   */
  async getDashboardReminders(limit: number = 20) {
    return this.prisma.maintenanceReminder.findMany({
      where: { ...this.tenantFilter(), deletedAt: null },
      include: {
        device: { select: { id: true, serialNo: true, brand: true, model: true } },
        customer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Get pending/overdue maintenance cards for tenant dashboard.
   */
  async getDashboardMaintenanceCards() {
    const upcoming15 = await this.findUpcomingMaintenance(15);
    const upcoming7 = await this.findUpcomingMaintenance(7);
    const overdue = await this.findOverdueMaintenance();

    return {
      upcoming15Count: upcoming15.length,
      upcoming7Count: upcoming7.length,
      overdueCount: overdue.length,
      upcoming15: upcoming15,
      upcoming7: upcoming7,
      overdue: overdue.slice(0, 10),
    };
  }
}
