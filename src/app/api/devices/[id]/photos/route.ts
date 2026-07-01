import { NextRequest, NextResponse } from 'next/server';
import { DeviceRepository } from '@/repositories/device.repository';
import { requireRole } from '@/lib/supabase/require-role';
import { devicePhotoStorage } from '@/lib/storage/device-photos';

export async function GET(_: unknown, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }
  try {
    const repo = new DeviceRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
    return NextResponse.json({ data: await repo.getPhotos(id) });
  } catch {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Cihaz bulunamadı' } }, { status: 404 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 });
  }

  if (!b.fileName || !b.contentType) {
    return NextResponse.json({
      error: { code: 'VALIDATION_ERROR', message: 'fileName ve contentType zorunludur' },
    }, { status: 400 });
  }

  try {
    const repo = new DeviceRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
    const sp = 'tenants/' + auth.tenantId + '/devices/' + id + '/' + b.fileName;
    const photo = await repo.addPhoto({
      deviceId: id,
      tenantId: auth.tenantId,
      storagePath: sp,
      fileName: b.fileName,
      mimeType: b.contentType,
      isPrimary: b.isPrimary ?? false,
    });
    const pub = (process.env.NEXT_PUBLIC_SUPABASE_URL || '') + '/storage/v1/object/public/device-photos/' + sp;
    return NextResponse.json({ data: { photo, publicUrl: pub } }, { status: 201 });
  } catch {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }
  if (!auth.tenantId) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Bu işlem için yetkiniz bulunmuyor.' } }, { status: 403 });
  }

  const repo = new DeviceRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });
  const photoId = req.nextUrl.searchParams.get('photoId');

  if (photoId) {
    // Delete single photo
    const photo = await repo.getPhoto(photoId);
    await devicePhotoStorage.deletePhoto(photo.storagePath).catch((err) =>
      console.error('Storage delete error (ignored):', err.message),
    );
    await repo.deletePhoto(photoId);
    return NextResponse.json({ data: { ok: true } });
  }

  // Delete all photos for this device
  const photos = await repo.getPhotos(id);

  for (const photo of photos) {
    await devicePhotoStorage.deletePhoto(photo.storagePath).catch((err) =>
      console.error('Storage delete error (ignored):', err.message),
    );
  }

  await repo.deleteAllPhotos(id);
  return NextResponse.json({ data: { ok: true } });
}
