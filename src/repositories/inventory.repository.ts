import { BaseRepository } from './base.repository';

// ─── Types ─────────────────────────────────────

export interface InventoryItemDTO {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  minStock: number;
  unitPrice: number;
  isCritical: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryInput {
  name: string;
  sku?: string | null;
  quantity?: number;
  minStock?: number;
  unitPrice?: number;
}

export type TransactionType = 'IN' | 'OUT';
export type ReferenceType = 'PURCHASE' | 'SERVICE' | 'RETURN' | 'ADJUSTMENT' | 'OTHER';

export interface StockTransactionInput {
  type: TransactionType;
  quantity: number;
  referenceType?: ReferenceType;
  referenceId?: string | null;
  notes?: string | null;
  createdBy?: string | null;
}

export interface InventoryTransactionDTO {
  id: string;
  itemId: string;
  type: TransactionType;
  quantity: number;
  referenceType: string;
  referenceId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

// ─── Repository ────────────────────────────────

export class InventoryRepository extends BaseRepository {
  // ─── CRUD ───────────────────────────────────

  /**
   * List all inventory items for the tenant.
   * Optionally filter by critical stock (quantity <= minStock).
   */
  async findAll(options?: { critical?: boolean; showDeleted?: boolean }): Promise<InventoryItemDTO[]> {
    const items = await this.prisma.inventoryItem.findMany({
      where: { ...this.tenantFilter(), ...this.notDeleted(options?.showDeleted) },
      orderBy: { name: 'asc' },
    });

    let result = items.map((i) => this.toDTO(i));

    // In-memory filter for critical stock (quantity <= minStock)
    if (options?.critical) {
      result = result.filter((i) => i.quantity <= i.minStock);
    }

    return result;
  }

  /**
   * Get a single inventory item by id.
   */
  async findById(id: string): Promise<InventoryItemDTO> {
    const item = await this.ensureAccess(id);
    return this.toDTO(item);
  }

  /**
   * Create a new inventory item.
   */
  async create(input: InventoryInput): Promise<InventoryItemDTO> {
    if (!input.name) throw new Error('VALIDATION_ERROR: name is required');

    const item = await this.prisma.inventoryItem.create({
      data: {
        name: input.name,
        sku: input.sku ?? null,
        quantity: input.quantity ?? 0,
        minStock: input.minStock ?? 0,
        unitPrice: input.unitPrice ?? 0,
        tenantId: this.tenantId!,
      },
    });

    // Auto-log an initial stock-in if quantity > 0
    if (item.quantity > 0) {
      await this.prisma.inventoryTransaction.create({
        data: {
          itemId: item.id,
          tenantId: this.tenantId!,
          type: 'IN',
          quantity: item.quantity,
          referenceType: 'ADJUSTMENT',
          notes: 'Başlangıç stoğu',
          createdBy: null,
        },
      });
    }

    await this.auditCreate({
      entity: 'inventory_item',
      entityId: item.id,
      newValues: { name: item.name, sku: item.sku, quantity: item.quantity, minStock: item.minStock },
    });

    return this.toDTO(item);
  }

  /**
   * Update an inventory item.
   */
  async update(id: string, input: Partial<InventoryInput>): Promise<InventoryItemDTO> {
    const original = await this.ensureAccess(id);
    const oldValues = { name: original.name, sku: original.sku, minStock: original.minStock, unitPrice: original.unitPrice };

    const data: any = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.sku !== undefined) data.sku = input.sku;
    if (input.minStock !== undefined) data.minStock = input.minStock;
    if (input.unitPrice !== undefined) data.unitPrice = input.unitPrice;
    // quantity is NOT updated here — use stockIn/stockOut instead

    const item = await this.prisma.inventoryItem.update({ where: { id }, data });

    await this.auditUpdate({
      entity: 'inventory_item',
      entityId: id,
      oldValues,
      newValues: { name: item.name, sku: item.sku, minStock: item.minStock, unitPrice: item.unitPrice },
    });

    return this.toDTO(item);
  }

  /**
   * Soft-delete an inventory item (sets deletedAt).
   */
  async remove(id: string): Promise<void> {
    const original = await this.ensureAccess(id);
    await this.prisma.inventoryItem.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditDelete({
      entity: 'inventory_item',
      entityId: id,
      deletedValues: { name: original.name, sku: original.sku, quantity: original.quantity },
    });
  }

  // ─── Stock Transactions ─────────────────────

