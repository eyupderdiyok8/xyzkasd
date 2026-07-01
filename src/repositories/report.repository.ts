// ──────────────────────────────────────────────
// Water Purifier Service ERP — Report Repository
// Multi-Tenant SaaS
// ──────────────────────────────────────────────
// Aggregates report data: dashboard stats, technician
// performance, filter popularity, maintenance forecast.
// ──────────────────────────────────────────────

import { BaseRepository } from './base.repository';

export interface DashboardStats {
  todayServiceCount: number;
  todayServices: Array<{
    id: string;
    ticketNo: string;
    status: string;
    customer: { name: string; phone: string };
    technician: { name: string } | null;
    scheduledAt: string | null;
    createdAt: string;
  }>;
  upcomingMaintenanceCount: number;
  overdueMaintenanceCount: number;
}

export interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  totalServices: number;
  completedServices: number;
  avgScore: number;
  surveyCount: number;
}

export interface MostChangedFilter {
  filterId: string;
  filterName: string;
  stage: string;
  changeCount: number;
}

export interface MonthlyForecast {
  month: string; // "2025-01"
  label: string; // "Ocak 2025"
  count: number;
}

export class ReportRepository extends BaseRepository {
  /**
   * Dashboard statistics for today.
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [todayTickets, upcomingCount, overdueCount] = await Promise.all([
      this.prisma.serviceTicket.findMany({
        where: {
          ...this.tenantFilter(),
          deletedAt: null,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        select: {
          id: true,
          ticketNo: true,
          status: true,
          customer: { select: { name: true, phone: true } },
          technician: { select: { name: true } },
          scheduledAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.countUpcomingMaintenance(),
      this.countOverdueMaintenance(),
    ]);

    return {
      todayServiceCount: todayTickets.length,
      todayServices: todayTickets.map((t) => ({
        id: t.id,
        ticketNo: t.ticketNo,
        status: t.status,
        customer: { name: t.customer.name, phone: t.customer.phone },
        technician: t.technician,
        scheduledAt: t.scheduledAt?.toISOString() ?? null,
        createdAt: t.createdAt.toISOString(),
      })),
      upcomingMaintenanceCount: upcomingCount,
      overdueMaintenanceCount: overdueCount,
    };
  }

  /**
   * Technician performance report.
   */
  async getTechnicianPerformance(): Promise<TechnicianPerformance[]> {
    const techs = await this.prisma.technician.findMany({
      where: { ...this.tenantFilter(), isActive: true },
      select: {
        id: true,
        name: true,
        serviceTickets: {
          select: {
            status: true,
            surveys: {
              select: { score: true },
            },
          },
        },
      },
    });

    return techs.map((t) => {
      const completed = t.serviceTickets.filter((s) => s.status === 'COMPLETED');
      const scores = completed
        .flatMap((s) => s.surveys)
        .filter((sv) => sv.score != null)
        .map((sv) => sv.score!);
      const avgScore =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : 0;

      return {
        technicianId: t.id,
        technicianName: t.name,
        totalServices: t.serviceTickets.length,
        completedServices: completed.length,
        avgScore,
        surveyCount: scores.length,
      };
    });
  }

  /**
   * Satisfaction survey summary (for reports page).
   */
  async getSatisfactionSummary(opts?: { dateFrom?: Date; dateTo?: Date }) {
    const where: any = { ...this.tenantFilter(), deletedAt: null };
    if (opts?.dateFrom || opts?.dateTo) {
      where.sentAt = {};
      if (opts.dateFrom) where.sentAt.gte = opts.dateFrom;
      if (opts.dateTo) where.sentAt.lte = opts.dateTo;
    }

    const surveys = await this.prisma.serviceSurvey.findMany({
      where,
      select: { score: true, respondedAt: true },
      orderBy: { sentAt: 'desc' },
    });

    const total = surveys.length;
    const responded = surveys.filter((s) => s.score != null).length;
    const scores = surveys.filter((s) => s.score != null).map((s) => s.score!);
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const s of scores) {
      distribution[s] = (distribution[s] ?? 0) + 1;
    }

    const highScores = scores.filter((s) => s >= 4).length;
    const lowScores = scores.filter((s) => s <= 2).length;

