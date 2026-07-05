export interface StockWarning {
  code: 'INSUFFICIENT_STOCK' | 'INVENTORY_ITEM_NOT_FOUND';
  itemId?: string;
  itemName?: string;
  requested?: number;
  available?: number;
  message: string;
}

export function normalizeInventoryName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ');
}

export async function findInventoryItemForPart(
  prisma: any,
  tenantId: string,
  part: { inventoryItemId?: string | null; name?: string | null },
) {
  if (part.inventoryItemId) {
    return prisma.inventoryItem.findFirst({
      where: { id: part.inventoryItemId, tenantId, deletedAt: null },
      select: { id: true, name: true, quantity: true },
    });
  }

  const name = normalizeInventoryName(part.name ?? '');
  if (!name) return null;

  const items = await prisma.inventoryItem.findMany({
    where: { tenantId, deletedAt: null },
    select: { id: true, name: true, quantity: true },
  });

  return items.find((item: { name: string }) => normalizeInventoryName(item.name) === name) ?? null;
}

export async function stockOutAllowNegative(
  prisma: any,
  input: {
    itemId: string;
    tenantId: string;
    quantity: number;
    referenceType: string;
    referenceId: string;
    notes: string;
    createdBy?: string | null;
  },
): Promise<StockWarning | null> {
  const qty = Math.max(1, Math.trunc(Number(input.quantity) || 1));
  const item = await prisma.inventoryItem.findFirst({
    where: { id: input.itemId, tenantId: input.tenantId, deletedAt: null },
    select: { id: true, name: true, quantity: true },
  });

  if (!item) {
    return {
      code: 'INVENTORY_ITEM_NOT_FOUND',
      itemId: input.itemId,
      requested: qty,
      message: 'Stok kalemi bulunamadı, stok hareketi oluşturulmadı.',
    };
  }

  await prisma.inventoryItem.update({
    where: { id: item.id },
    data: { quantity: { decrement: qty } },
  });

  await prisma.inventoryTransaction.create({
    data: {
      itemId: item.id,
      tenantId: input.tenantId,
      type: 'OUT',
      quantity: qty,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      notes: input.notes,
      createdBy: input.createdBy ?? null,
    },
  });

  if (item.quantity < qty) {
    return {
      code: 'INSUFFICIENT_STOCK',
      itemId: item.id,
      itemName: item.name,
      requested: qty,
      available: item.quantity,
      message: `${item.name} stoğu yetersizdi (${item.quantity}/${qty}); işlem devam etti.`,
    };
  }

  return null;
}