  /**
   * Record a stock IN transaction and update item quantity.
   */
  async stockIn(id: string, input: StockTransactionInput): Promise<InventoryItemDTO> {
    if (input.type !== 'IN') throw new Error('VALIDATION_ERROR: type must be IN for stockIn');
    if (input.quantity <= 0) throw new Error('VALIDATION_ERROR: quantity must be positive');

    const original = await this.ensureAccess(id);

    const [item] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id },
        data: { quantity: { increment: input.quantity } },
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          itemId: id,
          tenantId: this.tenantId!,
          type: 'IN',
          quantity: input.quantity,
          referenceType: input.referenceType ?? 'OTHER',
          referenceId: input.referenceId ?? null,
          notes: input.notes ?? null,
          createdBy: input.createdBy ?? null,
        },
      }),
    ]);

    await this.auditUpdate({
      entity: 'inventory_item',
      entityId: id,
      oldValues: { quantity: original.quantity },
      newValues: { quantity: item.quantity },
    });

    return this.toDTO(item);
  }

  /**
   * Record a stock OUT transaction and update item quantity.
   * Throws if insufficient stock.
   */
  async stockOut(id: string, input: StockTransactionInput): Promise<InventoryItemDTO> {
    if (input.type !== 'OUT') throw new Error('VALIDATION_ERROR: type must be OUT for stockOut');
    if (input.quantity <= 0) throw new Error('VALIDATION_ERROR: quantity must be positive');

    const original = await this.ensureAccess(id);

    // Check current stock before going negative
    if (original.quantity < input.quantity) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    const [item] = await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id },
        data: { quantity: { decrement: input.quantity } },
      }),
      this.prisma.inventoryTransaction.create({
        data: {
          itemId: id,
          tenantId: this.tenantId!,
          type: 'OUT',
          quantity: input.quantity,
          referenceType: input.referenceType ?? 'OTHER',
          referenceId: input.referenceId ?? null,
          notes: input.notes ?? null,
          createdBy: input.createdBy ?? null,
        },
      }),
    ]);

    await this.auditUpdate({
      entity: 'inventory_item',
      entityId: id,
      oldValues: { quantity: original.quantity },
      newValues: { quantity: item.quantity },
    });

    return this.toDTO(item);
  }

  // ─── Transactions Log ───────────────────────

  /**
   * Get all transactions for a specific item.
   */
  async getTransactions(itemId: string, limit = 50): Promise<InventoryTransactionDTO[]> {
    await this.ensureAccess(itemId);

    const rows = await this.prisma.inventoryTransaction.findMany({
      where: { itemId, ...this.tenantFilter() },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map((r) => ({
      id: r.id,
      itemId: r.itemId,
      type: r.type as TransactionType,
      quantity: r.quantity,
      referenceType: r.referenceType,
      referenceId: r.referenceId,
      notes: r.notes,
      createdBy: r.createdBy,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  // ─── Critical Stock ─────────────────────────

  /**
   * Find items where quantity <= minStock (critical stock).
   * Returns items enriched with shortage info.
   */
  async findCritical(): Promise<(InventoryItemDTO & { shortage: number })[]> {
    const items = await this.prisma.inventoryItem.findMany({
      where: { ...this.tenantFilter(), deletedAt: null },
      orderBy: { quantity: 'asc' },
    });

    return items
      .filter((i) => i.quantity <= i.minStock)
      .map((i) => ({
        ...this.toDTO(i),
        shortage: i.minStock - i.quantity,
      }));
  }

  /**
   * Count how many items are at or below critical stock level.
   */
  async countCritical(): Promise<number> {
    const all = await this.prisma.inventoryItem.findMany({
      where: { ...this.tenantFilter(), deletedAt: null },
      select: { id: true, quantity: true, minStock: true },
    });
    return all.filter((i) => i.quantity <= i.minStock).length;
  }

  // ─── Helpers ────────────────────────────────

  private toDTO(item: any): InventoryItemDTO {
    return {
      id: item.id,
      name: item.name,
      sku: item.sku ?? null,
      quantity: item.quantity,
      minStock: item.minStock,
      unitPrice: item.unitPrice,
      isCritical: item.quantity <= item.minStock,
      createdAt: item.createdAt.toISOString?.() ?? item.createdAt,
      updatedAt: item.updatedAt.toISOString?.() ?? item.updatedAt,
    };
  }

  private async ensureAccess(id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, deletedAt: null, ...this.tenantFilter() },
    });
    if (!item) throw new Error('NOT_FOUND');
    return item;
  }
}
