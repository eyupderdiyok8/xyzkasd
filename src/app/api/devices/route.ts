import { NextRequest, NextResponse } from 'next/server';
import { DeviceRepository } from '@/repositories/device.repository';
import { requireRole } from '@/lib/supabase/require-role';

export async function GET(req: NextRequest) {
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }
  const search = req.nextUrl.searchParams.get('search') || undefined;
  const status = req.nextUrl.searchParams.get('status') || undefined;
  const showDeleted = req.nextUrl.searchParams.get('showDeleted') === 'true' && (auth.role === 'manager' || auth.role === 'tenant_admin' || auth.role === 'super_admin');
  const devices = await new DeviceRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId }).findAll({ search, status, showDeleted });
  return NextResponse.json({ data: devices });
}

export async function POST(req: Request) {
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  let b;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  if (!b.serialNo || !b.brand || !b.model) {
    return NextResponse.json({
      error: { code: 'VALIDATION_ERROR', message: 'serialNo, brand ve model zorunludur' },
    }, { status: 400 });
  }

  // Resolve tenant: super admin passes it in body, others use their own tenant
  const tenantId = auth.role === 'super_admin'
    ? (typeof b.tenantId === 'string' ? b.tenantId : null)
    : auth.tenantId;
  if (!tenantId) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Tenant seçilmedi. Süper admin tenant seçmelidir.' } },
      { status: 403 },
    );
  }

  try {
    const d = await new DeviceRepository({ tenantId, role: auth.role!, userId: auth.userId }).create({
      serialNo: String(b.serialNo),
      brand: String(b.brand),
      model: String(b.model),
      tenantId,
      customerId: b.customerId ? String(b.customerId) : undefined,
      warrantyStart: b.warrantyStart ? String(b.warrantyStart) : null,
      warrantyEnd: b.warrantyEnd ? String(b.warrantyEnd) : null,
      installDate: b.installDate ? String(b.installDate) : null,
      notes: b.notes ? String(b.notes) : null,
      status: b.status ?? 'ACTIVE',
    });
    return NextResponse.json({ data: d }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
