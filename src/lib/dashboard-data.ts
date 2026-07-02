import "dotenv/config";
import { prisma } from "@/lib/prisma";

/**
 * Server-side dashboard data loader.
 * Fetches ALL dashboard data in parallel using Prisma, avoiding
 * N+1 browser→API→DB roundtrips.
 */

export interface DashboardStatsData {
  todayServiceCount: number;
  todayServices: Array<{
    id: string; ticketNo: string; status: string;
    customer: { name: string; phone: string };
    technician: { name: string } | null;
    scheduledAt: string | null; createdAt: string;
  }>;
  upcomingMaintenanceCount: number;
  overdueMaintenanceCount: number;
}

export interface MaintenanceItemData {
  deviceId: string; serialNo: string; brand: string; model: string;
  customerName: string | null; customerPhone: string | null;
  daysUntilDue: number | null; daysOverdue: number | null;
  dueDate: string; reason: string; filterName: string | null;
}

export interface MaintenanceRemindersData {
  upcoming15Count: number; upcoming7Count: number; overdueCount: number;
  upcoming15: MaintenanceItemData[]; upcoming7: MaintenanceItemData[]; overdue: MaintenanceItemData[];
}

export interface OverdueQueueItem {
  id: string; ticketNo: string; issueDesc: string; status: string;
  customerName: string | null; customerPhone: string | null;
  deviceSerialNo: string; deviceBrand: string; deviceModel: string;
  technicianName: string | null; createdAt: string; scheduledAt: string | null;
}

export interface RevenueStatsData {
  totalRevenue: number; collectedToday: number;
  pendingAmount: number; overdueAmount: number;
  byMethod: Array<{ method: string; total: number; count: number }>;
  byTechnician: Array<{ technicianId: string; technicianName: string; total: number; count: number }>;
  monthlyRevenue: Array<{ month: string; total: number; count: number }>;
}

