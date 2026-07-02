import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/inventory/:id/photo — Upload stock item photo (base64)
 * Body: { photo: "data:image/png;base64,..." }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireRole('technician');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });

  let b;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  const photo = b.photo as string | undefined;
  if (!photo || typeof photo !== 'string' || !photo.startsWith('data:image/')) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'photo base64 data URL olmalı' } }, { status: 400 });
  }

  // Store the photo path in DB (just the path reference — we'll embed the base64 directly)
  try {
    const item = await prisma.inventoryItem.update({
      where: { id, tenantId: auth.tenantId! },
      data: { photoPath: photo },
    });
    return NextResponse.json({ data: { photoPath: item.photoPath } });
  } catch {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Stok kalemi bulunamadı' } }, { status: 404 });
  }
}
