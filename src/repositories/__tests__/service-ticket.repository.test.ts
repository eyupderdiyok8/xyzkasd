// ──────────────────────────────────────────────
// Water Purifier Service ERP — ServiceTicketRepository Tests
// Multi-Tenant SaaS
//
// Tests: CRUD, completeService, filter changes, photos, ensureAccess
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceTicketRepository } from '../service-ticket.repository';
import { prismaClient } from '../base.repository';

// ─── Mock Base Repository ──────────────────────

vi.mock('../base.repository', () => {
  const mockPrisma = {
    serviceTicket: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    filterChange: {
      create: vi.fn(),
    },
    deviceFilter: {
      findMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    deviceMaintenance: {
      create: vi.fn(),
    },
    tdsReading: {
      create: vi.fn(),
    },
    servicePhoto: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    filterCatalog: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    tenant: {
      findUnique: vi.fn(),
    },
    inventoryItem: { updateMany: vi.fn() },
    inventoryTransaction: { create: vi.fn() },
  };
  return {
    prismaClient: mockPrisma,
    BaseRepository: class {
      protected prisma = mockPrisma;
      protected tenantId: string | null;
      protected role: string;
      protected userId: string | null = null;
      protected ipAddress: string | null = null;

      constructor(context: { tenantId: string | null; role: string }) {
        this.tenantId = context.tenantId;
        this.role = context.role;
      }

      protected tenantFilter(): { tenantId?: string } {
        if (this.role === 'super_admin') {
          return this.tenantId ? { tenantId: this.tenantId } : {};
        }
        if (!this.tenantId) throw new Error('Tenant gerekli');
        return { tenantId: this.tenantId };
      }

      protected auditCreate = vi.fn().mockResolvedValue(undefined);
      protected auditUpdate = vi.fn().mockResolvedValue(undefined);
      protected auditDelete = vi.fn().mockResolvedValue(undefined);
    },
  };
});

describe('ServiceTicketRepository', () => {
  const tenantId = 'tenant-1';
  const role = 'technician';
  let repo: ServiceTicketRepository;

  const mockTicket = {
    id: 'ticket-1',
    ticketNo: 'SRV-250101-ABCD',
    tenantId,
    customerId: 'cust-1',
    deviceId: 'dev-1',
    technicianId: 'tech-1',
    issueDesc: 'Su basıncı düşük',
    status: 'ASSIGNED',
    resolution: null,
    tdsBefore: null,
    tdsAfter: null,
    pressureBefore: null,
    pressureAfter: null,
    leakCheck: null,
    leakNotes: null,
    workDone: null,
    customerNote: null,
    signatureDataUrl: null,
    signatureName: null,
    pdfStoragePath: null,
    completedAt: null,
    scheduledAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    customer: { id: 'cust-1', name: 'Ahmet Yılmaz', phone: '+905551234567' },
    device: { id: 'dev-1', serialNo: 'SN-001', brand: 'AquaPure', model: 'AP-5000' },
    technician: { id: 'tech-1', name: 'Mehmet Usta' },
    photos: [],
    filterChanges: [],
    _count: { photos: 0, filterChanges: 0 },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new ServiceTicketRepository({ tenantId, role });
  });

  // ─── findAll ─────────────────────────────

  describe('findAll', () => {
    it('returns all tickets for the tenant', async () => {
      (prismaClient.serviceTicket.findMany as any).mockResolvedValue([mockTicket]);
      const result = await repo.findAll();
      expect(result).toHaveLength(1);
      expect(prismaClient.serviceTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });

    it('filters by status', async () => {
      (prismaClient.serviceTicket.findMany as any).mockResolvedValue([mockTicket]);
      await repo.findAll({ status: 'COMPLETED' });
      const where = (prismaClient.serviceTicket.findMany as any).mock.calls[0][0].where;
      expect(where.status).toBe('COMPLETED');
    });

    it('filters by technicianId', async () => {
      (prismaClient.serviceTicket.findMany as any).mockResolvedValue([mockTicket]);
      await repo.findAll({ technicianId: 'tech-2' });
      const where = (prismaClient.serviceTicket.findMany as any).mock.calls[0][0].where;
      expect(where.technicianId).toBe('tech-2');
    });

    it('filters by customerId', async () => {
      (prismaClient.serviceTicket.findMany as any).mockResolvedValue([mockTicket]);
      await repo.findAll({ customerId: 'cust-1' });
      const where = (prismaClient.serviceTicket.findMany as any).mock.calls[0][0].where;
      expect(where.customerId).toBe('cust-1');
    });

    it('filters by deviceId', async () => {
      (prismaClient.serviceTicket.findMany as any).mockResolvedValue([mockTicket]);
      await repo.findAll({ deviceId: 'dev-1' });
      const where = (prismaClient.serviceTicket.findMany as any).mock.calls[0][0].where;
      expect(where.deviceId).toBe('dev-1');
    });

    it('search searches ticketNo and issueDesc', async () => {
      (prismaClient.serviceTicket.findMany as any).mockResolvedValue([mockTicket]);
      await repo.findAll({ search: 'basınç' });
      const where = (prismaClient.serviceTicket.findMany as any).mock.calls[0][0].where;
      expect(where.OR).toBeDefined();
      expect(where.OR.some((c: any) => c.ticketNo?.contains === 'basınç')).toBe(true);
      expect(where.OR.some((c: any) => c.issueDesc?.contains === 'basınç')).toBe(true);
    });

    it('excludes deleted tickets by default', async () => {
      (prismaClient.serviceTicket.findMany as any).mockResolvedValue([mockTicket]);
      await repo.findAll();
      const where = (prismaClient.serviceTicket.findMany as any).mock.calls[0][0].where;
      expect(where.deletedAt).toBeNull();
    });

    it('includes deleted tickets when showDeleted is true', async () => {
      (prismaClient.serviceTicket.findMany as any).mockResolvedValue([mockTicket]);
      await repo.findAll({ showDeleted: true });
      const where = (prismaClient.serviceTicket.findMany as any).mock.calls[0][0].where;
      expect(where.deletedAt).toBeUndefined();
    });

    it('returns empty array when no tickets', async () => {
      (prismaClient.serviceTicket.findMany as any).mockResolvedValue([]);
      const result = await repo.findAll();
      expect(result).toEqual([]);
    });
  });

  // ─── findById ────────────────────────────

  describe('findById', () => {
    it('returns a ticket by id with full relations', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      const result = await repo.findById('ticket-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('ticket-1');
      expect(prismaClient.serviceTicket.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'ticket-1', tenantId }),
        }),
      );
    });

    it('throws NOT_FOUND for nonexistent ticket', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(null);
      await expect(repo.findById('nonexistent')).rejects.toThrow('NOT_FOUND');
    });

    it('includes customer, device, technician relations', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      await repo.findById('ticket-1');
      const callArgs = (prismaClient.serviceTicket.findFirst as any).mock.calls[0][0];
      expect(callArgs.include).toBeDefined();
      expect(callArgs.include.customer).toBeDefined();
      expect(callArgs.include.device).toBeDefined();
      expect(callArgs.include.technician).toBeDefined();
      expect(callArgs.include.photos).toBeDefined();
      expect(callArgs.include.filterChanges).toBeDefined();
    });
  });

  // ─── create ──────────────────────────────

  describe('create', () => {
    it('creates a ticket with generated ticketNo', async () => {
      (prismaClient.serviceTicket.findUnique as any).mockResolvedValue(null);
      (prismaClient.serviceTicket.create as any).mockResolvedValue(mockTicket);
      const result = await repo.create({
        tenantId,
        customerId: 'cust-1',
        deviceId: 'dev-1',
        technicianId: 'tech-1',
        issueDesc: 'Su basıncı düşük',
      });
      expect(result.ticketNo).toMatch(/^SRV-/);
      expect(result.status).toBe('ASSIGNED');
    });

    it('sets status to PENDING when no technician assigned', async () => {
      (prismaClient.serviceTicket.findUnique as any).mockResolvedValue(null);
      (prismaClient.serviceTicket.create as any).mockResolvedValue({
        ...mockTicket,
        technicianId: null,
        status: 'PENDING',
      });
      const result = await repo.create({
        tenantId,
        customerId: 'cust-1',
        deviceId: 'dev-1',
        issueDesc: 'Arıza',
      });
      expect(result.status).toBe('PENDING');
    });

    it('retries ticketNo generation on collision', async () => {
      // First findUnique returns an existing ticket (collision)
      (prismaClient.serviceTicket.findUnique as any)
        .mockResolvedValueOnce(mockTicket) // collision
        .mockResolvedValueOnce(null); // retry succeeds
      (prismaClient.serviceTicket.create as any).mockResolvedValue({ ...mockTicket, id: 'ticket-2', ticketNo: 'SRV-250101-XYZ1' });
      const result = await repo.create({
        tenantId,
        customerId: 'cust-1',
        deviceId: 'dev-1',
        issueDesc: 'Filtre değişimi',
      });
      expect(result.ticketNo).toMatch(/^SRV-/);
      expect(prismaClient.serviceTicket.findUnique).toHaveBeenCalledTimes(2);
    });

    it('throws after 10 ticketNo collision attempts', async () => {
      (prismaClient.serviceTicket.findUnique as any).mockResolvedValue(mockTicket);
      await expect(
        repo.create({ tenantId, customerId: 'c-1', deviceId: 'd-1', issueDesc: 'x' }),
      ).rejects.toThrow('TicketNo generation failed');
      // Called 11 times (10 retries + initial)
      expect((prismaClient.serviceTicket.findUnique as any).mock.calls.length).toBeGreaterThan(10);
    });

    it('handles scheduledAt date', async () => {
      (prismaClient.serviceTicket.findUnique as any).mockResolvedValue(null);
      (prismaClient.serviceTicket.create as any).mockResolvedValue(mockTicket);
      await repo.create({
        tenantId,
        customerId: 'cust-1',
        deviceId: 'dev-1',
        issueDesc: 'Test',
        scheduledAt: '2025-01-15T10:00:00Z',
      });
      const data = (prismaClient.serviceTicket.create as any).mock.calls[0][0].data;
      expect(data.scheduledAt).toBeInstanceOf(Date);
    });
  });

  // ─── updateStatus ────────────────────────

  describe('updateStatus', () => {
    it('updates ticket status', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({ ...mockTicket, status: 'COMPLETED' });
      const result = await repo.updateStatus('ticket-1', 'COMPLETED');
      expect(result.status).toBe('COMPLETED');
    });

    it('sets completedAt when status is COMPLETED', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({ ...mockTicket, status: 'COMPLETED', completedAt: new Date() });
      await repo.updateStatus('ticket-1', 'COMPLETED');
      const data = (prismaClient.serviceTicket.update as any).mock.calls[0][0].data;
      expect(data.completedAt).toBeInstanceOf(Date);
    });

    it('sets resolution when provided', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({ ...mockTicket, status: 'COMPLETED', resolution: 'Filtre değişti' });
      await repo.updateStatus('ticket-1', 'COMPLETED', 'Filtre değişti');
      const data = (prismaClient.serviceTicket.update as any).mock.calls[0][0].data;
      expect(data.resolution).toBe('Filtre değişti');
    });

    it('throws NOT_FOUND for nonexistent ticket', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(null);
      await expect(repo.updateStatus('nonexistent', 'COMPLETED')).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── completeService ─────────────────────

  describe('completeService', () => {
    it('completes a service ticket with measurements', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({
        ...mockTicket,
        status: 'COMPLETED',
        tdsBefore: 250,
        tdsAfter: 45,
        workDone: 'Filtre değişimi yapıldı',
      });
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'maint-1' });

      const result = await repo.completeService('ticket-1', {
        tdsBefore: 250,
        tdsAfter: 45,
        pressureBefore: 3.5,
        pressureAfter: 4.2,
        workDone: 'Filtre değişimi yapıldı',
      });

      expect(result.status).toBe('COMPLETED');
      expect(result.tdsBefore).toBe(250);
      expect(result.tdsAfter).toBe(45);

      // Verify TDS reading was recorded
      expect(prismaClient.tdsReading.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deviceId: 'dev-1',
            tdsValue: 45,
            inValue: 250,
          }),
        }),
      );

      // Verify maintenance record
      expect(prismaClient.deviceMaintenance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deviceId: 'dev-1',
            maintenanceType: 'INSPECTION',
          }),
        }),
      );
    });

    it('processes filter changes during completion', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({ ...mockTicket, status: 'COMPLETED' });
      (prismaClient.deviceFilter.findMany as any).mockResolvedValue([
        { id: 'df-1', filterCatalogId: 'filter-1', expectedLifespanDays: 180 },
      ]);
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'maint-2' });

      await repo.completeService('ticket-1', {
        filterChanges: [
          { filterId: 'filter-1', quantity: 2, notes: 'Sediment değişti' },
          { filterId: 'filter-2', quantity: 1 }, // new filter, no existing device filter
        ],
      });

      // FilterChange records created for both
      expect(prismaClient.filterChange.create).toHaveBeenCalledTimes(2);

      // Existing DeviceFilter updated (reset installedAt)
      expect(prismaClient.deviceFilter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'df-1' },
          data: expect.objectContaining({ installedAt: expect.any(Date) }),
        }),
      );

      // New DeviceFilter created for filter-2
      expect(prismaClient.deviceFilter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            deviceId: 'dev-1',
            filterCatalogId: 'filter-2',
          }),
        }),
      );

      // Maintenance type should be FILTER_CHANGE
      expect(prismaClient.deviceMaintenance.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            maintenanceType: 'FILTER_CHANGE',
          }),
        }),
      );
    });

    it('handles leak check results', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({ ...mockTicket, status: 'COMPLETED', leakCheck: true, leakNotes: 'Giriş vanasından kaçak' });
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'maint-3' });

      await repo.completeService('ticket-1', {
        leakCheck: true,
        leakNotes: 'Giriş vanasından kaçak',
      });

      const data = (prismaClient.serviceTicket.update as any).mock.calls[0][0].data;
      expect(data.leakCheck).toBe(true);
      expect(data.leakNotes).toBe('Giriş vanasından kaçak');
    });

    it('handles signature data', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({ ...mockTicket, status: 'COMPLETED', signatureDataUrl: 'data:image/png;base64,...', signatureName: 'Ali Veli' });
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'maint-4' });

      await repo.completeService('ticket-1', {
        signatureDataUrl: 'data:image/png;base64,...',
        signatureName: 'Ali Veli',
      });

      const data = (prismaClient.serviceTicket.update as any).mock.calls[0][0].data;
      expect(data.signatureDataUrl).toBe('data:image/png;base64,...');
      expect(data.signatureName).toBe('Ali Veli');
    });

    it('does NOT create TDS reading when tdsAfter is null', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({ ...mockTicket, status: 'COMPLETED' });
      (prismaClient.deviceMaintenance.create as any).mockResolvedValue({ id: 'maint-5' });

      await repo.completeService('ticket-1', {
        workDone: 'Kontrol yapıldı',
        tdsBefore: null,
        tdsAfter: null,
      });

      expect(prismaClient.tdsReading.create).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND for nonexistent ticket', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(null);
      await expect(
        repo.completeService('nonexistent', { workDone: 'test' }),
      ).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── Photos ──────────────────────────────

  describe('addPhoto', () => {
    it('adds a photo to a ticket', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.servicePhoto.create as any).mockResolvedValue({
        id: 'photo-1',
        ticketId: 'ticket-1',
        storagePath: 'tenants/tenant-1/services/ticket-1/photo.jpg',
      });

      const result = await repo.addPhoto({
        ticketId: 'ticket-1',
        tenantId,
        storagePath: 'tenants/tenant-1/services/ticket-1/photo.jpg',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
      });

      expect(result.storagePath).toContain('photo.jpg');
    });

    it('throws NOT_FOUND when ticket does not exist', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(null);
      await expect(
        repo.addPhoto({ ticketId: 'nonexistent', tenantId, storagePath: 'p', fileName: 'f', mimeType: 'image/jpeg' }),
      ).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('getPhotos', () => {
    it('returns photos for a ticket', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.servicePhoto.findMany as any).mockResolvedValue([
        { id: 'p-1', ticketId: 'ticket-1', storagePath: 'path/1.jpg' },
        { id: 'p-2', ticketId: 'ticket-1', storagePath: 'path/2.jpg' },
      ]);

      const result = await repo.getPhotos('ticket-1');
      expect(result).toHaveLength(2);
    });

    it('throws NOT_FOUND when ticket does not exist', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(null);
      await expect(repo.getPhotos('nonexistent')).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── Filter Catalogs ────────────────────

  describe('getFilterCatalogs', () => {
    it('returns active filter catalogs for tenant', async () => {
      (prismaClient.filterCatalog.findMany as any).mockResolvedValue([
        { id: 'fc-1', name: 'Sediment', stage: 'SEDIMENT', isActive: true, sortOrder: 1 },
      ]);

      const result = await repo.getFilterCatalogs();
      expect(result).toHaveLength(1);
      expect(prismaClient.filterCatalog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId, isActive: true }),
        }),
      );
    });
  });

  // ─── PDF Storage Path ────────────────────

  describe('updatePdfStoragePath', () => {
    it('updates pdfStoragePath on a ticket', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({ ...mockTicket, pdfStoragePath: 'reports/ticket-1.pdf' });

      const result = await repo.updatePdfStoragePath('ticket-1', 'reports/ticket-1.pdf');
      expect(result.pdfStoragePath).toBe('reports/ticket-1.pdf');
    });

    it('throws NOT_FOUND for nonexistent ticket', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(null);
      await expect(repo.updatePdfStoragePath('nonexistent', 'report.pdf')).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── getTenant ──────────────────────────

  describe('getTenant', () => {
    it('returns tenant by id', async () => {
      (prismaClient.tenant.findUnique as any).mockResolvedValue({ id: tenantId, name: 'Test Firma' });
      const result = await repo.getTenant(tenantId);
      expect(result?.id).toBe(tenantId);
    });

    it('returns null for nonexistent tenant', async () => {
      (prismaClient.tenant.findUnique as any).mockResolvedValue(null);
      const result = await repo.getTenant('nonexistent');
      expect(result).toBeNull();
    });
  });

  // ─── Delete (soft) ──────────────────────

  describe('delete', () => {
    it('soft-deletes a ticket', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(mockTicket);
      (prismaClient.serviceTicket.update as any).mockResolvedValue({ ...mockTicket, deletedAt: new Date() });
      await repo.delete('ticket-1');
      expect(prismaClient.serviceTicket.update).toHaveBeenCalledWith(
        { where: { id: 'ticket-1' }, data: { deletedAt: expect.any(Date) } },
      );
    });

    it('throws NOT_FOUND for nonexistent ticket', async () => {
      (prismaClient.serviceTicket.findFirst as any).mockResolvedValue(null);
      await expect(repo.delete('nonexistent')).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── Tenant Isolation ───────────────────

  describe('tenant isolation', () => {
    it('filters by tenant for non-super-admin', () => {
      const r = new ServiceTicketRepository({ tenantId: 'tenant-a', role: 'technician' });
      expect(r['tenantFilter']()).toEqual({ tenantId: 'tenant-a' });
    });

    it('does not filter for super_admin', () => {
      const r = new ServiceTicketRepository({ tenantId: null, role: 'super_admin' });
      expect(r['tenantFilter']()).toEqual({});
    });

    it('filters by selected tenant for super_admin', () => {
      const r = new ServiceTicketRepository({ tenantId: 'tenant-b', role: 'super_admin' });
      expect(r['tenantFilter']()).toEqual({ tenantId: 'tenant-b' });
    });

    it('throws if tenantId is missing for non-super-admin', () => {
      const r = new ServiceTicketRepository({ tenantId: null, role: 'manager' });
      expect(() => r['tenantFilter']()).toThrow('Tenant gerekli');
    });
  });
});
