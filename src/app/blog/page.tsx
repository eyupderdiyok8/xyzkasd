import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingNav from '@/components/marketing/MarketingNav';
import { blogPostDelegate } from '@/lib/blog-db';

export const metadata: Metadata = {
  title: 'Blog | Su Arıtma Servis Yazılımı',
  description: 'Su arıtma servis firmaları için müşteri takibi, filtre takibi, saha servis yönetimi ve satış sonrası operasyon rehberleri.',
  alternates: { canonical: 'https://suaritmaservisyazilimi.com.tr/blog' },
};

export const revalidate = 300;

export default async function BlogPage() {
  let posts: any[] = [];
  try {
    posts = await blogPostDelegate().findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImageUrl: true,
        coverImageAlt: true,
        publishedAt: true,
        category: true,
      },
    });
  } catch {
    posts = [];
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <MarketingNav />

      <main className="pt-32">
        <section className="mx-auto max-w-7xl px-6 pb-14">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-700">Blog</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl">
            Su arıtma servis firmaları için büyüme ve operasyon rehberleri
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Filtre takibi, servis planlama, müşteri iletişimi ve saha ekibi yönetimi için uygulanabilir içerikler.
          </p>
        </section>

        <section className="mx-auto max-w-7xl px-6 pb-24">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">
              Henüz yayınlanmış blog yazısı yok.
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <Link key={post.id} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-cyan-300">
                  <div className="relative aspect-[16/9] bg-slate-100">
                    {post.coverImageUrl ? (
                      <Image src={post.coverImageUrl} alt={post.coverImageAlt || post.title} fill className="object-cover transition-transform group-hover:scale-[1.03]" sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-cyan-50 text-sm font-semibold text-cyan-700">
                        Su Arıtma Servis Yazılımı
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                      {post.category ? <span className="rounded-full bg-cyan-50 px-2 py-1 text-cyan-700">{post.category}</span> : null}
                      <time>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('tr-TR') : ''}</time>
                    </div>
                    <h2 className="mt-3 line-clamp-2 text-xl font-bold text-slate-950">{post.title}</h2>
                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
