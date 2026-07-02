import { NextResponse } from 'next/server';
import { InventoryRepository } from '@/repositories/inventory.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * POST /api/inventory/:id/stock-in
 * Record a stock IN transaction and increase quantity.
 * Minimum role: technician
 */
export async function POST(
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

  if (!b.quantity || Number(b.quantity) <= 0) {
    return NextResponse.json({
      error: { code: 'VALIDATION_ERROR', message: 'quantity pozitif bir sayı olmalıdır' },
    }, { status: 400 });
  }

  try {
    const item = await new InventoryRepository({
      tenantId: auth.tenantId,
      role: auth.role!,
      userId: auth.userId,
    }).stockIn(id, {
      type: 'IN',
      quantity: Number(b.quantity),
      unitCost: b.unitCost != null ? Number(b.unitCost) : undefined,
      referenceType: b.referenceType ?? 'OTHER',
      referenceId: b.referenceId ? String(b.referenceId) : null,
      notes: b.notes ? String(b.notes) : null,
      createdBy: auth.userId ?? undefined,
    });
    return NextResponse.json({ data: item });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Stok kalemi bulunamadı' } }, { status: 404 });
    }
    if (e.message?.startsWith('VALIDATION_ERROR')) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: e.message.replace('VALIDATION_ERROR: ', '') } }, { status: 400 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