    return {
      total,
      responded,
      responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
      avgScore,
      highScores,
      lowScores,
      distribution,
    };
  }

  /**
   * Most changed filters report.
   */
  async getMostChangedFilters(limit: number = 10): Promise<MostChangedFilter[]> {
    const filterChanges = await this.prisma.filterChange.groupBy({
      by: ['filterId'],
      where: { ...this.tenantFilter(), deletedAt: null },
      _count: { filterId: true },
      orderBy: { _count: { filterId: 'desc' } },
      take: limit,
    });

    if (filterChanges.length === 0) return [];

    const filterIds = filterChanges.map((fc) => fc.filterId);
    const catalogs = await this.prisma.filterCatalog.findMany({
      where: { id: { in: filterIds }, ...this.tenantFilter() },
      select: { id: true, name: true, stage: true },
    });
    const catalogMap = new Map(catalogs.map((c) => [c.id, c]));

    return filterChanges.map((fc) => {
      const cat = catalogMap.get(fc.filterId);
      return {
        filterId: fc.filterId,
        filterName: cat?.name ?? 'Bilinmeyen Filtre',
        stage: cat?.stage ?? 'OTHER',
        changeCount: fc._count.filterId,
      };
    });
  }

  /**
   * Monthly maintenance forecast — number of maintenance events
   * scheduled per month for the next 12 months.
   */
  async getMonthlyMaintenanceForecast(): Promise<MonthlyForecast[]> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 12, 1);

    // Get all active devices with filter tracking data
    const devices = await this.prisma.device.findMany({
      where: {
        ...this.tenantFilter(),
        status: 'ACTIVE',
        deletedAt: null,
        customerId: { not: null },
      },
      include: {
        deviceFilters: {
          select: { installedAt: true, expectedLifespanDays: true },
        },
      },
    });

    // Build a map of month -> count
    const forecastMap = new Map<string, number>();

    // Initialize all 12 months with 0
    for (let i = 0; i < 12; i++) {
      const m = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = this.formatMonthKey(m);
      forecastMap.set(key, 0);
    }

    for (const device of devices) {
      for (const df of device.deviceFilters) {
        const dueDate = new Date(
          df.installedAt.getTime() + df.expectedLifespanDays * 24 * 60 * 60 * 1000,
        );
        if (dueDate >= startDate && dueDate < endDate) {
          const key = this.formatMonthKey(dueDate);
          forecastMap.set(key, (forecastMap.get(key) ?? 0) + 1);
        }
      }
    }

    const monthNames = [
      'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
      'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
    ];

    const forecast: MonthlyForecast[] = [];
    for (let i = 0; i < 12; i++) {
      const m = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = this.formatMonthKey(m);
      forecast.push({
        month: key,
        label: `${monthNames[m.getMonth()]} ${m.getFullYear()}`,
        count: forecastMap.get(key) ?? 0,
      });
    }

    return forecast;
  }

  // ─── Helpers ────────────────────────────────

  private async countUpcomingMaintenance(): Promise<number> {
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const devices = await this.prisma.device.findMany({
      where: {
        ...this.tenantFilter(),
        status: 'ACTIVE',
        deletedAt: null,
        customerId: { not: null },
      },
      include: {
        deviceFilters: {
          select: { installedAt: true, expectedLifespanDays: true },
        },
      },
    });

    let upcoming = 0;
    for (const device of devices) {
      for (const df of device.deviceFilters) {
        const dueDate = new Date(
          df.installedAt.getTime() + df.expectedLifespanDays * 24 * 60 * 60 * 1000,
        );
        // Upcoming = due within next 30 days, not yet overdue
        if (dueDate >= now && dueDate <= thirtyDaysLater) {
          upcoming++;
          break; // count device once if any filter is upcoming
        }
      }
    }

    return upcoming;
  }

  private async countOverdueMaintenance(): Promise<number> {
    const now = new Date();

    const devices = await this.prisma.device.findMany({
      where: {
        ...this.tenantFilter(),
        status: 'ACTIVE',
        deletedAt: null,
        customerId: { not: null },
      },
      include: {
        deviceFilters: {
          select: { installedAt: true, expectedLifespanDays: true },
        },
      },
    });

    let overdue = 0;
    for (const device of devices) {
      for (const df of device.deviceFilters) {
        const dueDate = new Date(
          df.installedAt.getTime() + df.expectedLifespanDays * 24 * 60 * 60 * 1000,
        );
        if (dueDate < now) {
          overdue++;
          break; // count device once if any filter is overdue
        }
      }
    }

    return overdue;
  }

  private formatMonthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
