import { BaseRepository, prismaClient } from './base.repository';
import type { Prisma } from "@/lib/generated/client";

export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'PROMISSORY_NOTE' | 'DEFERRED';
export type PaymentStatus = 'PAID' | 'PENDING' | 'OVERDUE';

export interface CreatePaymentInput {
  ticketId: string;
  customerId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status?: PaymentStatus;
  installmentCount?: number | null;
  paidAt?: string | null;
  dueDate?: string | null;
  notes?: string | null;
}

export interface RevenueStats {
  totalRevenue: number;
  collectedToday: number;
  pendingAmount: number;
  overdueAmount: number;
  byMethod: Array<{ method: string; total: number; count: number }>;
  byTechnician: Array<{ technicianId: string; technicianName: string; total: number; count: number }>;
  monthlyRevenue: Array<{ month: string; total: number; count: number }>;
}

export class PaymentRepository extends BaseRepository {
  async create(input: CreatePaymentInput) {
    const data: any = {
      ticketId: input.ticketId,
      tenantId: this.tenantId!,
      customerId: input.customerId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      status: input.status ?? (input.paymentMethod === 'DEFERRED' ? 'PENDING' : 'PAID'),
      installmentCount: input.installmentCount ?? null,
      paidAt: input.paidAt ? new Date(input.paidAt) : (input.paymentMethod !== 'DEFERRED' ? new Date() : null),
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      notes: input.notes ?? null,
      createdBy: this.userId,
    };
    return this.prisma.servicePayment.create({ data });
  }

  async findByTicket(ticketId: string) {
    return this.prisma.servicePayment.findFirst({
      where: { ticketId, ...this.tenantFilter() },
    });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.servicePayment.findMany({
      where: { customerId, ...this.tenantFilter() },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRevenueStats(): Promise<RevenueStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const filter = { ...this.tenantFilter(), status: 'PAID' as const };

    const [allPaid, todayPaid, pending, overdue, byMethod, byTechnician, monthly] = await Promise.all([
      this.prisma.servicePayment.aggregate({ where: filter, _sum: { amount: true } }),
      this.prisma.servicePayment.aggregate({
        where: { ...filter, paidAt: { gte: today, lt: tomorrow } },
        _sum: { amount: true },
      }),
      this.prisma.servicePayment.aggregate({
        where: { ...this.tenantFilter(), status: 'PENDING' },
        _sum: { amount: true },
      }),
      this.prisma.servicePayment.aggregate({
        where: { ...this.tenantFilter(), status: 'OVERDUE' },
        _sum: { amount: true },
      }),
      this.prisma.servicePayment.groupBy({
        by: ['paymentMethod'],
        where: filter,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.servicePayment.groupBy({
        by: ['createdBy'],
        where: filter,
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.servicePayment.findMany({
        where: filter,
        select: { amount: true, paidAt: true },
        orderBy: { paidAt: 'asc' },
      }),
    ]);

    // Monthly aggregation
    const monthMap = new Map<string, { total: number; count: number }>();
    for (const p of monthly) {
      if (!p.paidAt) continue;
      const key = p.paidAt.toISOString().slice(0, 7); // YYYY-MM
      const entry = monthMap.get(key) || { total: 0, count: 0 };
      entry.total += Number(p.amount);
      entry.count++;
      monthMap.set(key, entry);
    }

    // Resolve technician names
    const techIds = [...new Set(byTechnician.map(t => t.createdBy).filter(Boolean))];
    const techs = techIds.length > 0
      ? await this.prisma.technician.findMany({
          where: { id: { in: techIds as string[] } },
          select: { id: true, name: true },
        })
      : [];
    const techMap = new Map(techs.map(t => [t.id, t.name]));

    return {
      totalRevenue: Number(allPaid._sum.amount ?? 0),
      collectedToday: Number(todayPaid._sum.amount ?? 0),
      pendingAmount: Number(pending._sum.amount ?? 0),
      overdueAmount: Number(overdue._sum.amount ?? 0),
      byMethod: byMethod.map(m => ({
        method: m.paymentMethod,
        total: Number(m._sum.amount ?? 0),
        count: m._count,
      })),
      byTechnician: byTechnician.map(t => ({
        technicianId: t.createdBy ?? 'unknown',
        technicianName: techMap.get(t.createdBy ?? '') ?? 'Bilinmiyor',
        total: Number(t._sum.amount ?? 0),
        count: t._count,
      })),
      monthlyRevenue: [...monthMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, data]) => ({ month, ...data })),
    };
  }
}
