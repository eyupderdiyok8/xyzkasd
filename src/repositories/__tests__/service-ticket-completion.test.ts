import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceTicketRepository } from '../service-ticket.repository';
import { prismaClient } from '../base.repository';

// ──────────────────────────────────────────────
// ServiceTicketRepository — Service Completion Tests
// ──────────────────────────────────────────────
// Acceptance Criteria:
//   - TDS öncesi/sonrası, basınç, kaçak kontrolü girilir
//   - Değişen filtreler seçilir ve filter_tracking güncellenir
//   - Müşteri imzası canvas ile alınır
//   - PDF rapor oluşturulur ve Supabase Storage'a kaydedilir
// ──────────────────────────────────────────────

vi.mock('../base.repository', () => {
  const mockPrisma = {
    device: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    devicePhoto: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), delete: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
    tdsReading: { findMany: vi.fn(), create: vi.fn() },
    customer: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    customerPhone: { create: vi.fn(), updateMany: vi.fn() },
    customerAddress: { create: vi.fn(), updateMany: vi.fn() },
    serviceTicket: {
      findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(),
    },
    servicePhoto: { findMany: vi.fn(), create: vi.fn() },
    filterCatalog: { findMany: vi.fn().mockResolvedValue([]) },
    filterChange: { create: vi.fn() },
    deviceFilter: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    deviceMaintenance: { findMany: vi.fn(), create: vi.fn() },
    maintenanceReminder: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    tenant: { findUnique: vi.fn() },
    inventoryItem: { updateMany: vi.fn() },
    inventoryTransaction: { create: vi.fn() },
    serviceSurvey: {
      findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), upsert: vi.fn(),
    },
    coupon: { findFirst: vi.fn(), create: vi.fn() },
    $transaction: vi.fn((fn: any) => fn({ ...mockPrisma })),
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

      protected hasAccess(resourceTenantId: string): boolean {
        if (this.role === 'super_admin') return true;
        return this.tenantId === resourceTenantId;
      }

      protected async auditCreate(_params: any): Promise<void> {}
      protected async auditUpdate(_params: any): Promise<void> {}
      protected async auditDelete(_params: any): Promise<void> {}
    },
  };
});

