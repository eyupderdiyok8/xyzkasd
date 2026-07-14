import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BookOpen, Filter, MessageCircle, TrendingUp, Wrench } from 'lucide-react';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingNav from '@/components/marketing/MarketingNav';
import { blogPostDelegate } from '@/lib/blog-db';

export const metadata: Metadata = {
  title: 'Blog | Su Arıtma Servis Yazılımı',
  description: 'Su arıtma servis firmaları için müşteri takibi, filtre takibi, saha servis yönetimi ve satış sonrası operasyon rehberleri.',
  alternates: { canonical: 'https://suaritmaservisyazilimi.com.tr/blog' },
};

export const revalidate = 300;

type PublicPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  publishedAt: Date | null;
  category: string | null;
};

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(value) : '';
}

function PostCover({ post, priority = false }: { post: PublicPost; priority?: boolean }) {
  return post.coverImageUrl ? (
    <Image
      src={post.coverImageUrl}
      alt={post.coverImageAlt || post.title}
      fill
      priority={priority}
      className="object-contain"
      sizes="(min-width: 1024px) 50vw, 100vw"
    />
  ) : (
    <div className="flex h-full items-center justify-center bg-cyan-50 px-6 text-center text-sm font-bold text-cyan-700">
      Su Arıtma Servis Yazılımı
    </div>
  );
}

export default async function BlogPage() {
  let posts: PublicPost[] = [];
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

  const featuredPost = posts[0];
  const remainingPosts = posts.slice(1);
  const categories = Array.from(new Set(posts.map((post) => post.category).filter(Boolean))) as string[];

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MarketingNav />

      <main>
        <section className="border-b border-slate-200 bg-[#f5fbfd] pt-28 sm:pt-36">
          <div className="mx-auto max-w-5xl px-5 pb-14 text-center sm:px-6 sm:pb-20">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-xs font-bold text-cyan-800 shadow-sm">
              <BookOpen className="h-4 w-4" /> Saha tecrübesinden uygulanabilir rehberler
            </div>
            <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold leading-[1.1] sm:text-5xl lg:text-6xl">
              Servis işini daha düzenli ve daha kârlı yürütmenin yolları.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Filtre takibi, müşteri iletişimi, saha yönetimi ve servis sonrası satış için doğrudan uygulanabilecek içerikler.
            </p>
            {categories.length > 0 ? (
              <div className="mt-8 flex flex-wrap justify-center gap-2">
                {categories.slice(0, 6).map((category) => (
                  <span key={category} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">{category}</span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="border-t border-slate-200 bg-white">
            <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-slate-200 sm:grid-cols-4">
              {[
                [Wrench, 'Servis operasyonu'],
                [Filter, 'Filtre ve bakım'],
                [MessageCircle, 'Müşteri iletişimi'],
                [TrendingUp, 'Büyüme ve kazanç'],
              ].map(([Icon, label]) => {
                const TopicIcon = Icon as typeof Wrench;
                return (
                  <div key={label as string} className="flex min-h-16 items-center justify-center gap-2 px-3 text-center text-xs font-bold text-slate-700 sm:text-sm">
                    <TopicIcon className="h-4 w-4 text-cyan-700" /> {label as string}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {featuredPost ? (
          <>
            <section className="py-16 sm:py-24">
              <div className="mx-auto max-w-7xl px-5 sm:px-6">
                <p className="mb-5 text-xs font-bold uppercase text-cyan-700">Yeni yayınlanan</p>
                <Link href={`/blog/${featuredPost.slug}`} className="group grid overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg hover:border-cyan-300 lg:grid-cols-[1.1fr_0.9fr]">
                  <div className="relative aspect-[16/9] bg-white">
                    <PostCover post={featuredPost} priority />
                  </div>
                  <div className="flex flex-col justify-center p-6 sm:p-10">
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                      {featuredPost.category ? <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-cyan-700">{featuredPost.category}</span> : null}
                      <time>{formatDate(featuredPost.publishedAt)}</time>
                    </div>
                    <h2 className="mt-5 text-2xl font-bold leading-tight group-hover:text-cyan-800 sm:text-4xl">{featuredPost.title}</h2>
                    <p className="mt-4 line-clamp-4 leading-7 text-slate-600">{featuredPost.excerpt}</p>
                    <span className="mt-7 inline-flex items-center gap-2 text-sm font-bold text-slate-950">Yazıyı oku <ArrowRight className="h-4 w-4" /></span>
                  </div>
                </Link>
              </div>
            </section>

            {remainingPosts.length > 0 ? (
              <section className="border-y border-slate-200 bg-slate-50 py-16 sm:py-24">
                <div className="mx-auto max-w-7xl px-5 sm:px-6">
                  <div className="max-w-2xl">
                    <p className="text-xs font-bold uppercase text-cyan-700">Tüm içerikler</p>
                    <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Okumaya devam edin.</h2>
                  </div>
                  <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {remainingPosts.map((post) => (
                      <Link key={post.id} href={`/blog/${post.slug}`} className="group flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm hover:border-cyan-300 hover:shadow-lg">
                        <div className="relative aspect-[16/9] bg-white"><PostCover post={post} /></div>
                        <div className="flex flex-1 flex-col p-5">
                          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                            {post.category ? <span className="text-cyan-700">{post.category}</span> : null}
                            <time>{formatDate(post.publishedAt)}</time>
                          </div>
                          <h3 className="mt-3 line-clamp-2 text-xl font-bold group-hover:text-cyan-800">{post.title}</h3>
                          <p className="mt-3 line-clamp-3 flex-1 text-sm leading-6 text-slate-600">{post.excerpt}</p>
                          <span className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-slate-950">Devamını oku <ArrowRight className="h-3.5 w-3.5" /></span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <section className="py-20 sm:py-28">
            <div className="mx-auto max-w-3xl px-5 text-center sm:px-6">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-cyan-50 text-cyan-700"><BookOpen className="h-6 w-6" /></span>
              <h2 className="mt-6 text-2xl font-bold">İlk rehber hazırlanıyor.</h2>
              <p className="mt-3 leading-7 text-slate-600">Bu sırada servis yönetiminin temel adımlarını öğrenme merkezinde inceleyebilirsiniz.</p>
              <Link href="/ogren" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-slate-950 px-6 text-sm font-bold text-white hover:bg-cyan-700">Öğrenme merkezine git <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </section>
        )}

        <section className="bg-slate-950 py-16 text-white sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase text-cyan-300">Okumaktan uygulamaya</p>
              <h2 className="mt-4 text-3xl font-bold sm:text-4xl">Servis düzenini kendi firmanızda deneyin.</h2>
              <p className="mt-4 leading-7 text-slate-300">Ücretsiz hesabınızı açın ve ilk müşteri, cihaz ve servis kaydınızı oluşturun.</p>
            </div>
            <Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-white px-7 text-sm font-bold text-slate-950 hover:bg-cyan-50">Ücretsiz başla <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>
      </main>

      <MarketingFooter showLogo />
    </div>
  );
}
