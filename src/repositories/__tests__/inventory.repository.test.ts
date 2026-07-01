import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InventoryRepository } from '../inventory.repository';
import { prismaClient } from '../base.repository';

// ──────────────────────────────────────────────
// InventoryRepository — Unit Tests
// ──────────────────────────────────────────────

vi.mock('../base.repository', () => {
  const mockPrisma = {
    inventoryItem: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    inventoryTransaction: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return {
    prismaClient: mockPrisma,
    BaseRepository: class {
      protected prisma = mockPrisma;
      protected tenantId: string | null;
      protected role: string;

      constructor(context: { tenantId: string | null; role: string }) {
        this.tenantId = context.tenantId;
        this.role = context.role;
      }

      protected tenantFilter(): { tenantId?: string } {
        if (this.role === 'super_admin') return {};
        if (!this.tenantId) throw new Error('Tenant gerekli');
        return { tenantId: this.tenantId };
      }

      protected auditCreate = vi.fn().mockResolvedValue(undefined);
      protected auditUpdate = vi.fn().mockResolvedValue(undefined);
      protected auditDelete = vi.fn().mockResolvedValue(undefined);

      protected notDeleted(showDeleted?: boolean): { deletedAt?: null } | Record<string, never> {
        if (showDeleted) return {};
        return { deletedAt: null };
      }
    },
  };
});

describe('InventoryRepository', () => {
  const tenantId = 'tenant-1';
  const role = 'technician';
  let repo: InventoryRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = new InventoryRepository({ tenantId, role });
  });

  const mockItem = {
    id: 'item-1',
    tenantId,
    name: 'Sediment Filtre 10"',
    sku: 'SED-10',
    quantity: 15,
    minStock: 5,
    unitPrice: 45.0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
  };

  const mockCriticalItem = {
    id: 'item-2',
    tenantId,
    name: 'Karbon Blok',
    sku: 'CARB-10',
    quantity: 3,
    minStock: 10,
    unitPrice: 85.0,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
  };

  // ─── findAll ────────────────────────────────

  describe('findAll', () => {
    it('should return all inventory items sorted by name', async () => {
      (prismaClient.inventoryItem.findMany as any).mockResolvedValue([
        mockItem,
        mockCriticalItem,
      ]);

      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Sediment Filtre 10"');
      expect(result[0].isCritical).toBe(false);
      expect(result[1].isCritical).toBe(true);
      expect(prismaClient.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, deletedAt: null },
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('should return empty array when no items', async () => {
      (prismaClient.inventoryItem.findMany as any).mockResolvedValue([]);
      const result = await repo.findAll();
      expect(result).toEqual([]);
    });
  });

  // ─── findById ──────────────────────────────

  describe('findById', () => {
    it('should return a single item', async () => {
      (prismaClient.inventoryItem.findFirst as any).mockResolvedValue(mockItem);

      const result = await repo.findById('item-1');

      expect(result.id).toBe('item-1');
      expect(result.name).toBe('Sediment Filtre 10"');
    });

    it('should throw NOT_FOUND when item does not belong to tenant', async () => {
      (prismaClient.inventoryItem.findFirst as any).mockResolvedValue(null);
      await expect(repo.findById('nonexistent')).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── create ─────────────────────────────────

  describe('create', () => {
    it('should create a new inventory item and log initial stock', async () => {
      const newItem = { ...mockItem, quantity: 10 };
      (prismaClient.inventoryItem.create as any).mockResolvedValue(newItem);
      (prismaClient.inventoryTransaction.create as any).mockResolvedValue({});

      const result = await repo.create({
        name: 'Sediment Filtre 10"',
        sku: 'SED-10',
        quantity: 10,
        minStock: 5,
        unitPrice: 45,
      });

      expect(result.name).toBe('Sediment Filtre 10"');
      expect(result.quantity).toBe(10);
      expect(prismaClient.inventoryItem.create).toHaveBeenCalledTimes(1);
      // Should log initial stock transaction
      expect(prismaClient.inventoryTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'IN',
            quantity: 10,
            referenceType: 'ADJUSTMENT',
            notes: 'Başlangıç stoğu',
          }),
        }),
      );
    });

    it('should not log transaction when quantity is 0', async () => {
      const newItem = { ...mockItem, quantity: 0 };
      (prismaClient.inventoryItem.create as any).mockResolvedValue(newItem);

      await repo.create({
        name: 'Test Item',
        quantity: 0,
      });

      expect(prismaClient.inventoryTransaction.create).not.toHaveBeenCalled();
    });

    it('should throw on empty name', async () => {
      await expect(repo.create({ name: '' })).rejects.toThrow('VALIDATION_ERROR');
    });
  });

  // ─── update ─────────────────────────────────

  describe('update', () => {
    it('should update item fields', async () => {
      (prismaClient.inventoryItem.findFirst as any).mockResolvedValue(mockItem);
      (prismaClient.inventoryItem.update as any).mockResolvedValue({
        ...mockItem,
        minStock: 10,
        unitPrice: 50,
      });

      const result = await repo.update('item-1', { minStock: 10, unitPrice: 50 });

      expect(result.minStock).toBe(10);
      expect(result.unitPrice).toBe(50);
    });

    it('should throw NOT_FOUND when item does not exist', async () => {
      (prismaClient.inventoryItem.findFirst as any).mockResolvedValue(null);
      await expect(repo.update('nonexistent', { name: 'test' })).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── remove ─────────────────────────────────

  describe('remove', () => {
    it('should soft delete an item', async () => {
      const now = new Date();
      (prismaClient.inventoryItem.findFirst as any).mockResolvedValue(mockItem);
      (prismaClient.inventoryItem.update as any).mockResolvedValue({ ...mockItem, deletedAt: now });

      await repo.remove('item-1');
      expect(prismaClient.inventoryItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NOT_FOUND when deleting nonexistent', async () => {
      (prismaClient.inventoryItem.findFirst as any).mockResolvedValue(null);
      await expect(repo.remove('nonexistent')).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── stockIn ────────────────────────────────

  describe('stockIn', () => {
    it('should increase quantity and log transaction', async () => {
      (prismaClient.inventoryItem.findFirst as any).mockResolvedValue(mockItem);
      (prismaClient.$transaction as any).mockResolvedValue([
        { ...mockItem, quantity: 25 },
        { id: 'tx-1' },
      ]);

      const result = await repo.stockIn('item-1', {
        type: 'IN',
        quantity: 10,
        referenceType: 'PURCHASE',
        notes: 'Yeni sipariş',
      });

      expect(result.quantity).toBe(25);
      expect(prismaClient.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw if type is not IN', async () => {
      await expect(
        repo.stockIn('item-1', { type: 'OUT', quantity: 5 }),
      ).rejects.toThrow('VALIDATION_ERROR');
    });

    it('should throw if quantity is not positive', async () => {
      await expect(
        repo.stockIn('item-1', { type: 'IN', quantity: -1 }),
      ).rejects.toThrow('VALIDATION_ERROR');
    });

    it('should throw NOT_FOUND for unauthorized item', async () => {
      (prismaClient.inventoryItem.findFirst as any).mockResolvedValue(null);
      await expect(
        repo.stockIn('other-item', { type: 'IN', quantity: 5 }),
      ).rejects.toThrow('NOT_FOUND');
    });
  });

  // ─── stockOut ───────────────────────────────

  describe('stockOut', () => {
    it('should decrease quantity and log transaction', async () => {
      (prismaClient.inventoryItem.findFirst as any).mockResolvedValue(mockItem);
      (prismaClient.inventoryItem.findUnique as any).mockResolvedValue({ quantity: 15 });
      (prismaClient.$transaction as any).mockResolvedValue([
        { ...mockItem, quantity: 10 },
        { id: 'tx-2' },
      ]);

      const result = await repo.stockOut('item-1', {
        type: 'OUT',
        quantity: 5,
        referenceType: 'SERVICE',
        notes: 'Servis kullanımı',
      });

      expect(result.quantity).toBe(10);
      expect(prismaClient.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw INSUFFICIENT_STOCK when quantity exceeds current stock', async () => {
      (prismaClient.inventoryItem.findFirst as any).mockResolvedValue({
        ...mockItem,
        quantity: 3,
      });

      await expect(
        repo.stockOut('item-1', { type: 'OUT', quantity: 10 }),
      ).rejects.toThrow('INSUFFICIENT_STOCK');
    });

    it('should throw if type is not OUT', async () => {
      await expect(
        repo.stockOut('item-1', { type: 'IN', quantity: 5 }),
      ).rejects.toThrow('VALIDATION_ERROR');
    });
  });

  // ─── getTransactions ────────────────────────

  describe('getTransactions', () => {
    it('should return transactions ordered by date desc', async () => {
      (prismaClient.inventoryItem.findFirst as any).mockResolvedValue(mockItem);
      (prismaClient.inventoryTransaction.findMany as any).mockResolvedValue([
        {
          id: 'tx-1',
          itemId: 'item-1',
          type: 'IN',
          quantity: 10,
          referenceType: 'PURCHASE',
          referenceId: null,
          notes: null,
          createdBy: null,
          createdAt: new Date('2025-06-02'),
        },
        {
          id: 'tx-2',
          itemId: 'item-1',
          type: 'OUT',
          quantity: 3,
          referenceType: 'SERVICE',
          referenceId: 'SRV-001',
          notes: 'Servis',
          createdBy: null,
          createdAt: new Date('2025-06-01'),
        },
      ]);

      const result = await repo.getTransactions('item-1');

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('IN');
      expect(result[1].referenceId).toBe('SRV-001');
    });

    it('should return empty array when no transactions', async () => {
      (prismaClient.inventoryItem.findFirst as any).mockResolvedValue(mockItem);
      (prismaClient.inventoryTransaction.findMany as any).mockResolvedValue([]);

      const result = await repo.getTransactions('item-1');
      expect(result).toEqual([]);
    });
  });

  // ─── findCritical ───────────────────────────

  describe('findCritical', () => {
    it('should return items where quantity <= minStock with shortage info', async () => {
      (prismaClient.inventoryItem.findMany as any).mockResolvedValue([
        mockItem,      // qty=15, min=5 → NOT critical
        mockCriticalItem, // qty=3, min=10 → critical, shortage=7
      ]);

      const result = await repo.findCritical();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('item-2');
      expect(result[0].shortage).toBe(7);
      expect(result[0].isCritical).toBe(true);
    });

    it('should return empty when all items have sufficient stock', async () => {
      (prismaClient.inventoryItem.findMany as any).mockResolvedValue([
        mockItem,
        { ...mockItem, id: 'item-3', quantity: 20, minStock: 5 },
      ]);

      const result = await repo.findCritical();
      expect(result).toEqual([]);
    });
  });

  // ─── countCritical ──────────────────────────

  describe('countCritical', () => {
    it('should count items where quantity <= minStock', async () => {
      (prismaClient.inventoryItem.findMany as any).mockResolvedValue([
        { id: '1', quantity: 15, minStock: 5 },
        { id: '2', quantity: 3, minStock: 10 },
        { id: '3', quantity: 0, minStock: 2 },
      ]);

      const result = await repo.countCritical();
      expect(result).toBe(2); // items 2 and 3 are critical
    });

    it('should return 0 when no critical items', async () => {
      (prismaClient.inventoryItem.findMany as any).mockResolvedValue([
        { id: '1', quantity: 15, minStock: 5 },
      ]);

      const result = await repo.countCritical();
      expect(result).toBe(0);
    });
  });

  // ─── Tenant Isolation ─────────────────────

  describe('tenant isolation', () => {
    it('should filter by tenant for non-super-admin', () => {
      const r = new InventoryRepository({ tenantId: 'tenant-a', role: 'technician' });
      expect((r as any).tenantFilter()).toEqual({ tenantId: 'tenant-a' });
    });

    it('should not filter for super_admin', () => {
      const r = new InventoryRepository({ tenantId: null, role: 'super_admin' });
      expect((r as any).tenantFilter()).toEqual({});
    });

    it('should throw if tenantId is missing for non-super-admin', () => {
      const r = new InventoryRepository({ tenantId: null, role: 'technician' });
      expect(() => (r as any).tenantFilter()).toThrow('Tenant gerekli');
    });
  });
});
