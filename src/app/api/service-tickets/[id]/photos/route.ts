import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ServiceTicketRepository } from '@/repositories/service-ticket.repository';
import { ServicePhotoStorage } from '@/lib/storage/service-photos';
import type { ProfileRow } from '@/lib/supabase/types';
import { requireRole } from '@/lib/supabase/require-role';

async function getRepo() {
  const su = await createServerSupabaseClient();
  const { data: { user } } = await su.auth.getUser();
  if (!user) return null;
  const { data: _p } = await su.from('profiles').select('*').eq('id', user.id).single();
  const p = _p as ProfileRow | null;
  if (!p || !p.tenant_id) return null;
  const profile = p as ProfileRow & { tenant_id: string };
  return {
    repo: new ServiceTicketRepository({ tenantId: profile.tenant_id, role: profile.role, userId: user.id }),
    profile,
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

  // Require minimum technician role for uploading photos
  const roleCheck = await requireRole('technician');
  if (!roleCheck.ok) {
    return NextResponse.json({ error: roleCheck.error }, { status: roleCheck.error!.status });
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
      ctx.profile.tenant_id,
      id,
      String(b.fileName),
      String(b.contentType),
    );

    // Record photo metadata in DB
    const photo = await ctx.repo.addPhoto({
      ticketId: id,
      tenantId: ctx.profile.tenant_id,
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
