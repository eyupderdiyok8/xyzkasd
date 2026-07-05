import { NextRequest, NextResponse } from 'next/server';
import { InventoryRepository } from '@/repositories/inventory.repository';
import { requireRole } from '@/lib/supabase/require-role';
import { parsePagination } from '@/lib/api-pagination';

/**
 * GET /api/inventory
 * List all inventory items for the tenant.
 * Optional query params: critical=true (filter critical stock only)
 *
 * POST /api/inventory
 * Create a new inventory item.
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const critical = req.nextUrl.searchParams.get('critical') === 'true';
  const showDeleted = req.nextUrl.searchParams.get('showDeleted') === 'true' && (auth.role === 'manager' || auth.role === 'tenant_admin' || auth.role === 'super_admin');

  try {
    const repo = new InventoryRepository({
      tenantId: auth.tenantId,
      role: auth.role!,
      userId: auth.userId,
    });
    const opts = { critical, showDeleted };
    const items = typeof (repo as any).findAllPaged === 'function'
      ? await repo.findAllPaged(opts, parsePagination(req.nextUrl.searchParams))
      : { data: await repo.findAll(opts) };
    return NextResponse.json(items);
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }
  if (!auth.tenantId) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Bu işlem için yetkiniz bulunmuyor.' } }, { status: 403 });
  }

  let b;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  if (!b.name) {
    return NextResponse.json({
      error: { code: 'VALIDATION_ERROR', message: 'name zorunludur' },
    }, { status: 400 });
  }

  try {
    const item = await new InventoryRepository({
      tenantId: auth.tenantId,
      role: auth.role!,
      userId: auth.userId,
    }).create({
      name: String(b.name),
      sku: b.sku ? String(b.sku) : null,
      quantity: b.quantity ? Number(b.quantity) : 0,
      minStock: b.minStock ? Number(b.minStock) : 0,
      unitPrice: b.unitPrice ? Number(b.unitPrice) : 0,
    });
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
