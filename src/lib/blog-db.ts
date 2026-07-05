import { prisma } from '@/lib/prisma';

export function blogPostDelegate() {
  const delegate = (prisma as any).blogPost;
  if (!delegate) {
    throw new Error('Blog Prisma modeli aktif değil. Prisma generate sonrası Next dev server yeniden başlatılmalı.');
  }
  return delegate;
}

export function blogCommentDelegate() {
  const delegate = (prisma as any).blogComment;
  if (!delegate) {
    throw new Error('Blog yorum Prisma modeli aktif değil. Prisma generate sonrası Next dev server yeniden başlatılmalı.');
  }
  return delegate;
}
