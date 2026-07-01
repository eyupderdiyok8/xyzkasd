import { NextResponse } from 'next/server';
import { DeviceRepository } from '@/repositories/device.repository';
import { requireRole } from '@/lib/supabase/require-role';


export async function GET(_: unknown, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new DeviceRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
  try {
    return NextResponse.json({ data: await repo.findById(id) });
  } catch {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Cihaz bulunamadı' } }, { status: 404 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  let b;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  const repo = new DeviceRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
  try {
    return NextResponse.json({ data: await repo.update(id, b) });
  } catch {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Cihaz bulunamadı' } }, { status: 404 });
  }
}

export async function DELETE(_: unknown, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new DeviceRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
  try {
    await repo.delete(id);
    return NextResponse.json({ data: { ok: true } });
  } catch {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Cihaz bulunamadı' } }, { status: 404 });
  }
}

/**
 * PATCH /api/devices/[id] — restore soft-deleted device
 * Body: { action: "restore" }
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole('manager');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  let b;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  if (b.action === 'restore') {
    const repo = new DeviceRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
    try {
      const updated = await repo.restore(id);
      return NextResponse.json({ data: updated });
    } catch {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Cihaz bulunamadı' } }, { status: 404 });
    }
  }

  return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz aksiyon' } }, { status: 400 });
}
