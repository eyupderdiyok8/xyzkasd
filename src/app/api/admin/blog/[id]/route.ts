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
};

async function ensureUniqueSlug(slug: string, exceptId: string) {
  const base = slugify(slug) || 'blog-yazisi';
  let candidate = base;
  let index = 2;

  while (await blogPostDelegate().findFirst({ where: { slug: candidate, id: { not: exceptId } } })) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('super_admin');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });

  const { id } = await params;
  const post = await blogPostDelegate().findFirst({ where: { id, deletedAt: null }, select: POST_SELECT });
  if (!post) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Yazı bulunamadı' } }, { status: 404 });

  return NextResponse.json({ data: post });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('super_admin');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });

  const { id } = await params;
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  const existing = await blogPostDelegate().findFirst({ where: { id, deletedAt: null } });
  if (!existing) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Yazı bulunamadı' } }, { status: 404 });

  const contentJson = body.content !== undefined ? stringifyBlogContent(body.content) : existing.contentJson;
  const tocJson = JSON.stringify(buildBlogToc(parseBlogContent(contentJson)));
  const nextStatus = body.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT';
  const wasPublished = existing.status === 'PUBLISHED';

  const post = await blogPostDelegate().update({
    where: { id },
    data: {
      title: String(body.title || existing.title).trim(),
      slug: await ensureUniqueSlug(body.slug || body.title || existing.slug, id),
      excerpt: String(body.excerpt ?? existing.excerpt ?? '').trim(),
      coverImageUrl: body.coverImageUrl === '' ? null : body.coverImageUrl ?? existing.coverImageUrl,
      coverImageAlt: body.coverImageAlt === '' ? null : body.coverImageAlt ?? existing.coverImageAlt,
      contentJson,
      tocJson,
      seoTitle: body.seoTitle === '' ? null : body.seoTitle ?? existing.seoTitle,
      seoDescription: body.seoDescription === '' ? null : body.seoDescription ?? existing.seoDescription,
      status: nextStatus,
      publishedAt: nextStatus === 'PUBLISHED' ? existing.publishedAt ?? new Date() : null,
      authorId: existing.authorId ?? auth.userId,
      authorName: body.authorName === '' ? null : body.authorName ?? existing.authorName,
      category: body.category ?? existing.category,
      tags: JSON.stringify(Array.isArray(body.tags) ? body.tags : JSON.parse(existing.tags || '[]')),
    },
    select: POST_SELECT,
  });

  return NextResponse.json({ data: { ...post, justPublished: !wasPublished && post.status === 'PUBLISHED' } });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('super_admin');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });

  const { id } = await params;
  await blogPostDelegate().update({ where: { id }, data: { deletedAt: new Date(), status: 'DRAFT' } });
  return NextResponse.json({ data: { ok: true } });
}
