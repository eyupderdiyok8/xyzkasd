import { NextRequest, NextResponse } from 'next/server';
import { InventoryRepository } from '@/repositories/inventory.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * GET /api/inventory/:id
 * Returns a single inventory item.
 *
 * PUT /api/inventory/:id
 * Update item details (name, sku, minStock, unitPrice).
 * Quantity is NOT updated here — use stock-in/stock-out endpoints.
 *
 * DELETE /api/inventory/:id
 * Remove an inventory item.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  try {
    const item = await new InventoryRepository({
      tenantId: auth.tenantId,
      role: auth.role!,
      userId: auth.userId,
    }).findById(id);
    return NextResponse.json({ data: item });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Stok kalemi bulunamadı' } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  let b;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  try {
    const item = await new InventoryRepository({
      tenantId: auth.tenantId,
      role: auth.role!,
      userId: auth.userId,
    }).update(id, {
      name: b.name !== undefined ? String(b.name) : undefined,
      sku: b.sku !== undefined ? (b.sku ? String(b.sku) : null) : undefined,
      minStock: b.minStock !== undefined ? Number(b.minStock) : undefined,
      unitPrice: b.unitPrice !== undefined ? Number(b.unitPrice) : undefined,
    });
    return NextResponse.json({ data: item });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Stok kalemi bulunamadı' } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireRole('manager');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  try {
    await new InventoryRepository({
      tenantId: auth.tenantId,
      role: auth.role!,
      userId: auth.userId,
    }).remove(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Stok kalemi bulunamadı' } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
