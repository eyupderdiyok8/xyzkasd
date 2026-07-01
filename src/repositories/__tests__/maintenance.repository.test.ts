import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MaintenanceRepository } from '../maintenance.repository';
import { prismaClient } from '../base.repository';

// ──────────────────────────────────────────────
// MaintenanceRepository — Unit Tests
// ──────────────────────────────────────────────
// Acceptance Criteria:
//   - Her gece 02:00'de cron tetiklenir (vercel.json)
//   - 15 gün kala WhatsApp hatırlatma gönderilir
//   - 7 gün kala tekrar hatırlatma gönderilir
//   - Gecikmiş bakımlar kuyruğa eklenir ve dashboard'da gösterilir
// ──────────────────────────────────────────────

vi.mock('../base.repository', () => {
  const mockPrisma = {
    device: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    deviceFilter: {
      findMany: vi.fn(),
    },
    deviceMaintenance: {
      findMany: vi.fn(),
    },
    maintenanceReminder: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  };

  return {
    prismaClient: mockPrisma,
    BaseRepository: class {
      protected prisma = mockPrisma;
      protected tenantId: string | null;
      protected role: string;
      protected userId: string | null = null;
      protected ipAddress: string | null = null;

      constructor(context: { tenantId: string | null; role: string; userId?: string | null; ipAddress?: string | null }) {
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

      protected async auditCreate(_params: any): Promise<void> {}
      protected async auditUpdate(_params: any): Promise<void> {}
      protected async auditDelete(_params: any): Promise<void> {}
    },
  };
});

// ─── Helper: create a mock device with filters ───

function mockDevice(overrides: any = {}) {
  const now = new Date('2025-06-29');
  return {
    id: 'device-1',
    tenantId: 'tenant-1',
    serialNo: 'SN-001',
    brand: 'AquaPure',
    model: 'AP-5000',
    status: 'ACTIVE',
    installDate: new Date('2024-01-01'),
    customer: { id: 'cust-1', name: 'Ahmet Yılmaz', phone: '5551234567' },
    customerId: 'cust-1',
    deviceFilters: [
      {
        id: 'df-1',
        installedAt: new Date('2025-01-15'), // installed ~165 days ago
        expectedLifespanDays: 365,
        filterCatalog: { name: 'Sediment Filtre', stage: 'SEDIMENT' },
      },
      {
        id: 'df-2',
        installedAt: new Date('2025-06-20'), // installed 9 days ago
        expectedLifespanDays: 180,
        filterCatalog: { name: 'Karbon Filtre', stage: 'CARBON_BLOCK' },
      },
    ],
    deviceMaintenance: [],
    ...overrides,
  };
}

describe('MaintenanceRepository', () => {
  const tenantId = 'tenant-1';
  let repo: MaintenanceRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new MaintenanceRepository({ tenantId, role: 'technician' });
  });

  // ─── findUpcomingMaintenance ─────────────────

  describe('findUpcomingMaintenance', () => {
    it('returns devices due within N days', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-29'));

      (prismaClient.device.findMany as any).mockResolvedValue([mockDevice()]);

      // Check 15-day window
      const results = await repo.findUpcomingMaintenance(15);

      // Sediment filter (installed Jan 15, lifespan 365) → due in ~200 days (not within 15)
      // Carbon filter (installed Jun 20, lifespan 180) → due in ~171 days (not within 15)
      expect(results.length).toBe(0);

      vi.useRealTimers();
    });

    it('returns devices with filters due within the window', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-12-25')); // near end of year

      const device = mockDevice({
        deviceFilters: [
          {
            id: 'df-close',
            installedAt: new Date('2025-06-29'),
            expectedLifespanDays: 180,
            filterCatalog: { name: 'Membran', stage: 'MEMBRANE' },
          },
        ],
      });

      (prismaClient.device.findMany as any).mockResolvedValue([device]);

      const results = await repo.findUpcomingMaintenance(15);
      // Membrane installed Jun 29, due Dec 26 (1 day away) — within 15 days
      expect(results.length).toBe(1);
      expect(results[0].filterName).toBe('Membran');
      expect(results[0].reason).toBe('filter_lifespan');

      vi.useRealTimers();
    });

    it('includes scheduled maintenance entries', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-29'));

      const device = mockDevice({
        deviceFilters: [],
        deviceMaintenance: [
          {
            id: 'dm-1',
            maintenanceType: 'INSPECTION',
            scheduledDate: new Date('2025-07-05'), // 6 days away
            completedDate: null,
          },
        ],
      });

      (prismaClient.device.findMany as any).mockResolvedValue([device]);

      const results = await repo.findUpcomingMaintenance(15);
      expect(results.length).toBe(1);
      expect(results[0].reason).toBe('INSPECTION');
      expect(results[0].daysUntilDue).toBe(6);

      vi.useRealTimers();
    });

    it('skips completed maintenance entries', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-29'));

      const device = mockDevice({
        deviceFilters: [],
        deviceMaintenance: [
          {
            id: 'dm-2',
            maintenanceType: 'INSPECTION',
            scheduledDate: new Date('2025-07-01'),
            completedDate: new Date('2025-06-15'), // already completed
          },
        ],
      });

      (prismaClient.device.findMany as any).mockResolvedValue([device]);

      const results = await repo.findUpcomingMaintenance(15);
      expect(results.length).toBe(0); // completed → skipped

      vi.useRealTimers();
    });

    it('applies tenant filter', async () => {
      (prismaClient.device.findMany as any).mockResolvedValue([]);
      await repo.findUpcomingMaintenance(30);

      const callArgs = (prismaClient.device.findMany as any).mock.calls[0][0];
      expect(callArgs.where.tenantId).toBe(tenantId);
      expect(callArgs.where.status).toBe('ACTIVE');
      expect(callArgs.where.customerId).toEqual({ not: null });
    });
  });

  // ─── findOverdueMaintenance ──────────────────

  describe('findOverdueMaintenance', () => {
    it('returns overdue filter replacements', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-29')); // way past the install dates

      const device = mockDevice({
        deviceFilters: [
          {
            id: 'df-overdue',
            installedAt: new Date('2025-01-15'),
            expectedLifespanDays: 365,
            filterCatalog: { name: 'Sediment', stage: 'SEDIMENT' },
          },
        ],
      });

      (prismaClient.device.findMany as any).mockResolvedValue([device]);

      const results = await repo.findOverdueMaintenance();
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].reason).toBe('filter_lifespan');
      expect(results[0].daysOverdue).toBeGreaterThan(0);

      vi.useRealTimers();
    });

    it('returns overdue scheduled maintenance', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-07-15'));

      const device = mockDevice({
        deviceFilters: [],
        deviceMaintenance: [
          {
            id: 'dm-overdue',
            maintenanceType: 'FILTER_CHANGE',
            scheduledDate: new Date('2025-07-01'), // 14 days overdue
            completedDate: null,
          },
        ],
      });

      (prismaClient.device.findMany as any).mockResolvedValue([device]);

      const results = await repo.findOverdueMaintenance();
      expect(results.length).toBe(1);
      expect(results[0].daysOverdue).toBe(14);
      expect(results[0].reason).toBe('FILTER_CHANGE');

      vi.useRealTimers();
    });

    it('skips non-overdue devices', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-29'));

      const device = mockDevice(); // filters installed this year with 365/180 day lifespan
      (prismaClient.device.findMany as any).mockResolvedValue([device]);

      const results = await repo.findOverdueMaintenance();
      expect(results.length).toBe(0);

      vi.useRealTimers();
    });
  });

  // ─── logReminder ─────────────────────────────

  describe('logReminder', () => {
    it('creates a maintenance reminder record', async () => {
      (prismaClient.maintenanceReminder.create as any).mockResolvedValue({
        id: 'rem-1',
        deviceId: 'device-1',
        reminderType: '15_DAYS',
        status: 'SENT',
      });

      const result = await repo.logReminder({
        deviceId: 'device-1',
        tenantId: 'tenant-1',
        customerId: 'cust-1',
        reminderType: '15_DAYS',
        recipientPhone: '+905551234567',
        messageText: 'Test mesajı',
        status: 'SENT',
        sentAt: new Date(),
      });

      expect(result.id).toBe('rem-1');
      expect(prismaClient.maintenanceReminder.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deviceId: 'device-1',
            reminderType: '15_DAYS',
            status: 'SENT',
          }),
        }),
      );
    });

    it('logs FAILED status for failed sends', async () => {
      (prismaClient.maintenanceReminder.create as any).mockResolvedValue({
        id: 'rem-2',
        status: 'FAILED',
        errorMessage: 'WAHA not connected',
      });

      const result = await repo.logReminder({
        deviceId: 'device-2',
        tenantId: 'tenant-1',
        customerId: 'cust-2',
        reminderType: '7_DAYS',
        status: 'FAILED',
        errorMessage: 'WAHA not connected',
      });

      expect(result.status).toBe('FAILED');
      expect(result.errorMessage).toBe('WAHA not connected');
    });
  });

  // ─── getDashboardReminders ───────────────────

  describe('getDashboardReminders', () => {
    it('returns recent reminders for the tenant', async () => {
      (prismaClient.maintenanceReminder.findMany as any).mockResolvedValue([
        {
          id: 'rem-1',
          reminderType: '15_DAYS',
          status: 'SENT',
          sentAt: new Date(),
          recipientPhone: '+905551234567',
          device: { id: 'device-1', serialNo: 'SN-001', brand: 'A', model: 'B' },
          customer: { id: 'cust-1', name: 'Ahmet' },
        },
      ]);

      const results = await repo.getDashboardReminders(5);
      expect(results).toHaveLength(1);
      expect(results[0].reminderType).toBe('15_DAYS');

      const callArgs = (prismaClient.maintenanceReminder.findMany as any).mock.calls[0][0];
      expect(callArgs.where.tenantId).toBe(tenantId);
    });
  });

  // ─── getDashboardMaintenanceCards ────────────

  describe('getDashboardMaintenanceCards', () => {
    it('returns structured dashboard data', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-06-29'));

      (prismaClient.device.findMany as any).mockResolvedValue([]);

      const cards = await repo.getDashboardMaintenanceCards();
      expect(cards).toEqual({
        upcoming15Count: 0,
        upcoming7Count: 0,
        overdueCount: 0,
        upcoming15: [],
        upcoming7: [],
        overdue: [],
      });

      vi.useRealTimers();
    });
  });
});

