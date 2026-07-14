import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, List, UserRound } from 'lucide-react';
import BlogComments from '@/components/blog/BlogComments';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingNav from '@/components/marketing/MarketingNav';
import { blogPostDelegate } from '@/lib/blog-db';
import { buildBlogToc, getNodeText, parseBlogContent, renderBlogContent } from '@/lib/blog';

const baseUrl = 'https://suaritmaservisyazilimi.com.tr';

type PageProps = { params: Promise<{ slug: string }> };

export const revalidate = 300;

async function getPost(slug: string) {
  try {
    return await blogPostDelegate().findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        coverImageUrl: true,
        coverImageAlt: true,
        contentJson: true,
        tocJson: true,
        seoTitle: true,
        seoDescription: true,
        publishedAt: true,
        updatedAt: true,
        authorName: true,
        category: true,
      },
    });
  } catch {
    return null;
  }
}

function formatDate(value: Date | null) {
  return value ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }).format(value) : '';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return {};

  const title = post.seoTitle || post.title;
  const description = post.seoDescription || post.excerpt;
  const url = `${baseUrl}/blog/${post.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      type: 'article',
      url,
      images: post.coverImageUrl ? [{ url: post.coverImageUrl, alt: post.coverImageAlt || post.title }] : undefined,
      publishedTime: post.publishedAt?.toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
  };
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const content = parseBlogContent(post.contentJson);
  const toc = buildBlogToc(content);
  const words = content.map((node) => getNodeText(node)).join(' ').trim().split(/\s+/).filter(Boolean).length;
  const readingMinutes = Math.max(1, Math.ceil(words / 200));
  const publishedDate = formatDate(post.publishedAt);
  const authorName = post.authorName || 'Su Arıtma Servis Yazılımı';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { '@type': 'Organization', name: authorName },
    publisher: { '@type': 'Organization', name: 'Su Arıtma Servis Yazılımı' },
    mainEntityOfPage: `${baseUrl}/blog/${post.slug}`,
  };

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <MarketingNav />

      <main>
        <article>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

          <header className="border-b border-slate-200 bg-[#f5fbfd] pt-28 sm:pt-36">
            <div className="mx-auto max-w-5xl px-5 pb-12 text-center sm:px-6 sm:pb-16">
              <Link href="/blog" className="inline-flex items-center gap-2 text-xs font-bold text-cyan-700 hover:text-cyan-900">
                <ArrowLeft className="h-4 w-4" /> Tüm yazılar
              </Link>
              {post.category ? <p className="mt-6 text-xs font-bold uppercase text-cyan-700">{post.category}</p> : null}
              <h1 className="mx-auto mt-4 max-w-4xl text-4xl font-extrabold leading-[1.12] sm:text-5xl lg:text-6xl">{post.title}</h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">{post.excerpt}</p>
              <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-3 text-xs font-semibold text-slate-500 sm:text-sm">
                <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-cyan-700" /> {authorName}</span>
                {publishedDate ? <time className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-cyan-700" /> {publishedDate}</time> : null}
                <span className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4 text-cyan-700" /> {readingMinutes} dk okuma</span>
              </div>
            </div>

            <div className="mx-auto max-w-6xl px-5 sm:px-6">
              <div className="relative aspect-[16/9] translate-y-10 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
                {post.coverImageUrl ? (
                  <Image src={post.coverImageUrl} alt={post.coverImageAlt || post.title} fill priority className="object-contain" sizes="(min-width: 1280px) 1152px, 100vw" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-cyan-50 px-6 text-center text-lg font-bold text-cyan-700">Su Arıtma Servis Yazılımı</div>
                )}
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-6xl px-5 pt-28 pb-20 sm:px-6 sm:pt-32">
            <div className={toc.length > 0 ? 'grid gap-12 lg:grid-cols-[220px_minmax(0,760px)] lg:justify-center lg:gap-16' : 'mx-auto max-w-[760px]'}>
              {toc.length > 0 ? (
                <aside className="hidden lg:block">
                  <nav className="sticky top-28 border-l-2 border-cyan-200 pl-5" aria-label="İçindekiler">
                    <h2 className="flex items-center gap-2 text-sm font-bold text-slate-950"><List className="h-4 w-4 text-cyan-700" /> İçindekiler</h2>
                    <ol className="mt-4 space-y-3">
                      {toc.map((item) => (
                        <li key={item.id} className={item.level === 3 ? 'pl-3' : ''}>
                          <a href={`#${item.id}`} className="text-xs font-semibold leading-5 text-slate-500 hover:text-cyan-800">{item.text}</a>
                        </li>
                      ))}
                    </ol>
                  </nav>
                </aside>
              ) : null}

              <div className="min-w-0">
                {toc.length > 0 ? (
                  <details className="mb-10 rounded-lg border border-cyan-200 bg-cyan-50 p-5 lg:hidden">
                    <summary className="flex cursor-pointer list-none items-center gap-2 font-bold"><List className="h-4 w-4 text-cyan-700" /> İçindekiler</summary>
                    <ol className="mt-4 space-y-2">
                      {toc.map((item) => (
                        <li key={item.id} className={item.level === 3 ? 'pl-4' : ''}><a href={`#${item.id}`} className="text-sm font-semibold text-cyan-800">{item.text}</a></li>
                      ))}
                    </ol>
                  </details>
                ) : null}

                <div className="space-y-7 text-[17px] leading-8">{renderBlogContent(content)}</div>

                <aside className="mt-14 border-y border-slate-200 bg-slate-50 px-5 py-8 sm:px-8">
                  <p className="text-xs font-bold uppercase text-cyan-700">Bilgiyi işinize taşıyın</p>
                  <h2 className="mt-3 text-2xl font-bold">Servis düzenini kendi firmanızda deneyin.</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">Ücretsiz hesabınızı açın; ilk müşteri, cihaz ve servis kaydınızı gerçek akışınızla oluşturun.</p>
                  <Link href="/register" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-5 text-sm font-bold text-white hover:bg-cyan-700">Ücretsiz başla <ArrowRight className="h-4 w-4" /></Link>
                </aside>

                <BlogComments slug={post.slug} />
              </div>
            </div>
          </div>
        </article>
      </main>

      <MarketingFooter showLogo />
    </div>
  );
}