export async function loadDashboardStats(tenantId: string): Promise<DashboardStatsData> {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const [todayServices, upcomingMaintenance, overdueMaintenance] = await Promise.all([
    prisma.serviceTicket.findMany({
      where: { tenantId, deletedAt: null, createdAt: { gte: todayStart, lte: todayEnd } },
      include: {
        customer: { select: { name: true, phone: true } },
        technician: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.deviceMaintenance.count({
      where: {
        tenantId, deletedAt: null,
        scheduledDate: { gte: new Date(), lte: thirtyDaysFromNow },
        completedDate: null,
      },
    }),
    prisma.deviceMaintenance.count({
      where: {
        tenantId, deletedAt: null,
        scheduledDate: { lt: new Date() },
        completedDate: null,
      },
    }),
  ]);

  return {
    todayServiceCount: todayServices.length,
    todayServices: todayServices.map(s => ({
      id: s.id, ticketNo: s.ticketNo, status: s.status,
      customer: s.customer, technician: s.technician,
      scheduledAt: s.scheduledAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
    })),
    upcomingMaintenanceCount: upcomingMaintenance,
    overdueMaintenanceCount: overdueMaintenance,
  };
}

export async function loadMaintenanceReminders(tenantId: string): Promise<MaintenanceRemindersData> {
  const now = new Date();
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const in15Days = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

  const [overdue, upcoming7, upcoming15] = await Promise.all([
    prisma.deviceMaintenance.findMany({
      where: { tenantId, deletedAt: null, scheduledDate: { lt: now }, completedDate: null },
      include: { device: { select: { id: true, serialNo: true, brand: true, model: true } } },
      orderBy: { scheduledDate: "asc" },
    }),
    prisma.deviceMaintenance.findMany({
      where: { tenantId, deletedAt: null, scheduledDate: { gte: now, lte: in7Days }, completedDate: null },
      include: { device: { select: { id: true, serialNo: true, brand: true, model: true } } },
      orderBy: { scheduledDate: "asc" },
    }),
    prisma.deviceMaintenance.findMany({
      where: { tenantId, deletedAt: null, scheduledDate: { gte: in7Days, lte: in15Days }, completedDate: null },
      include: { device: { select: { id: true, serialNo: true, brand: true, model: true } } },
      orderBy: { scheduledDate: "asc" },
    }),
  ]);

  const toItem = (m: typeof overdue[number]): MaintenanceItemData => ({
    deviceId: m.device.id, serialNo: m.device.serialNo,
    brand: m.device.brand, model: m.device.model,
    customerName: null, customerPhone: null,
    daysUntilDue: m.scheduledDate ? Math.ceil((m.scheduledDate.getTime() - now.getTime()) / (86400000)) : null,
    daysOverdue: m.scheduledDate ? Math.ceil((now.getTime() - m.scheduledDate.getTime()) / (86400000)) : null,
    dueDate: m.scheduledDate?.toISOString() ?? "",
    reason: m.maintenanceType ?? "Bakım",
    filterName: m.description ?? null,
  });

  return {
    upcoming15Count: upcoming15.length,
    upcoming7Count: upcoming7.length,
    overdueCount: overdue.length,
    upcoming15: upcoming15.map(toItem),
    upcoming7: upcoming7.map(toItem),
    overdue: overdue.map(toItem),
  };
}

export async function loadOverdueQueue(tenantId: string): Promise<OverdueQueueItem[]> {
  const tickets = await prisma.serviceTicket.findMany({
    where: {
      tenantId, deletedAt: null,
      status: { in: ["PENDING", "ASSIGNED", "IN_PROGRESS"] },
      issueDesc: { startsWith: "Gecikmiş bakım:" },
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      device: { select: { id: true, serialNo: true, brand: true, model: true } },
      technician: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return tickets.map(t => ({
    id: t.id, ticketNo: t.ticketNo, issueDesc: t.issueDesc, status: t.status,
    customerName: t.customer?.name ?? null, customerPhone: t.customer?.phone ?? null,
    deviceSerialNo: t.device.serialNo, deviceBrand: t.device.brand, deviceModel: t.device.model,
    technicianName: t.technician?.name ?? null,
    createdAt: t.createdAt.toISOString(), scheduledAt: t.scheduledAt?.toISOString() ?? null,
  }));
}

export async function loadRevenueStats(tenantId: string): Promise<RevenueStatsData> {
  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [allPayments, todayPayments, pendingPayments, monthlyPayments] = await Promise.all([
    prisma.servicePayment.findMany({ where: { tenantId, status: "PAID" } }),
    prisma.servicePayment.findMany({ where: { tenantId, status: "PAID", paidAt: { gte: todayStart } } }),
    prisma.servicePayment.aggregate({
      where: { tenantId, status: { in: ["PENDING", "OVERDUE"] } },
      _sum: { amount: true },
    }),
    prisma.servicePayment.findMany({
      where: { tenantId, status: "PAID", paidAt: { gte: sixMonthsAgo } },
      select: { amount: true, paidAt: true },
    }),
  ]);

  // Group by method
  const byMethod = new Map<string, { total: number; count: number }>();
  for (const p of allPayments) {
    const entry = byMethod.get(p.paymentMethod) ?? { total: 0, count: 0 };
    entry.total += Number(p.amount);
    entry.count += 1;
    byMethod.set(p.paymentMethod, entry);
  }

  // Group by month
  const monthlyMap = new Map<string, { total: number; count: number }>();
  for (const p of monthlyPayments) {
    if (!p.paidAt) continue;
    const month = p.paidAt.toISOString().slice(0, 7);
    const entry = monthlyMap.get(month) ?? { total: 0, count: 0 };
    entry.total += Number(p.amount);
    entry.count += 1;
    monthlyMap.set(month, entry);
  }

  return {
    totalRevenue: allPayments.reduce((s, p) => s + Number(p.amount), 0),
    collectedToday: todayPayments.reduce((s, p) => s + Number(p.amount), 0),
    pendingAmount: Number(pendingPayments._sum.amount ?? 0),
    overdueAmount: 0,
    byMethod: Array.from(byMethod.entries()).map(([method, v]) => ({ method, ...v })),
    byTechnician: [],
    monthlyRevenue: Array.from(monthlyMap.entries()).map(([month, v]) => ({ month, ...v })),
  };
}
