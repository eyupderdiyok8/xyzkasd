import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { prismaClient } from '@/repositories/base.repository';

/**
 * PUT /api/technicians/[id]
 * Body: { name?, phone?, email?, isActive? }
 * Updates a technician. Manager+ for own tenant, super_admin for any.
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole('manager');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });

  const where: any = { id: id, deletedAt: null };
  if (auth.role !== 'super_admin' && auth.tenantId) {
    where.tenantId = auth.tenantId;
  }

  const existing = await prismaClient.technician.findFirst({ where });
  if (!existing) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Teknisyen bulunamadı' } }, { status: 404 });

  let body: { name?: string; phone?: string | null; email?: string | null; isActive?: boolean };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  const data: any = {};
  if (body.name?.trim()) data.name = body.name.trim();
  if (body.phone !== undefined) data.phone = body.phone?.trim() || null;
  if (body.email !== undefined) data.email = body.email?.trim() || null;
  if (body.isActive !== undefined) data.isActive = body.isActive;

  const updated = await prismaClient.technician.update({
    where: { id: id },
    data,
    select: { id: true, name: true, phone: true, email: true, isActive: true },
  });

  return NextResponse.json({ data: updated });
}
