import { NextResponse } from 'next/server';
import { MaintenanceRepository } from '@/repositories/maintenance.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * GET /api/maintenance/reminders
 *
 * Returns maintenance reminder dashboard data for the current tenant.
 * Used by the dashboard to show upcoming and overdue maintenance.
 */
export async function GET() {
  const auth = await requireRole('viewer');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  try {
    const repo = new MaintenanceRepository({
      tenantId: auth.tenantId,
      role: auth.role!,
      userId: auth.userId,
    });

    const cards = await repo.getDashboardMaintenanceCards();
    const recentReminders = await repo.getDashboardReminders(10);

    return NextResponse.json({
      data: {
        upcoming15Count: cards.upcoming15Count,
        upcoming7Count: cards.upcoming7Count,
        overdueCount: cards.overdueCount,
        upcoming15: cards.upcoming15.map(serializeItem),
        upcoming7: cards.upcoming7.map(serializeItem),
        overdue: cards.overdue.map(serializeItem),
        recentReminders: recentReminders.map((r) => ({
          id: r.id,
          reminderType: r.reminderType,
          status: r.status,
          sentAt: r.sentAt?.toISOString() ?? null,
          recipientPhone: r.recipientPhone,
          device: r.device,
          customer: r.customer,
        })),
      },
    });
  } catch (e: any) {
    return NextResponse.json({
      error: { code: 'INTERNAL_ERROR', message: e.message },
    }, { status: 500 });
  }
}

function serializeItem(item: {
  device: any;
  daysUntilDue?: number;
  daysOverdue?: number;
  dueDate: Date;
  reason: string;
  filterName?: string;
}) {
  return {
    deviceId: item.device.id,
    serialNo: item.device.serialNo,
    brand: item.device.brand,
    model: item.device.model,
    customerName: item.device.customer?.name ?? null,
    customerPhone: item.device.customer?.phone ?? null,
    daysUntilDue: item.daysUntilDue ?? null,
    daysOverdue: item.daysOverdue ?? null,
    dueDate: item.dueDate.toISOString(),
    reason: item.reason,
    filterName: item.filterName ?? null,
  };
}
