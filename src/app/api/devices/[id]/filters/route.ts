import { NextRequest, NextResponse } from 'next/server';
import { FilterTrackingRepository } from '@/repositories/filter-tracking.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * GET /api/devices/:id/filters
 * Returns filter tracking entries for a device with computed lifecycle info.
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
    const filters = await new FilterTrackingRepository({
      tenantId: auth.tenantId,
      role: auth.role!,
      userId: auth.userId,
    }).findByDevice(id);
    return NextResponse.json({ data: filters });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Cihaz bulunamadı' } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}

/**
 * POST /api/devices/:id/filters
 * Install a new filter on a device.
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
  if (!auth.tenantId) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Bu işlem için yetkiniz bulunmuyor.' } }, { status: 403 });
  }

  let b;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  if (!b.filterCatalogId || !b.expectedLifespanDays) {
    return NextResponse.json({
      error: { code: 'VALIDATION_ERROR', message: 'filterCatalogId ve expectedLifespanDays zorunludur' },
    }, { status: 400 });
  }

  try {
    const filter = await new FilterTrackingRepository({
      tenantId: auth.tenantId,
      role: auth.role!,
      userId: auth.userId,
    }).add(id, {
      filterCatalogId: String(b.filterCatalogId),
      installedAt: b.installedAt ? String(b.installedAt) : undefined,
      expectedLifespanDays: Number(b.expectedLifespanDays),
      notes: b.notes ? String(b.notes) : null,
    });
    return NextResponse.json({ data: filter }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Cihaz bulunamadı' } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
