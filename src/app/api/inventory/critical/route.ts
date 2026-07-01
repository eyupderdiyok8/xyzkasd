import { NextResponse } from 'next/server';
import { InventoryRepository } from '@/repositories/inventory.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * GET /api/inventory/critical
 * Returns items where quantity <= minStock (critical stock level).
 * Minimum role: technician
 */
export async function GET() {
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  try {
    const repo = new InventoryRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
    const items = await repo.findCritical();
    const count = await repo.countCritical();
    return NextResponse.json({ data: items, count });
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
