import { NextRequest, NextResponse } from 'next/server';
import { ServiceTicketRepository } from '@/repositories/service-ticket.repository';
import { ServicePhotoStorage } from '@/lib/storage/service-photos';
import { requireRole } from '@/lib/supabase/require-role';

async function getRepo() {
  const auth = await requireRole('technician');
  if (!auth.ok || !auth.tenantId) return null;
  return {
    repo: new ServiceTicketRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId }),
    tenantId: auth.tenantId,
  };
}

/**
 * POST /api/service-tickets/:id/photos
 * Body: { fileName, contentType, photoType? }
 * Returns a signed upload URL and the public URL.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getRepo();
  if (!ctx) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 });
  }

  let b;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  if (!b.fileName || !b.contentType) {
    return NextResponse.json({
      error: { code: 'VALIDATION_ERROR', message: 'fileName ve contentType zorunludur' },
    }, { status: 400 });
  }

  try {
    const storage = new ServicePhotoStorage();
    const { uploadUrl, publicUrl, storagePath } = await storage.getUploadUrl(
      ctx.tenantId,
      id,
      String(b.fileName),
      String(b.contentType),
    );

    // Record photo metadata in DB
    const photo = await ctx.repo.addPhoto({
      ticketId: id,
      tenantId: ctx.tenantId,
      storagePath,
      fileName: String(b.fileName),
      mimeType: String(b.contentType),
      photoType: b.photoType ?? 'GENERAL',
    });

    return NextResponse.json({
      data: { uploadUrl, publicUrl, photo },
    }, { status: 201 });
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') {
      return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    }
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
