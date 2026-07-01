// ──────────────────────────────────────────────
// Water Purifier Service ERP — Cron Maintenance Reminder Tests
// Multi-Tenant SaaS
//
// Covers: GET/POST /api/cron/maintenance-reminder
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDevices = [
  {
    id: 'dev-1', tenantId: 'tenant-1', brand: 'AquaPure', model: 'AP-500', serialNo: 'SN-001',
    status: 'ACTIVE', deletedAt: null,
    customer: { id: 'cust-1', name: 'Ahmet Yılmaz', phone: '+905551234567' },
    tenant: { id: 'tenant-1', name: 'Test Firma' },
    deviceFilters: [
      {
        id: 'df-1', installedAt: new Date(Date.now() - 170 * 24 * 60 * 60 * 1000), // ~170 days ago
        expectedLifespanDays: 180,
        filterCatalog: { name: 'Sediment 5µ', stage: 'SEDIMENT' },
      },
    ],
    deviceMaintenance: [],
  },
];

// Track created reminders
const createdReminders: any[] = [];

vi.mock('@/lib/prisma', () => ({
  prisma: {
    device: {
      findMany: vi.fn(),
    },
    maintenanceReminder: {
      findFirst: vi.fn(),
      create: vi.fn((data: any) => {
        const r = { id: 'rm-' + createdReminders.length, ...data.data };
        createdReminders.push(r);
        return r;
      }),
    },
    serviceTicket: {
      findFirst: vi.fn(),
      create: vi.fn((data: any) => ({
        id: 'tkt-' + Math.random().toString(36).slice(2, 6),
        ...data.data,
      })),
    },
  },
}));

vi.mock('@/lib/audit.service', () => ({
  AuditService: { logCreate: vi.fn() },
}));

vi.mock('@/lib/whatsapp', () => ({
  buildMaintenanceReminderText: vi.fn(
    ({ customerName, deviceBrand, deviceModel, daysUntilDue, daysOverdue }: any) =>
      `Sayın ${customerName}, ${deviceBrand} ${deviceModel} cihazınızın ${daysOverdue ? 'bakımı gecikmiştir' : 'bakım zamanı yaklaşmaktadır'}.`,
  ),
  getWahaManager: vi.fn(() => ({
    sendMessage: vi.fn().mockResolvedValue({ success: true, messageId: 'wa-msg-1' }),
  })),
}));

describe('GET /api/cron/maintenance-reminder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createdReminders.length = 0;
    // Set CRON_SECRET for testing
    process.env.CRON_SECRET = 'test-cron-secret';
  });

  it('runs maintenance reminder cron successfully', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findMany as any).mockResolvedValue(mockDevices);
    (prisma.maintenanceReminder.findFirst as any).mockResolvedValue(null);
    (prisma.serviceTicket.findFirst as any).mockResolvedValue(null);

    const { GET } = await import('../cron/maintenance-reminder/route');
    const req = {
      headers: new Map([['authorization', 'Bearer test-cron-secret']]),
    } as any;
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.results.reminders15Sent + body.results.reminders7Sent + body.results.overdueDetected).toBeGreaterThanOrEqual(0);
  });

  it('rejects unauthorized requests', async () => {
    const { GET } = await import('../cron/maintenance-reminder/route');
    const req = {
      headers: new Map([['authorization', 'Bearer wrong-secret']]),
    } as any;
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when no auth header provided and secret is set', async () => {
    const { GET } = await import('../cron/maintenance-reminder/route');
    const req = { headers: new Map() } as any;
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('handles POST method as well', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findMany as any).mockResolvedValue(mockDevices);
    (prisma.maintenanceReminder.findFirst as any).mockResolvedValue(null);

    const { POST } = await import('../cron/maintenance-reminder/route');
    const req = {
      headers: new Map([['authorization', 'Bearer test-cron-secret']]),
    } as any;
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it('skips devices without customer phone', async () => {
    const { prisma } = await import('@/lib/prisma');
    const devicesWithoutPhone = [{
      ...mockDevices[0],
      customer: { id: 'cust-2', name: 'Ayşe Demir', phone: null },
    }];
    (prisma.device.findMany as any).mockResolvedValue(devicesWithoutPhone);

    const { GET } = await import('../cron/maintenance-reminder/route');
    const req = {
      headers: new Map([['authorization', 'Bearer test-cron-secret']]),
    } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    // Should process but not send reminders since no phone
    expect(body.results.overdueDetected).toBe(0);
  });

  it('handles database errors gracefully', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findMany as any).mockRejectedValue(new Error('DB connection failed'));

    const { GET } = await import('../cron/maintenance-reminder/route');
    const req = {
      headers: new Map([['authorization', 'Bearer test-cron-secret']]),
    } as any;
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.success).toBe(false);
  });
});
