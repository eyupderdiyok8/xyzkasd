import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { prismaClient } from '@/repositories/base.repository';

/**
 * GET /api/technicians
 * Returns active technicians for the current tenant (manager+).
 * Super admin sees all.
 */
export async function GET() {
  const auth = await requireRole('manager');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });

  const where: any = { deletedAt: null };

  // Non-super-admin: filter by own tenant
  if (auth.role !== 'super_admin' && auth.tenantId) {
    where.tenantId = auth.tenantId;
  }

  const technicians = await prismaClient.technician.findMany({
    where,
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      isActive: true,
      _count: { select: { serviceTickets: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ data: technicians });
}

/**
 * POST /api/technicians
 * Body: { name, phone?, email? }
 * Creates a new technician for the current tenant (manager+).
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole('manager');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });

  let body: { name: string; phone?: string; email?: string; tenantId?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Teknisyen adı zorunlu' } }, { status: 400 });
  }

  const tenantId = auth.role === 'super_admin' && body.tenantId
    ? body.tenantId
    : auth.tenantId;

  if (!tenantId) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Tenant seçilmedi' } }, { status: 400 });
  }

  const tech = await prismaClient.technician.create({
    data: {
      name: body.name.trim(),
      phone: body.phone?.trim() || null,
      email: body.email?.trim() || null,
      tenantId,
    },
    select: { id: true, name: true, phone: true, email: true, isActive: true },
  });

  return NextResponse.json({ data: tech }, { status: 201 });
}
