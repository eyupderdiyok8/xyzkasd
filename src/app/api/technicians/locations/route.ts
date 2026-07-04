import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * POST /api/technicians/location
 * Body: { lat: number, lng: number, technicianId?: string }
 * Teknisyen kendi konumunu günceller.
 * technicianId verilmezse, giriş yapan kullanıcının bağlı olduğu teknisyen kullanılır.
 */
export async function POST(req: NextRequest) {
  const auth = await requireRole('technician');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  if (!auth.tenantId) return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });
  if (!auth.userId) return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Kullanıcı bulunamadı' } }, { status: 403 });

  let body: { lat: number; lng: number };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  if (typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'lat ve lng zorunlu (number)' } }, { status: 400 });
  }

  // Teknisyeni userId ile bul
  const tech = await prisma.technician.findFirst({
    where: { userId: auth.userId, tenantId: auth.tenantId, isActive: true },
    select: { id: true },
  });
  if (!tech) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Teknisyen kaydı bulunamadı. Profiliniz bir teknisyene bağlı değil.' } }, { status: 404 });
  }

  await prisma.technician.update({
    where: { id: tech.id },
    data: { lastLat: body.lat, lastLng: body.lng, locationUpdatedAt: new Date() },
  });

  return NextResponse.json({ data: { success: true } });
}

/**
 * GET /api/technicians/locations
 * Tüm aktif teknisyenlerin son konumlarını döndürür.
 */
export async function GET() {
  const auth = await requireRole('manager');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  if (!auth.tenantId) return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });

  const techs = await prisma.technician.findMany({
    where: { tenantId: auth.tenantId, isActive: true, deletedAt: null },
    select: {
      id: true,
      name: true,
      phone: true,
      lastLat: true,
      lastLng: true,
      locationUpdatedAt: true,
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ data: techs });
}
