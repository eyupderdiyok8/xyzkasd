import { NextRequest, NextResponse } from 'next/server';
import { blogPostDelegate } from '@/lib/blog-db';
import { requireRole } from '@/lib/supabase/require-role';
import { buildBlogToc, parseBlogContent, slugify, stringifyBlogContent } from '@/lib/blog';

const POST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImageUrl: true,
  coverImageAlt: true,
  contentJson: true,
  tocJson: true,
  seoTitle: true,
  seoDescription: true,
  status: true,
  publishedAt: true,
  authorId: true,
  authorName: true,
  category: true,
  tags: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { comments: true } },
};

async function ensureUniqueSlug(slug: string, exceptId?: string) {
  const base = slugify(slug) || 'blog-yazisi';
  let candidate = base;
  let index = 2;

  while (await blogPostDelegate().findFirst({ where: { slug: candidate, id: exceptId ? { not: exceptId } : undefined } })) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}

export async function GET(req: NextRequest) {
  const auth = await requireRole('super_admin');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });

  const status = req.nextUrl.searchParams.get('status') || undefined;

  try {
    const posts = await blogPostDelegate().findMany({
      where: {
        deletedAt: null,
        ...(status && status !== 'ALL' ? { status } : {}),
      },
      orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
      select: POST_SELECT,
    });

    return NextResponse.json({ data: posts });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'BLOG_TABLE_ERROR', message: err.message || 'Blog tabloları okunamadı' } },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('super_admin');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Başlık zorunludur' } }, { status: 400 });
  }

  const contentJson = stringifyBlogContent(body.content);
  const tocJson = JSON.stringify(buildBlogToc(parseBlogContent(contentJson)));
  const status = body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';

  try {
    const slug = await ensureUniqueSlug(body.slug || body.title);
    const post = await blogPostDelegate().create({
      data: {
        title: body.title.trim(),
        slug,
        excerpt: String(body.excerpt || '').trim(),
        coverImageUrl: body.coverImageUrl || null,
        coverImageAlt: body.coverImageAlt || null,
        contentJson,
        tocJson,
        seoTitle: body.seoTitle || null,
        seoDescription: body.seoDescription || null,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        authorId: auth.userId,
        authorName: body.authorName || null,
        category: body.category || '',
        tags: JSON.stringify(Array.isArray(body.tags) ? body.tags : []),
      },
      select: POST_SELECT,
    });

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'BLOG_SAVE_ERROR', message: err.message || 'Yazı kaydedilemedi' } },
      { status: 500 },
    );
  }
}
