import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import BlogComments from '@/components/blog/BlogComments';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import MarketingNav from '@/components/marketing/MarketingNav';
import { blogPostDelegate } from '@/lib/blog-db';
import { buildBlogToc, parseBlogContent, renderBlogContent } from '@/lib/blog';

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
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: post.coverImageUrl ? [post.coverImageUrl] : undefined,
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.updatedAt.toISOString(),
    author: { '@type': 'Organization', name: post.authorName || 'Su Arıtma Servis Yazılımı' },
    publisher: { '@type': 'Organization', name: 'Su Arıtma Servis Yazılımı' },
    mainEntityOfPage: `${baseUrl}/blog/${post.slug}`,
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <MarketingNav />

      <main className="pt-32">
        <article className="mx-auto max-w-4xl px-6 pb-20">
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

          <div className="text-center">
            {post.category ? <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700">{post.category}</p> : null}
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">{post.title}</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-600">{post.excerpt}</p>
            <time className="mt-5 block text-sm font-semibold text-slate-500">
              {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString('tr-TR') : ''}
            </time>
          </div>

          <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            {post.coverImageUrl ? (
              <Image src={post.coverImageUrl} alt={post.coverImageAlt || post.title} fill priority className="object-cover" sizes="(min-width: 1024px) 896px, 100vw" />
            ) : (
              <div className="flex h-full items-center justify-center bg-cyan-50 text-lg font-bold text-cyan-700">
                Su Arıtma Servis Yazılımı
              </div>
            )}
          </div>

          {toc.length > 0 && (
            <nav className="mt-10 rounded-2xl border border-cyan-100 bg-cyan-50 p-5" aria-label="İçindekiler">
              <h2 className="text-base font-bold text-slate-950">İçindekiler</h2>
              <ol className="mt-3 space-y-2">
                {toc.map((item) => (
                  <li key={item.id} className={item.level === 3 ? 'pl-4' : ''}>
                    <a href={`#${item.id}`} className="text-sm font-semibold text-cyan-800 hover:text-cyan-950">
                      {item.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="mt-10 space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {renderBlogContent(content)}
          </div>

          <BlogComments slug={post.slug} />
        </article>
      </main>

      <MarketingFooter />
    </div>
  );
}
