import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { blogCommentDelegate, blogPostDelegate } from '@/lib/blog-db';

function hashIp(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function getIp(req: NextRequest) {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || 'unknown';
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const post = await blogPostDelegate().findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      select: { id: true },
    });

    if (!post) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Yazı bulunamadı' } }, { status: 404 });

    const comments = await blogCommentDelegate().findMany({
      where: { postId: post.id, status: 'APPROVED' },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, body: true, createdAt: true },
    });

    return NextResponse.json({ data: comments });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'BLOG_COMMENTS_ERROR', message: err.message || 'Yorumlar okunamadı' } }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const post = await blogPostDelegate().findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      select: { id: true },
    });

    if (!post) return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Yazı bulunamadı' } }, { status: 404 });

    const body = await req.json().catch(() => null);
    if (!body || body.website) {
      return NextResponse.json({ data: { ok: true, status: 'PENDING' } }, { status: 201 });
    }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const comment = String(body.body || '').trim();

    if (name.length < 2 || name.length > 80 || !email.includes('@') || comment.length < 5 || comment.length > 1200) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Ad, e-posta ve yorum alanlarını kontrol edin' } }, { status: 400 });
    }

    const ipHash = hashIp(getIp(req));
    const recent = await blogCommentDelegate().count({
      where: {
        ipHash,
        createdAt: { gt: new Date(Date.now() - 10 * 60 * 1000) },
      },
    });

    if (recent >= 3) {
      return NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Kısa sürede çok fazla yorum gönderdiniz' } }, { status: 429 });
    }

    await blogCommentDelegate().create({
      data: {
        postId: post.id,
        name,
        email,
        body: comment,
        status: 'PENDING',
        ipHash,
        userAgent: req.headers.get('user-agent')?.slice(0, 300) || null,
      },
    });

    return NextResponse.json({ data: { ok: true, status: 'PENDING' } }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'BLOG_COMMENT_SAVE_ERROR', message: err.message || 'Yorum kaydedilemedi' } }, { status: 500 });
  }
}
