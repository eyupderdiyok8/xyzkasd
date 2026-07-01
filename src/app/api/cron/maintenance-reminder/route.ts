import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuditService } from '@/lib/audit.service';
import { buildMaintenanceReminderText } from '@/lib/whatsapp';
import { getWahaManager } from '@/lib/whatsapp/index';

/**
 * Vercel Cron Job — Gece 02:00 bakım hatırlatma
 *
 * Cron expression: 0 2 * * *
 * URL: /api/cron/maintenance-reminder
 *
 * This endpoint is secured via the CRON_SECRET env var.
 * Vercel Cron adds the "authorization" header automatically
 * when configured in vercel.json with the same secret.
 */
export async function GET(req: Request) {
  return handleCron(req);
}

export async function POST(req: Request) {
  return handleCron(req);
}

async function handleCron(req: Request) {
  // ── Security: verify CRON_SECRET ──────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const expectedSecret = process.env.CRON_SECRET;

  if (expectedSecret) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (token !== expectedSecret) {
      console.warn('[cron] Unauthorized cron attempt');
      return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } }, { status: 401 });
    }
  } else {
    // In development, allow without secret
    if (process.env.NODE_ENV === 'production') {
      console.warn('[cron] CRON_SECRET not set — cron disabled');
      return NextResponse.json({ error: { code: 'CONFIG_ERROR', message: 'CRON_SECRET not configured' } }, { status: 500 });
    }
  }

  const startTime = Date.now();
  const results: {
    reminders15Sent: number;
    reminders7Sent: number;
    overdueDetected: number;
    ticketsCreated: number;
    errors: string[];
  } = {
    reminders15Sent: 0,
    reminders7Sent: 0,
    overdueDetected: 0,
    ticketsCreated: 0,
    errors: [],
  };

  try {
    // ── Step 1: Find all active devices with customers ──────────
    const devices = await prisma.device.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        customerId: { not: null },
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        tenant: { select: { id: true, name: true } },
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

    console.log(`[cron] Processing maintenance for ${devices.length} devices`);

    const now = new Date();

    for (const device of devices) {
      const customer = device.customer;
      if (!customer || !customer.phone) continue;

      // ── Step 2: Process DeviceFilter lifespans ────────────
      for (const df of device.deviceFilters) {
        const dueDate = new Date(df.installedAt.getTime() + df.expectedLifespanDays * 24 * 60 * 60 * 1000);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // Check for overdue (daysUntilDue < 0)
        if (daysUntilDue <= 0) {
          results.overdueDetected++;

          // Check if we already sent an overdue reminder recently
          const recent = await prisma.maintenanceReminder.findFirst({
            where: {
              deviceId: device.id,
              reminderType: 'OVERDUE',
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          });
          if (recent) continue; // already reminded this week

          await sendAndLogReminder(device, customer, {
            reminderType: 'OVERDUE',
            recipientPhone: customer.phone,
            buildMessage: () =>
              buildMaintenanceReminderText({
                customerName: customer.name,
                deviceBrand: device.brand,
                deviceModel: device.model,
                daysUntilDue: null,
                daysOverdue: Math.abs(daysUntilDue),
                filterName: df.filterCatalog.name,
              }),
          });

          // ── Auto-create a PENDING service ticket for the overdue queue ──
          await ensureOverdueTicket(results, device, customer, df);
          continue;
        }

        // 15-day reminder
        if (daysUntilDue <= 15 && daysUntilDue > 7) {
          const recent = await prisma.maintenanceReminder.findFirst({
            where: {
              deviceId: device.id,
              reminderType: '15_DAYS',
              createdAt: { gte: new Date(Date.now() - 13 * 24 * 60 * 60 * 1000) },
            },
          });
          if (!recent) {
            await sendAndLogReminder(device, customer, {
              reminderType: '15_DAYS',
              recipientPhone: customer.phone,
              buildMessage: () =>
                buildMaintenanceReminderText({
                  customerName: customer.name,
                  deviceBrand: device.brand,
                  deviceModel: device.model,
                  daysUntilDue,
                  daysOverdue: null,
                  filterName: df.filterCatalog.name,
                }),
            });
            results.reminders15Sent++;
          }
        }

        // 7-day reminder
        if (daysUntilDue <= 7 && daysUntilDue > 0) {
          const recent = await prisma.maintenanceReminder.findFirst({
            where: {
              deviceId: device.id,
              reminderType: '7_DAYS',
              createdAt: { gte: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
            },
          });
          if (!recent) {
            await sendAndLogReminder(device, customer, {
              reminderType: '7_DAYS',
              recipientPhone: customer.phone,
              buildMessage: () =>
                buildMaintenanceReminderText({
                  customerName: customer.name,
                  deviceBrand: device.brand,
                  deviceModel: device.model,
                  daysUntilDue,
                  daysOverdue: null,
                  filterName: df.filterCatalog.name,
                }),
            });
            results.reminders7Sent++;
          }
        }
      }

      // ── Step 3: Check DeviceMaintenance scheduled entries ──
      for (const dm of device.deviceMaintenance) {
        if (!dm.scheduledDate || dm.completedDate) continue;
        const daysUntilDue = Math.ceil((dm.scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue <= 0) {
          results.overdueDetected++;
          const recent = await prisma.maintenanceReminder.findFirst({
            where: {
              maintenanceId: dm.id,
              reminderType: 'OVERDUE',
              createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
          });
          if (!recent) {
            await sendAndLogReminder(device, customer, {
              reminderType: 'OVERDUE',
              recipientPhone: customer.phone,
              maintenanceId: dm.id,
              buildMessage: () =>
                buildMaintenanceReminderText({
                  customerName: customer.name,
                  deviceBrand: device.brand,
                  deviceModel: device.model,
                  daysUntilDue: null,
                  daysOverdue: Math.abs(daysUntilDue),
                }),
            });

            // ── Auto-create a PENDING service ticket for the overdue queue ──
            await ensureOverdueTicket(results, device, customer, undefined, dm);
          }
        } else if (daysUntilDue <= 15 && daysUntilDue > 7) {
          const recent = await prisma.maintenanceReminder.findFirst({
            where: { maintenanceId: dm.id, reminderType: '15_DAYS' },
          });
          if (!recent) {
            await sendAndLogReminder(device, customer, {
              reminderType: '15_DAYS',
              recipientPhone: customer.phone,
              maintenanceId: dm.id,
              buildMessage: () =>
                buildMaintenanceReminderText({
                  customerName: customer.name,
                  deviceBrand: device.brand,
                  deviceModel: device.model,
                  daysUntilDue,
                  daysOverdue: null,
                }),
            });
            results.reminders15Sent++;
          }
        } else if (daysUntilDue <= 7 && daysUntilDue > 0) {
          const recent = await prisma.maintenanceReminder.findFirst({
            where: { maintenanceId: dm.id, reminderType: '7_DAYS' },
          });
          if (!recent) {
            await sendAndLogReminder(device, customer, {
              reminderType: '7_DAYS',
              recipientPhone: customer.phone,
              maintenanceId: dm.id,
              buildMessage: () =>
                buildMaintenanceReminderText({
                  customerName: customer.name,
                  deviceBrand: device.brand,
                  deviceModel: device.model,
                  daysUntilDue,
                  daysOverdue: null,
                }),
            });
            results.reminders7Sent++;
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[cron] Maintenance reminders completed in ${duration}ms`, results);

    return NextResponse.json({
      success: true,
      duration: `${duration}ms`,
      results,
    });
  } catch (err: any) {
    console.error('[cron] Maintenance reminders failed:', err.message);
    return NextResponse.json({
      success: false,
      error: err.message,
      results,
    }, { status: 500 });
  }
}

// ─── Helper — send WhatsApp and log reminder ──────────

/**
 * Auto-create a PENDING service ticket for overdue maintenance if one
 * doesn't already exist for the same device.
 */
async function ensureOverdueTicket(
  results: {
    reminders15Sent: number;
    reminders7Sent: number;
    overdueDetected: number;
    ticketsCreated: number;
    errors: string[];
  },
  device: { id: string; tenantId: string; brand: string; model: string; serialNo?: string },
  customer: { id: string; name: string; phone: string },
  deviceFilter?: { id: string; filterCatalog: { name: string } },
  deviceMaintenance?: { id: string; maintenanceType: string },
) {
  // Check if a PENDING ticket already exists for this device's overdue maintenance
  const existing = await prisma.serviceTicket.findFirst({
    where: {
      deletedAt: null,
      deviceId: device.id,
      status: { in: ['PENDING', 'ASSIGNED', 'IN_PROGRESS'] },
    },
  });
  if (existing) return; // already queued

  const filterPart = deviceFilter
    ? ` (Filtre: ${deviceFilter.filterCatalog.name})`
    : '';
  const typePart = deviceMaintenance
    ? ` (${deviceMaintenance.maintenanceType})`
    : '';
  const desc = `Gecikmiş bakım: ${device.brand} ${device.model}${filterPart}${typePart} — ${customer.name}`;

  const ticket = await prisma.serviceTicket.create({
    data: {
      ticketNo: generateTicketNo(),
      tenantId: device.tenantId,
      customerId: customer.id,
      deviceId: device.id,
      issueDesc: desc,
      status: 'PENDING',
      scheduledAt: new Date(),
    },
  });

  await AuditService.logCreate({
    tenantId: device.tenantId,
    userId: null,
    entity: 'service_ticket',
    entityId: ticket.id,
    newValues: {
      ticketNo: ticket.ticketNo,
      issueDesc: desc,
      status: 'PENDING',
      deviceId: device.id,
      customerId: customer.id,
    },
    ipAddress: null,
  });

  results.ticketsCreated++;
}

/**
 * Generate a unique service ticket number.
 * Format: SRV-YYMMDD-XXXX (e.g. SRV-250630-A3F2)
 */
function generateTicketNo(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const seq = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SRV-${y}${m}${d}-${seq}`;
}

async function sendAndLogReminder(
  device: {
    id: string;
    tenantId: string;
    brand: string;
    model: string;
  },
  customer: { id: string; name: string; phone: string },
  opts: {
    reminderType: string;
    recipientPhone: string;
    maintenanceId?: string;
    buildMessage: () => string;
  },
) {
  const messageText = opts.buildMessage();
  const phone = opts.recipientPhone.startsWith('+') ? opts.recipientPhone : `+90${opts.recipientPhone}`;

  // Use tenant-aware WAHA session manager
  const manager = getWahaManager();
  const result = await manager.sendMessage(device.tenantId, phone, messageText);

  const reminder = await prisma.maintenanceReminder.create({
    data: {
      deviceId: device.id,
      tenantId: device.tenantId,
      customerId: customer.id,
      maintenanceId: opts.maintenanceId ?? null,
      reminderType: opts.reminderType,
      channel: 'WHATSAPP',
      recipientPhone: phone,
      messageText,
      status: result.success ? 'SENT' : 'FAILED',
      sentAt: result.success ? new Date() : null,
      errorMessage: result.error ?? null,
    },
  });

  await AuditService.logCreate({
    tenantId: device.tenantId,
    userId: null,
    entity: 'maintenance_reminder',
    entityId: reminder.id,
    newValues: {
      deviceId: device.id,
      reminderType: opts.reminderType,
      status: result.success ? 'SENT' : 'FAILED',
      recipientPhone: phone,
    },
    ipAddress: null,
  });
}
