import { NextResponse } from 'next/server';
import { DeviceRepository } from '@/repositories/device.repository';
import { requireRole } from '@/lib/supabase/require-role';

export async function GET(_: unknown, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }
  try {
    const repo = new DeviceRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
    return NextResponse.json({ data: await repo.getTdsHistory(id) });
  } catch {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }
  if (!auth.tenantId || !auth.userId) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Bu işlem için yetkiniz bulunmuyor.' } }, { status: 403 });
  }

  let b;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 });
  }

  const tv = Number(b.tdsValue);
  if (!tv || tv < 0 || tv > 5000) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'tdsValue 0-5000' } }, { status: 400 });
  }

  try {
    const repo = new DeviceRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
    const r = await repo.addTdsReading({
      deviceId: id,
      tenantId: auth.tenantId!,
      tdsValue: tv,
      inValue: b.inValue ? Number(b.inValue) : null,
      outValue: b.outValue ? Number(b.outValue) : null,
      notes: b.notes ? String(b.notes) : null,
      recordedBy: auth.userId!,
    });
    return NextResponse.json({ data: r }, { status: 201 });
  } catch {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }
}
