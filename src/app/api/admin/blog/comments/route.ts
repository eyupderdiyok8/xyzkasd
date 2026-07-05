import { NextRequest, NextResponse } from 'next/server';
import { blogCommentDelegate } from '@/lib/blog-db';
import { requireRole } from '@/lib/supabase/require-role';

export async function GET(req: NextRequest) {
  const auth = await requireRole('super_admin');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });

  const status = req.nextUrl.searchParams.get('status') || 'PENDING';
  try {
    const comments = await blogCommentDelegate().findMany({
      where: status === 'ALL' ? {} : { status },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { post: { select: { title: true, slug: true } } },
    });

    return NextResponse.json({ data: comments });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'BLOG_COMMENTS_TABLE_ERROR', message: err.message || 'Blog yorumları okunamadı' } },
      { status: 500 },
    );
  }
}
