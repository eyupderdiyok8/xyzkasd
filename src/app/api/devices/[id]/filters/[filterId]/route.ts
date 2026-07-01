import { NextRequest, NextResponse } from 'next/server';
import { FilterTrackingRepository } from '@/repositories/filter-tracking.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * PUT /api/devices/:id/filters/:filterId
 * Update a filter tracking entry.
 * Minimum role: technician
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string; filterId: string } },
) {
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

  try {
    const filter = await new FilterTrackingRepository({
      tenantId: auth.tenantId,
      role: auth.role!,
      userId: auth.userId,
    }).update(params.filterId, {
      filterCatalogId: b.filterCatalogId ? String(b.filterCatalogId) : undefined,
      installedAt: b.installedAt !== undefined ? String(b.installedAt) : undefined,
      expectedLifespanDays: b.expectedLifespanDays !== undefined ? Number(b.expectedLifespanDays) : undefined,
      notes: b.notes !== undefined ? (b.notes ? String(b.notes) : null) : undefined,
    });
    return NextResponse.json({ data: filter });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Filtre kaydı bulunamadı' } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}

/**
 * DELETE /api/devices/:id/filters/:filterId
 * Remove a filter tracking entry.
 * Minimum role: technician
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; filterId: string } },
) {
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }
  if (!auth.tenantId) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Bu işlem için yetkiniz bulunmuyor.' } }, { status: 403 });
  }

  try {
    await new FilterTrackingRepository({
      tenantId: auth.tenantId,
      role: auth.role!,
      userId: auth.userId,
    }).remove(params.filterId);
    return NextResponse.json({ data: { success: true } });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Filtre kaydı bulunamadı' } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
