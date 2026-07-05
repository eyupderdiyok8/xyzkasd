import { NextRequest, NextResponse } from 'next/server';
import { blogCommentDelegate } from '@/lib/blog-db';
import { requireRole } from '@/lib/supabase/require-role';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('super_admin');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status = body.status === 'APPROVED' ? 'APPROVED' : body.status === 'REJECTED' ? 'REJECTED' : 'PENDING';

  const comment = await blogCommentDelegate().update({
    where: { id },
    data: { status, approvedAt: status === 'APPROVED' ? new Date() : null },
    include: { post: { select: { title: true, slug: true } } },
  });

  return NextResponse.json({ data: comment });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('super_admin');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });

  const { id } = await params;
  await blogCommentDelegate().delete({ where: { id } });
  return NextResponse.json({ data: { ok: true } });
}