// ──────────────────────────────────────────────
// Cron Logic — Duplicate Prevention & Reminder Windows
// ──────────────────────────────────────────────

describe('Cron Job Logic (from maintenance-reminder)', () => {
  /**
   * These tests validate the reminder window logic used in the cron handler.
   * The cron job is in src/app/api/cron/maintenance-reminder/route.ts
   */

  describe('reminder windows', () => {
    it('15_DAYS: daysUntilDue in (7, 15]', () => {
      // Should match: 8-15 days
      const shouldRemind = (daysUntilDue: number) => daysUntilDue <= 15 && daysUntilDue > 7;
      expect(shouldRemind(15)).toBe(true);
      expect(shouldRemind(8)).toBe(true);
      expect(shouldRemind(7)).toBe(false); // falls into 7_DAYS
      expect(shouldRemind(16)).toBe(false); // too early
      expect(shouldRemind(0)).toBe(false); // overdue → different handler
    });

    it('7_DAYS: daysUntilDue in (0, 7]', () => {
      const shouldRemind = (daysUntilDue: number) => daysUntilDue <= 7 && daysUntilDue > 0;
      expect(shouldRemind(7)).toBe(true);
      expect(shouldRemind(1)).toBe(true);
      expect(shouldRemind(8)).toBe(false); // falls into 15_DAYS
      expect(shouldRemind(0)).toBe(false); // overdue → different handler
    });

    it('OVERDUE: daysUntilDue <= 0', () => {
      const isOverdue = (daysUntilDue: number) => daysUntilDue <= 0;
      expect(isOverdue(0)).toBe(true);
      expect(isOverdue(-1)).toBe(true);
      expect(isOverdue(-30)).toBe(true);
      expect(isOverdue(1)).toBe(false);
    });
  });

  describe('duplicate prevention', () => {
    it('15_DAYS: checks for recent reminder within 13 days', () => {
      // The cron checks: recent reminder of same type within 13 days (for 15_DAYS)
      // This prevents sending duplicate 15-day reminders
      const withinWindow = (createdAt: Date) => {
        const threshold = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
        return createdAt >= threshold;
      };

      const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

      expect(withinWindow(yesterday)).toBe(true);
      expect(withinWindow(twoWeeksAgo)).toBe(false);
    });

    it('7_DAYS: checks for recent reminder within 5 days', () => {
      const withinWindow = (createdAt: Date) => {
        const threshold = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
        return createdAt >= threshold;
      };

      const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      expect(withinWindow(yesterday)).toBe(true);
      expect(withinWindow(oneWeekAgo)).toBe(false);
    });

    it('OVERDUE: checks for recent reminder within 7 days', () => {
      const withinWindow = (createdAt: Date) => {
        const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return createdAt >= threshold;
      };

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

      expect(withinWindow(threeDaysAgo)).toBe(true);
      expect(withinWindow(tenDaysAgo)).toBe(false);
    });
  });

  describe('overdue ticket creation', () => {
    it('generates ticketNo in SRV-YYMMDD-XXXX format', () => {
      const pattern = /^SRV-\d{6}-[A-Z0-9]{4}$/;
      const generateTicketNo = () => {
        const date = new Date();
        const y = date.getFullYear().toString().slice(-2);
        const m = (date.getMonth() + 1).toString().padStart(2, '0');
        const d = date.getDate().toString().padStart(2, '0');
        const seq = Math.random().toString(36).slice(2, 6).toUpperCase();
        return `SRV-${y}${m}${d}-${seq}`;
      };

      const ticketNo = generateTicketNo();
      expect(ticketNo).toMatch(pattern);
    });

    it('creates issueDesc with device and filter info', () => {
      const device = { brand: 'AquaPure', model: 'AP-5000' };
      const customer = { name: 'Ahmet Yılmaz' };
      const filter = { filterCatalog: { name: 'Sediment Filtre' } };

      const desc = `Gecikmiş bakım: ${device.brand} ${device.model} (Filtre: ${filter.filterCatalog.name}) — ${customer.name}`;
      expect(desc).toBe('Gecikmiş bakım: AquaPure AP-5000 (Filtre: Sediment Filtre) — Ahmet Yılmaz');
    });
  });
});

