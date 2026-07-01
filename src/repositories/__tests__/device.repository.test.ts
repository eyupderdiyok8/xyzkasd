import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeviceRepository } from '../device.repository';
import { prismaClient } from '../base.repository';

// ──────────────────────────────────────────────
// DeviceRepository — Unit Tests
// ──────────────────────────────────────────────

vi.mock('../base.repository', () => {
  const mockPrisma = {
    device: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    devicePhoto: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
    },
    tdsReading: {
      findMany: vi.fn(),
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

describe('DeviceRepository', () => {
  const tenantId = 'tenant-1';
  const role = 'technician';
  let repo: DeviceRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new DeviceRepository({ tenantId, role });
  });

  const mockDevice = {
    id: 'device-1',
    tenantId,
    serialNo: 'SN-001',
    brand: 'AquaPure',
    model: 'AP-5000',
    warrantyStart: null,
    warrantyEnd: null,
    qrCode: 'QR-ABC123',
    status: 'ACTIVE',
    customerId: 'customer-1',
    customer: { id: 'customer-1', name: 'Ahmet Yılmaz' },
    installDate: null,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { tdsReadings: 0, serviceTickets: 0, photos: 0 },
  };

  // ─── CRUD ─────────────────────────────────

  describe('findAll', () => {
    it('should return all devices for the tenant', async () => {
      (prismaClient.device.findMany as any).mockResolvedValue([mockDevice]);
      const result = await repo.findAll();
      expect(result).toHaveLength(1);
      expect(prismaClient.device.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });

    it('should filter by status', async () => {
      (prismaClient.device.findMany as any).mockResolvedValue([mockDevice]);
      await repo.findAll({ status: 'ACTIVE' });
      expect(prismaClient.device.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('should search by serialNo, brand, model or qrCode', async () => {
      (prismaClient.device.findMany as any).mockResolvedValue([mockDevice]);
      await repo.findAll({ search: 'Aqua' });
      const callArgs = (prismaClient.device.findMany as any).mock.calls[0][0];
      expect(callArgs.where.OR).toBeDefined();
      expect(callArgs.where.OR.some((c: any) => c.brand?.contains === 'Aqua')).toBe(true);
    });

    it('should return empty array when no devices exist', async () => {
      (prismaClient.device.findMany as any).mockResolvedValue([]);
      const result = await repo.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a device by id', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue(mockDevice);
      const result = await repo.findById('device-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('device-1');
    });

    it('should throw NOT_FOUND when device does not exist', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue(null);
      await expect(repo.findById('nonexistent')).rejects.toThrow('NOT_FOUND');
    });

    it('should include related data (customer, photos, tds, tickets)', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue(mockDevice);
      await repo.findById('device-1');
      const callArgs = (prismaClient.device.findFirst as any).mock.calls[0][0];
      expect(callArgs.include).toBeDefined();
      expect(callArgs.include.customer).toBeDefined();
      expect(callArgs.include.photos).toBeDefined();
      expect(callArgs.include.tdsReadings).toBeDefined();
      expect(callArgs.include.serviceTickets).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a device with auto-generated QR code', async () => {
      const input = {
        serialNo: 'SN-002',
        brand: 'LG',
        model: 'PuriCare',
        tenantId,
      };
      (prismaClient.device.create as any).mockResolvedValue({
        ...mockDevice,
        id: 'device-2',
        serialNo: input.serialNo,
        brand: input.brand,
        model: input.model,
        qrCode: 'QR-NEW123',
      });
      const result = await repo.create(input);
      expect(result.qrCode).toBeTruthy();
      expect(result.qrCode).toMatch(/^QR-/);
      expect(prismaClient.device.create).toHaveBeenCalledTimes(1);
    });

    it('should set default status to ACTIVE', async () => {
      const input = { serialNo: 'SN-003', brand: 'Beko', model: 'RO-100', tenantId };
      (prismaClient.device.create as any).mockResolvedValue({ ...mockDevice, id: 'device-3', status: 'ACTIVE' });
      const result = await repo.create(input);
      expect(result.status).toBe('ACTIVE');
    });

    it('should accept custom status', async () => {
      const input = { serialNo: 'SN-004', brand: 'Beko', model: 'RO-100', tenantId, status: 'PASSIVE' };
      (prismaClient.device.create as any).mockResolvedValue({ ...mockDevice, id: 'device-4', status: 'PASSIVE' });
      const result = await repo.create(input);
      expect(result.status).toBe('PASSIVE');
    });

    it('should handle warranty dates', async () => {
      const input = {
        serialNo: 'SN-005',
        brand: 'Samsung',
        model: 'RO-300',
        tenantId,
        warrantyStart: '2024-01-01',
        warrantyEnd: '2026-01-01',
      };
      (prismaClient.device.create as any).mockResolvedValue({
        ...mockDevice,
        id: 'device-5',
        warrantyStart: new Date('2024-01-01'),
        warrantyEnd: new Date('2026-01-01'),
      });
      const result = await repo.create(input);
      expect(prismaClient.device.create).toHaveBeenCalled();
      const data = (prismaClient.device.create as any).mock.calls[0][0].data;
      expect(data.warrantyStart).toEqual(new Date('2024-01-01'));
      expect(data.warrantyEnd).toEqual(new Date('2026-01-01'));
    });
  });

  describe('update', () => {
    it('should update device fields', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue(mockDevice);
      (prismaClient.device.update as any).mockResolvedValue({ ...mockDevice, brand: 'Updated Brand' });
      const result = await repo.update('device-1', { brand: 'Updated Brand' });
      expect(result.brand).toBe('Updated Brand');
    });

    it('should throw NOT_FOUND when updating nonexistent device', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue(null);
      await expect(repo.update('nonexistent', { brand: 'X' })).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('delete', () => {
    it('should soft-delete a device (set deletedAt)', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue(mockDevice);
      (prismaClient.device.update as any).mockResolvedValue({ ...mockDevice, deletedAt: new Date() });
      await repo.delete('device-1');
      expect(prismaClient.device.update).toHaveBeenCalledWith({ where: { id: 'device-1' }, data: { deletedAt: expect.any(Date) } });
    });

    it('should throw NOT_FOUND when deleting nonexistent device', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue(null);
      await expect(repo.delete('nonexistent')).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── QR Code ──────────────────────────────

  describe('findByQrCode', () => {
    it('should find device by QR code', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue(mockDevice);
      const result = await repo.findByQrCode('QR-ABC123');
      expect(result).toBeDefined();
      expect(result!.qrCode).toBe('QR-ABC123');
    });

    it('should return null for unknown QR code', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue(null);
      const result = await repo.findByQrCode('QR-INVALID');
      expect(result).toBeNull();
    });
  });

  // ─── Photos ───────────────────────────────

  describe('addPhoto', () => {
    it('should add a photo and set isPrimary correctly', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue(mockDevice);
      (prismaClient.devicePhoto.create as any).mockResolvedValue({
        id: 'photo-1',
        deviceId: 'device-1',
        isPrimary: true,
        storagePath: 'tenants/tenant-1/devices/device-1/test.jpg',
      });
      const result = await repo.addPhoto({
        deviceId: 'device-1',
        tenantId,
        storagePath: 'tenants/tenant-1/devices/device-1/test.jpg',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        isPrimary: true,
      });
      expect(result.isPrimary).toBe(true);
    });

    it('should unset previous primary when adding new primary', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue(mockDevice);
      (prismaClient.devicePhoto.updateMany as any).mockResolvedValue({ count: 1 });
      (prismaClient.devicePhoto.create as any).mockResolvedValue({
        id: 'photo-2',
        isPrimary: true,
      });
      await repo.addPhoto({
        deviceId: 'device-1',
        tenantId,
        storagePath: 'tenants/tenant-1/devices/device-1/new.jpg',
        fileName: 'new.jpg',
        mimeType: 'image/jpeg',
        isPrimary: true,
      });
      expect(prismaClient.devicePhoto.updateMany).toHaveBeenCalledWith({
        where: { deviceId: 'device-1', isPrimary: true },
        data: { isPrimary: false },
      });
    });
  });

  describe('deletePhoto', () => {
    it('should delete a photo by id', async () => {
      (prismaClient.devicePhoto.findFirst as any).mockResolvedValue({
        id: 'photo-1',
        tenantId,
        storagePath: 'path/to/photo.jpg',
      });
      (prismaClient.devicePhoto.delete as any).mockResolvedValue({ id: 'photo-1' });
      await repo.deletePhoto('photo-1');
      expect(prismaClient.devicePhoto.delete).toHaveBeenCalledWith({ where: { id: 'photo-1' } });
    });
  });

  // ─── TDS Readings ─────────────────────────

  describe('addTdsReading', () => {
    it('should add a TDS reading', async () => {
      (prismaClient.device.findFirst as any).mockResolvedValue(mockDevice);
      (prismaClient.tdsReading.create as any).mockResolvedValue({
        id: 'tds-1',
        deviceId: 'device-1',
        tdsValue: 150,
      });
      const result = await repo.addTdsReading({
        deviceId: 'device-1',
        tenantId,
        tdsValue: 150,
      });
      expect(result.tdsValue).toBe(150);
    });
  });

  // ─── Multi-Tenant Isolation ──────────────

  describe('tenant isolation', () => {
    it('should filter by tenant for non-super-admin', () => {
      const r = new DeviceRepository({ tenantId: 'tenant-a', role: 'technician' });
      expect(r['tenantFilter']()).toEqual({ tenantId: 'tenant-a' });
    });

    it('should not filter for super_admin', () => {
      const r = new DeviceRepository({ tenantId: null, role: 'super_admin' });
      expect(r['tenantFilter']()).toEqual({});
    });

    it('should throw if tenantId is missing for non-super-admin', () => {
      const r = new DeviceRepository({ tenantId: null, role: 'technician' });
      expect(() => r['tenantFilter']()).toThrow('Tenant gerekli');
    });
  });
});
