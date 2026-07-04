import type { MetadataRoute } from 'next';

const baseUrl = 'https://suaritmaservisyazilimi.com.tr';

const routes = [
  '',
  '/neden',
  '/nasil-calisir',
  '/fiyat',
  '/ogren',
  '/su-aritma-servis-yazilimi',
  '/su-aritma-servis-programi',
  '/filtre-takip-programi',
  '/teknik-servis-yazilimi',
  '/servis-takip-programi',
  '/musteri-takip-yazilimi',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === '' ? 'weekly' : 'monthly',
    priority: route === '' ? 1 : route === '/fiyat' ? 0.9 : 0.8,
  }));
}
