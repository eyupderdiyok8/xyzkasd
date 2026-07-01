import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerRepository } from '../customer.repository';
import { prismaClient } from '../base.repository';

// ──────────────────────────────────────────────
// CustomerRepository — Unit Tests
// ──────────────────────────────────────────────

vi.mock('../base.repository', () => {
  const mockPrisma = {
    customer: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    customerPhone: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    customerAddress: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn((cb: any) => cb(mockPrisma)),
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

describe('CustomerRepository', () => {
  const tenantId = 'tenant-1';
  const role = 'technician';
  let repo: CustomerRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new CustomerRepository({ tenantId, role });
  });

  const mockCustomer = {
    id: 'customer-1',
    tenantId,
    name: 'Ahmet Yılmaz',
    email: 'ahmet@example.com',
    notes: 'VIP müşteri',
    tags: 'VIP,kurumsal',
    phone: '05321234567',
    address: 'Atatürk Cad. No:42',
    city: 'İstanbul',
    district: 'Kadıköy',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    phones: [
      { id: 'phone-1', label: 'Cep', number: '05321234567' },
    ],
    addresses: [
      { id: 'addr-1', label: 'Ev', address: 'Atatürk Cad. No:42', city: 'İstanbul', district: 'Kadıköy' },
    ],
    devices: [],
    serviceTickets: [],
    maintenanceReminders: [],
    _count: { devices: 0, serviceTickets: 0, addresses: 1, phones: 1 },
  };

  // ─── CRUD ─────────────────────────────────

  describe('findAll', () => {
    it('should return all customers for the tenant', async () => {
      (prismaClient.customer.findMany as any).mockResolvedValue([mockCustomer]);
      const result = await repo.findAll();
      expect(result).toHaveLength(1);
      expect(prismaClient.customer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });

    it('should exclude soft-deleted customers by default', async () => {
      (prismaClient.customer.findMany as any).mockResolvedValue([mockCustomer]);
      await repo.findAll();
      const callArgs = (prismaClient.customer.findMany as any).mock.calls[0][0];
      expect(callArgs.where.deletedAt).toBeNull();
    });

    it('should include soft-deleted customers when showAll is true', async () => {
      (prismaClient.customer.findMany as any).mockResolvedValue([mockCustomer]);
      await repo.findAll(undefined, true);
      const callArgs = (prismaClient.customer.findMany as any).mock.calls[0][0];
      expect(callArgs.where.deletedAt).toBeUndefined();
    });

    it('should search by name', async () => {
      (prismaClient.customer.findMany as any).mockResolvedValue([mockCustomer]);
      await repo.findAll('Ahmet');
      const callArgs = (prismaClient.customer.findMany as any).mock.calls[0][0];
      expect(callArgs.where.OR).toBeDefined();
      expect(callArgs.where.OR.some((c: any) => c.name?.contains === 'Ahmet')).toBe(true);
    });

    it('should search by phone number (legacy and relation)', async () => {
      (prismaClient.customer.findMany as any).mockResolvedValue([mockCustomer]);
      await repo.findAll('0532');
      const callArgs = (prismaClient.customer.findMany as any).mock.calls[0][0];
      expect(callArgs.where.OR).toBeDefined();
      expect(callArgs.where.OR.some((c: any) => c.phone?.contains === '0532')).toBe(true);
      expect(callArgs.where.OR.some((c: any) => c.phones?.some?.number?.contains === '0532')).toBe(true);
    });

    it('should include phone relations and counts', async () => {
      (prismaClient.customer.findMany as any).mockResolvedValue([mockCustomer]);
      await repo.findAll();
      const callArgs = (prismaClient.customer.findMany as any).mock.calls[0][0];
      expect(callArgs.include?.phones).toBeDefined();
      expect(callArgs.include?._count).toBeDefined();
      expect(callArgs.include?._count.select).toHaveProperty('devices');
      expect(callArgs.include?._count.select).toHaveProperty('serviceTickets');
      expect(callArgs.include?._count.select).toHaveProperty('addresses');
      expect(callArgs.include?._count.select).toHaveProperty('phones');
    });

    it('should return empty array when no customers exist', async () => {
      (prismaClient.customer.findMany as any).mockResolvedValue([]);
      const result = await repo.findAll();
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return a customer by id with all relations', async () => {
      (prismaClient.customer.findFirst as any).mockResolvedValue(mockCustomer);
      const result = await repo.findById('customer-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('customer-1');
    });

    it('should include phones, addresses, devices, and service tickets', async () => {
      (prismaClient.customer.findFirst as any).mockResolvedValue(mockCustomer);
      await repo.findById('customer-1');
      const callArgs = (prismaClient.customer.findFirst as any).mock.calls[0][0];
      expect(callArgs.include.phones).toBeDefined();
      expect(callArgs.include.addresses).toBeDefined();
      expect(callArgs.include.devices).toBeDefined();
      expect(callArgs.include.serviceTickets).toBeDefined();
    });

    it('should filter soft-deleted phones and addresses', async () => {
      (prismaClient.customer.findFirst as any).mockResolvedValue(mockCustomer);
      await repo.findById('customer-1');
      const callArgs = (prismaClient.customer.findFirst as any).mock.calls[0][0];
      expect(callArgs.include.phones.where.deletedAt).toBeNull();
      expect(callArgs.include.addresses.where.deletedAt).toBeNull();
    });

    it('should throw NOT_FOUND when customer does not exist', async () => {
      (prismaClient.customer.findFirst as any).mockResolvedValue(null);
      await expect(repo.findById('nonexistent')).rejects.toThrow('NOT_FOUND');
    });

    it('should enforce tenant isolation', async () => {
      (prismaClient.customer.findFirst as any).mockResolvedValue(null);
      await expect(repo.findById('customer-other-tenant')).rejects.toThrow('NOT_FOUND');
      expect(prismaClient.customer.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId }),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a customer with basic fields', async () => {
      (prismaClient.customer.create as any).mockResolvedValue(mockCustomer);
      const result = await repo.create({
        name: 'Ahmet Yılmaz',
      });
      expect(result).toBeDefined();
      expect(result.name).toBe('Ahmet Yılmaz');
      expect(prismaClient.customer.create).toHaveBeenCalled();
    });

    it('should create with phones and addresses, stripping ids', async () => {
      (prismaClient.customer.create as any).mockResolvedValue(mockCustomer);
      await repo.create({
        name: 'Ahmet Yılmaz',
        phones: [{ id: 'ignored-id', label: 'Cep', number: '05321234567' }],
        addresses: [{ id: 'ignored-addr', label: 'Ev', address: 'Cadde No:1', city: 'İstanbul', district: 'Kadıköy' }],
      });
      const createData = (prismaClient.customer.create as any).mock.calls[0][0].data;
      // Phones should be created WITHOUT the id field
      expect(createData.phones.create[0].id).toBeUndefined();
      expect(createData.phones.create[0].number).toBe('05321234567');
      // Addresses should be created WITHOUT the id field
      expect(createData.addresses.create[0].id).toBeUndefined();
      expect(createData.addresses.create[0].address).toBe('Cadde No:1');
    });

    it('should fall back to first phone number for legacy phone field', async () => {
      (prismaClient.customer.create as any).mockResolvedValue(mockCustomer);
      await repo.create({
        name: 'Ahmet Yılmaz',
        phones: [{ label: 'Cep', number: '05321234567' }],
      });
      const createData = (prismaClient.customer.create as any).mock.calls[0][0].data;
      expect(createData.phone).toBe('05321234567');
    });

    it('should set empty string for phone when no phones provided', async () => {
      (prismaClient.customer.create as any).mockResolvedValue({ ...mockCustomer, phone: '' });
      await repo.create({ name: 'Ahmet Yılmaz' });
      const createData = (prismaClient.customer.create as any).mock.calls[0][0].data;
      expect(createData.phone).toBe('');
    });

    it('should throw when tenantId is missing for non-super-admin', async () => {
      const r = new CustomerRepository({ tenantId: null, role: 'technician' });
      await expect(r.create({ name: 'Test' })).rejects.toThrow('Tenant gerekli');
    });

    it('should accept explicit tenantId override for super_admin', async () => {
      (prismaClient.customer.create as any).mockResolvedValue(mockCustomer);
      const r = new CustomerRepository({ tenantId: null, role: 'super_admin' });
      await r.create({ name: 'Ahmet', tenantId: 'tenant-2' });
      const createData = (prismaClient.customer.create as any).mock.calls[0][0].data;
      expect(createData.tenantId).toBe('tenant-2');
    });
  });

  describe('update', () => {
    it('should update customer fields', async () => {
      (prismaClient.customer.findFirst as any).mockResolvedValue(mockCustomer);
      (prismaClient.customer.update as any).mockResolvedValue({ ...mockCustomer, name: 'Updated Name' });

      (prismaClient.$transaction as any).mockImplementation(async (cb: any) => {
        await cb(prismaClient);
        return { ...mockCustomer, name: 'Updated Name' };
      });

      const result = await repo.update('customer-1', { name: 'Updated Name' });
      expect(result).toBeDefined();
    });

    it('should replace phones — soft delete old, create new without id', async () => {
      (prismaClient.customer.findFirst as any).mockResolvedValue(mockCustomer);
      (prismaClient.customer.update as any).mockResolvedValue(mockCustomer);

      (prismaClient.$transaction as any).mockImplementation(async (cb: any) => {
        await cb(prismaClient);
        return mockCustomer;
      });

      await repo.update('customer-1', {
        phones: [{ id: 'old-phone-id', label: 'İş', number: '02161234567' }],
      });

      expect(prismaClient.customerPhone.updateMany).toHaveBeenCalledWith({
        where: { customerId: 'customer-1', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });

      const createdPhone = (prismaClient.customerPhone.create as any).mock.calls[0][0].data;
      expect(createdPhone.id).toBeUndefined(); // id should be stripped
      expect(createdPhone.number).toBe('02161234567');
    });

    it('should replace addresses — soft delete old, create new without id', async () => {
      (prismaClient.customer.findFirst as any).mockResolvedValue(mockCustomer);
      (prismaClient.customer.update as any).mockResolvedValue(mockCustomer);

      (prismaClient.$transaction as any).mockImplementation(async (cb: any) => {
        await cb(prismaClient);
        return mockCustomer;
      });

      await repo.update('customer-1', {
        addresses: [
          { id: 'old-addr-id', label: 'İş', address: 'Sanayi Mah.', city: 'İstanbul', district: 'Ümraniye' },
        ],
      });

      expect(prismaClient.customerAddress.updateMany).toHaveBeenCalledWith({
        where: { customerId: 'customer-1', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });

      const createdAddr = (prismaClient.customerAddress.create as any).mock.calls[0][0].data;
      expect(createdAddr.id).toBeUndefined(); // id should be stripped
      expect(createdAddr.address).toBe('Sanayi Mah.');
    });

    it('should not touch phones/addresses when not provided', async () => {
      (prismaClient.customer.findFirst as any).mockResolvedValue(mockCustomer);
      (prismaClient.customer.update as any).mockResolvedValue(mockCustomer);

      (prismaClient.$transaction as any).mockImplementation(async (cb: any) => {
        await cb(prismaClient);
        return mockCustomer;
      });

      await repo.update('customer-1', { name: 'Only Name Update' });

      expect(prismaClient.customerPhone.updateMany).not.toHaveBeenCalled();
      expect(prismaClient.customerAddress.updateMany).not.toHaveBeenCalled();
    });

    it('should throw NOT_FOUND when updating nonexistent customer', async () => {
      (prismaClient.customer.findFirst as any).mockResolvedValue(null);
      await expect(repo.update('nonexistent', { name: 'X' })).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('delete (soft)', () => {
    it('should soft-delete a customer', async () => {
      (prismaClient.customer.findFirst as any).mockResolvedValue(mockCustomer);
      (prismaClient.customer.update as any).mockResolvedValue({
        ...mockCustomer,
        deletedAt: new Date(),
      });

      await repo.delete('customer-1');
      expect(prismaClient.customer.update).toHaveBeenCalledWith({
        where: { id: 'customer-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NOT_FOUND when deleting nonexistent customer', async () => {
      (prismaClient.customer.findFirst as any).mockResolvedValue(null);
      await expect(repo.delete('nonexistent')).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── Multi-Tenant Isolation ──────────────

  describe('tenant isolation', () => {
    it('should filter by tenant for non-super-admin', () => {
      const r = new CustomerRepository({ tenantId: 'tenant-a', role: 'technician' });
      expect(r['tenantFilter']()).toEqual({ tenantId: 'tenant-a' });
    });

    it('should not filter for super_admin', () => {
      const r = new CustomerRepository({ tenantId: null, role: 'super_admin' });
      expect(r['tenantFilter']()).toEqual({});
    });

    it('should throw if tenantId is missing for non-super-admin', () => {
      const r = new CustomerRepository({ tenantId: null, role: 'technician' });
      expect(() => r['tenantFilter']()).toThrow('Tenant gerekli');
    });

    it('should verify access via hasAccess', () => {
      const r = new CustomerRepository({ tenantId: 'tenant-a', role: 'technician' });
      expect(r['hasAccess']('tenant-a')).toBe(true);
      expect(r['hasAccess']('tenant-b')).toBe(false);
    });
  });
});