describe('ServiceTicketRepository — Service Completion', () => {
  const tenantId = 'tenant-1';
  const ticketId = 'ticket-1';
  const deviceId = 'device-1';

  const mockTicket = {
    id: ticketId,
    tenantId,
    ticketNo: 'SRV-250101-ABC1',
    deviceId,
    customer: { id: 'cust-1', name: 'Ahmet Yılmaz', phone: '5551234567', email: null, address: 'Adres', district: 'Kadıköy', city: 'İstanbul' },
    device: { id: deviceId, serialNo: 'SN-001', brand: 'AquaPure', model: 'AP-5000', installDate: null, status: 'ACTIVE' },
    technician: { id: 'tech-1', name: 'Mehmet Teknisyen', phone: null },
    photos: [],
    filterChanges: [],
    status: 'ASSIGNED',
    issueDesc: 'Su akışı azaldı',
    workDone: null,
    resolution: null,
    customerNote: null,
    tdsBefore: null, tdsAfter: null,
    pressureBefore: null, pressureAfter: null,
    leakCheck: null, leakNotes: null,
    signatureDataUrl: null, signatureName: null,
    completedAt: null, createdAt: new Date(),
    scheduledAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── completeService: measurements ──────────

  describe('completeService', () => {
    it('records TDS before/after values', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({
        ...mockTicket, status: 'COMPLETED', tdsBefore: 450, tdsAfter: 35, completedAt: new Date(),
      });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([]);
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'dm-1' });
      (prismaClient.tdsReading.create as any).mockResolvedValue({ id: 'tds-1' });

      const repo = new ServiceTicketRepository({ tenantId, role: 'technician' });
      const result = await repo.completeService(ticketId, {
        tdsBefore: 450,
        tdsAfter: 35,
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.tdsBefore).toBe(450);
      expect(result.tdsAfter).toBe(35);

      // Verify update called with TDS values
      const updateCall = (prismaClient.serviceTicket.update as any).mock.calls[0][0];
      expect(updateCall.data.tdsBefore).toBe(450);
      expect(updateCall.data.tdsAfter).toBe(35);
    });

    it('records pressure before/after values', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({
        ...mockTicket, status: 'COMPLETED', pressureBefore: 3.5, pressureAfter: 4.2, completedAt: new Date(),
      });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([]);
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'dm-1' });

      const repo = new ServiceTicketRepository({ tenantId, role: 'technician' });
      const result = await repo.completeService(ticketId, {
        pressureBefore: 3.5,
        pressureAfter: 4.2,
      });

      const updateCall = (prismaClient.serviceTicket.update as any).mock.calls[0][0];
      expect(updateCall.data.pressureBefore).toBe(3.5);
      expect(updateCall.data.pressureAfter).toBe(4.2);
    });

    it('records leak check results', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({
        ...mockTicket, status: 'COMPLETED', leakCheck: true, leakNotes: 'Membran bağlantısında sızıntı', completedAt: new Date(),
      });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([]);
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'dm-1' });

      const repo = new ServiceTicketRepository({ tenantId, role: 'technician' });
      const result = await repo.completeService(ticketId, {
        leakCheck: true,
        leakNotes: 'Membran bağlantısında sızıntı',
      });

      const updateCall = (prismaClient.serviceTicket.update as any).mock.calls[0][0];
      expect(updateCall.data.leakCheck).toBe(true);
      expect(updateCall.data.leakNotes).toBe('Membran bağlantısında sızıntı');
    });

    it('records work done, resolution, customer note', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({
        ...mockTicket, status: 'COMPLETED', workDone: 'Membran değiştirildi', resolution: 'Su akışı normale döndü', customerNote: 'Teşekkürler', completedAt: new Date(),
      });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([]);
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'dm-1' });

      const repo = new ServiceTicketRepository({ tenantId, role: 'technician' });
      const result = await repo.completeService(ticketId, {
        workDone: 'Membran değiştirildi',
        resolution: 'Su akışı normale döndü',
        customerNote: 'Teşekkürler',
      });

      const updateCall = (prismaClient.serviceTicket.update as any).mock.calls[0][0];
      expect(updateCall.data.workDone).toBe('Membran değiştirildi');
      expect(updateCall.data.resolution).toBe('Su akışı normale döndü');
      expect(updateCall.data.customerNote).toBe('Teşekkürler');
    });

    it('records customer signature (dataUrl + name)', async () => {
      const sigUrl = 'data:image/png;base64,abc123==';
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({
        ...mockTicket, status: 'COMPLETED', signatureDataUrl: sigUrl, signatureName: 'Ahmet Yılmaz', completedAt: new Date(),
      });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([]);
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'dm-1' });

      const repo = new ServiceTicketRepository({ tenantId, role: 'technician' });
      const result = await repo.completeService(ticketId, {
        signatureDataUrl: sigUrl,
        signatureName: 'Ahmet Yılmaz',
      });

      const updateCall = (prismaClient.serviceTicket.update as any).mock.calls[0][0];
      expect(updateCall.data.signatureDataUrl).toBe(sigUrl);
      expect(updateCall.data.signatureName).toBe('Ahmet Yılmaz');
    });

    // ─── Filter Changes ──────────────────────

    it('creates FilterChange records for each replaced filter', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({
        ...mockTicket, status: 'COMPLETED', completedAt: new Date(),
      });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([]);
      (prismaClient.filterChange.create as any).mockResolvedValue({ id: 'fc-1' });
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'dm-1' });
      (prismaClient.tdsReading.create as any).mockResolvedValue({ id: 'tds-1' });

      const repo = new ServiceTicketRepository({ tenantId, role: 'technician' });
      await repo.completeService(ticketId, {
        tdsAfter: 35,
        filterChanges: [
          { filterId: 'f-sediment', quantity: 1 },
          { filterId: 'f-carbon', quantity: 2, notes: 'Ekstra değişim' },
        ],
      });

      // 2 filter change records should be created
      expect(prismaClient.filterChange.create).toHaveBeenCalledTimes(2);
    });

    it('updates existing DeviceFilter tracking on filter change', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({
        ...mockTicket, status: 'COMPLETED', completedAt: new Date(),
      });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([
        { id: 'df-1', filterCatalogId: 'f-sediment', expectedLifespanDays: 180 },
      ]);
      (prismaClient.filterChange.create as any).mockResolvedValue({ id: 'fc-1' });
      (prismaClient.deviceFilter.update as any).mockResolvedValue({ id: 'df-1' });
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'dm-1' });
      (prismaClient.tdsReading.create as any).mockResolvedValue({ id: 'tds-1' });

      const repo = new ServiceTicketRepository({ tenantId, role: 'technician' });
      await repo.completeService(ticketId, {
        tdsAfter: 35,
        filterChanges: [{ filterId: 'f-sediment', quantity: 1 }],
      });

      // Should update existing device filter (reset lifespan)
      expect(prismaClient.deviceFilter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'df-1' },
          data: expect.objectContaining({ expectedLifespanDays: 180 }),
        }),
      );
    });

    it('creates new DeviceFilter tracking when not existing', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({
        ...mockTicket, status: 'COMPLETED', completedAt: new Date(),
      });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([]);
      (prismaClient.filterChange.create as any).mockResolvedValue({ id: 'fc-1' });
      (prismaClient.deviceFilter.create as any).mockResolvedValue({ id: 'df-new' });
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'dm-1' });
      (prismaClient.tdsReading.create as any).mockResolvedValue({ id: 'tds-1' });

      const repo = new ServiceTicketRepository({ tenantId, role: 'technician' });
      await repo.completeService(ticketId, {
        tdsAfter: 35,
        filterChanges: [{ filterId: 'f-membrane', quantity: 1 }],
      });

      // Should create new device filter tracking entry
      expect(prismaClient.deviceFilter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deviceId,
            filterCatalogId: 'f-membrane',
            expectedLifespanDays: 365, // default
          }),
        }),
      );
    });

    // ─── Device Maintenance ─────────────────

    it('creates DeviceMaintenance record on completion', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({
        ...mockTicket, status: 'COMPLETED', completedAt: new Date(),
      });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([]);
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'dm-1' });

      const repo = new ServiceTicketRepository({ tenantId, role: 'technician' });
      await repo.completeService(ticketId, {});

      expect(prismaClient.deviceMaintenance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deviceId,
            tenantId,
            ticketId,
            maintenanceType: 'INSPECTION',
          }),
        }),
      );
    });

    it('sets maintenanceType to FILTER_CHANGE when filters changed', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({
        ...mockTicket, status: 'COMPLETED', completedAt: new Date(),
      });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([]);
      (prismaClient.filterChange.create as any).mockResolvedValue({ id: 'fc-1' });
      (prismaClient.deviceFilter.create as any).mockResolvedValue({ id: 'df-1' });
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'dm-1' });
      (prismaClient.tdsReading.create as any).mockResolvedValue({ id: 'tds-1' });

      const repo = new ServiceTicketRepository({ tenantId, role: 'technician' });
      await repo.completeService(ticketId, {
        tdsAfter: 35,
        filterChanges: [{ filterId: 'f-sediment', quantity: 1 }],
      });

      expect(prismaClient.deviceMaintenance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            maintenanceType: 'FILTER_CHANGE',
          }),
        }),
      );
    });

    // ─── TDS Reading ─────────────────────────

    it('records TDS reading on device when tdsAfter is provided', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({
        ...mockTicket, status: 'COMPLETED', tdsAfter: 35, completedAt: new Date(),
      });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([]);
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'dm-1' });
      (prismaClient.tdsReading.create as any).mockResolvedValue({ id: 'tds-1' });

      const repo = new ServiceTicketRepository({ tenantId, role: 'technician' });
      await repo.completeService(ticketId, { tdsAfter: 35, tdsBefore: 450 });

      expect(prismaClient.tdsReading.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deviceId,
            tenantId,
            tdsValue: 35,
            inValue: 450,
            outValue: 35,
          }),
        }),
      );
    });

    it('skips TDS reading when tdsAfter is null', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({
        ...mockTicket, status: 'COMPLETED', completedAt: new Date(),
      });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([]);
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'dm-1' });

      const repo = new ServiceTicketRepository({ tenantId, role: 'technician' });
      await repo.completeService(ticketId, {});

      // No TDS reading when tdsAfter is not provided
      expect(prismaClient.tdsReading.create).not.toHaveBeenCalled();
    });
  });

  // ─── Ticket Creation ────────────────────

  describe('create', () => {
    it('creates a ticket with auto-generated ticketNo', async () => {
      (prismaClient.serviceTicket.findUnique as any).mockResolvedValue(null);
      (prismaClient.serviceTicket.create as any).mockResolvedValue({
        id: 'new-tkt', ticketNo: 'SRV-250601-XYZ1', tenantId, customerId: 'cust-1',
        deviceId, technicianId: 'tech-1', issueDesc: 'Test sorunu', status: 'ASSIGNED',
        scheduledAt: null,
      });

      const repo = new ServiceTicketRepository({ tenantId, role: 'manager' });
      const result = await repo.create({
        tenantId, customerId: 'cust-1', deviceId, technicianId: 'tech-1',
        issueDesc: 'Test sorunu',
      });

      expect(result.ticketNo).toMatch(/^SRV-/);
      expect(result.status).toBe('ASSIGNED'); // assigned because technicianId provided
    });

    it('creates ticket with PENDING status when no technician assigned', async () => {
      (prismaClient.serviceTicket.findUnique as any).mockResolvedValue(null);
      (prismaClient.serviceTicket.create as any).mockResolvedValue({
        id: 'new-tkt', ticketNo: 'SRV-250601-ABC1', tenantId, customerId: 'cust-1',
        deviceId, technicianId: null, issueDesc: 'Test', status: 'PENDING', scheduledAt: null,
      });

      const repo = new ServiceTicketRepository({ tenantId, role: 'manager' });
      const result = await repo.create({
        tenantId, customerId: 'cust-1', deviceId, issueDesc: 'Test',
      });

      expect(result.status).toBe('PENDING');
    });

    it('ensures unique ticketNo', async () => {
      let callCount = 0;
      (prismaClient.serviceTicket.findUnique as any).mockImplementation(() => {
        callCount++;
        return callCount <= 2 ? Promise.resolve({ id: 'existing' }) : Promise.resolve(null);
      });
      (prismaClient.serviceTicket.create as any).mockResolvedValue({
        id: 'new-tkt', ticketNo: 'SRV-250601-DEF1', tenantId, customerId: 'cust-1',
        deviceId, technicianId: null, issueDesc: 'Test', status: 'PENDING', scheduledAt: null,
      });

      const repo = new ServiceTicketRepository({ tenantId, role: 'manager' });
      const result = await repo.create({
        tenantId, customerId: 'cust-1', deviceId, issueDesc: 'Test',
      });

      // Should have retried uniqueness check
      expect(prismaClient.serviceTicket.findUnique).toHaveBeenCalledTimes(3);
      expect(result.ticketNo).toBeDefined();
    });
  });

  // ─── PDF Storage Path ────────────────────

  describe('updatePdfStoragePath', () => {
    it('updates the pdfStoragePath on a ticket', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({
        ...mockTicket, pdfStoragePath: 'tenants/tenant-1/reports/SRV-001.pdf',
      });

      const repo = new ServiceTicketRepository({ tenantId, role: 'technician' });
      await repo.updatePdfStoragePath(ticketId, 'tenants/tenant-1/reports/SRV-001.pdf');

      expect(prismaClient.serviceTicket.update).toHaveBeenCalledWith({
        where: { id: ticketId },
        data: { pdfStoragePath: 'tenants/tenant-1/reports/SRV-001.pdf' },
      });
    });

    it('throws NOT_FOUND if ticket does not exist', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(null);

      const repo = new ServiceTicketRepository({ tenantId, role: 'technician' });
      await expect(
        repo.updatePdfStoragePath('nonexistent', 'path/to/pdf'),
      ).rejects.toThrow('NOT_FOUND');
    });
  });
});
