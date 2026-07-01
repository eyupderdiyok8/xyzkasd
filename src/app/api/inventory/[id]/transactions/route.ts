import { NextRequest, NextResponse } from 'next/server';
import { InventoryRepository } from '@/repositories/inventory.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * GET /api/inventory/:id/transactions
 * Returns stock movement history for a specific item.
 * Minimum role: technician
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
    const transactions = await new InventoryRepository({
      tenantId: auth.tenantId,
      role: auth.role!,
      userId: auth.userId,
    }).getTransactions(id);
    return NextResponse.json({ data: transactions });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Stok kalemi bulunamadı' } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
