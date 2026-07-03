import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * GET /api/widget/settings?tenant=<tenantId>
 * Returns widget default values for a given tenant.
 * Requires at least viewer role.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole('viewer');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const tenantId = request.nextUrl.searchParams.get('tenant');
  if (!tenantId) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'tenant parametresi zorunludur' } },
      { status: 400 },
    );
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, logo: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Firma bulunamadı' } },
        { status: 404 },
      );
    }

    // Widget varsayılan değerleri
    return NextResponse.json({
      data: {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantLogo: tenant.logo,
        defaultJugPrice: 90,     // varsayılan damacana fiyatı
        defaultDevicePrice: 8000, // varsayılan cihaz fiyatı
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Widget ayarları alınamadı' } },
      { status: 500 },
    );
  }
}