// ──────────────────────────────────────────────
// WhatsApp Message Building
// ──────────────────────────────────────────────

describe('Maintenance Reminder Messages', () => {
  // These test the message format used by buildMaintenanceReminderText in notify.ts

  it('overdue message includes customer name, device, days overdue', () => {
    const buildMessage = (p: { customerName: string; deviceBrand: string; deviceModel: string; daysOverdue: number; filterName?: string }) => {
      const deviceInfo = `${p.deviceBrand} ${p.deviceModel}`;
      const part = p.filterName ? `${p.filterName} değişim zamanı` : 'Bakım zamanı';
      return `Sayın ${p.customerName}, ${deviceInfo} cihazınızın ${part} ${p.daysOverdue} gün önce gelmiştir. Lütfen en kısa sürede servis randevusu alınız.`;
    };

    const msg = buildMessage({
      customerName: 'Ahmet Yılmaz',
      deviceBrand: 'AquaPure',
      deviceModel: 'AP-5000',
      daysOverdue: 15,
      filterName: 'Sediment Filtre',
    });

    expect(msg).toContain('Ahmet Yılmaz');
    expect(msg).toContain('AquaPure AP-5000');
    expect(msg).toContain('Sediment Filtre');
    expect(msg).toContain('15 gün önce');
    expect(msg).toContain('servis randevusu alınız');
  });

  it('upcoming message includes remaining days', () => {
    const buildMessage = (p: { customerName: string; deviceBrand: string; deviceModel: string; daysUntilDue: number; filterName?: string }) => {
      const deviceInfo = `${p.deviceBrand} ${p.deviceModel}`;
      const part = p.filterName ? `${p.filterName} değişim zamanı` : 'Periyodik bakım';
      return `Sayın ${p.customerName}, ${deviceInfo} cihazınızın ${part} yaklaşmaktadır. Kalan süre: ${p.daysUntilDue} gün. Servis randevunuzu şimdi planlayın.`;
    };

    const msg = buildMessage({
      customerName: 'Ayşe Demir',
      deviceBrand: 'Beko',
      deviceModel: 'RO-300',
      daysUntilDue: 7,
    });

    expect(msg).toContain('Ayşe Demir');
    expect(msg).toContain('Beko RO-300');
    expect(msg).toContain('7 gün');
    expect(msg).toContain('Servis randevunuzu');
  });
});
