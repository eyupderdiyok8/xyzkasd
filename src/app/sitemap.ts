import type { MetadataRoute } from 'next';
import { blogPostDelegate } from '@/lib/blog-db';

const baseUrl = 'https://suaritmaservisyazilimi.com.tr';

const routes = [
  '',
  '/neden',
  '/nasil-calisir',
  '/fiyat',
  '/ogren',
  '/blog',
  '/su-aritma-servis-yazilimi',
  '/su-aritma-servis-programi',
  '/filtre-takip-programi',
  '/teknik-servis-yazilimi',
  '/servis-takip-programi',
  '/musteri-takip-yazilimi',
  '/gizlilik-politikasi',
  '/kvkk',
  '/cerez-politikasi',
  '/kullanim-sartlari',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '' ? 'weekly' as const : 'monthly' as const,
    priority: route === '' ? 1 : route === '/fiyat' ? 0.9 : 0.8,
  }));

  let posts: Array<{ slug: string; updatedAt: Date }> = [];
  try {
    posts = await blogPostDelegate().findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    });
  } catch {
    posts = [];
  }

  return [
    ...staticRoutes,
    ...posts.map((post) => ({
      url: `${baseUrl}/blog/${post.slug}`,
      lastModified: post.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),
  ];
}
