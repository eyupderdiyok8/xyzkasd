import { NextRequest, NextResponse } from 'next/server';
import { DeviceRepository } from '@/repositories/device.repository';
import { requireRole } from '@/lib/supabase/require-role';

export async function GET(req: NextRequest) {
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const code = req.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'code zorunludur' } }, { status: 400 });

  try {
    const d = await new DeviceRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId }).findByQrCode(code);
    if (!d) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'QR koda ait cihaz yok' } }, { status: 404 });
    return NextResponse.json({ data: d });
  } catch {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR' } }, { status: 500 });
  }
}
