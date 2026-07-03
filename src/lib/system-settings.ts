// ──────────────────────────────────────────────
// System Settings — key-value yapılandırma
// Super admin tarafından yönetilebilen global ayarlar.
// Basit in-memory cache, 60 saniye TTL.
// ──────────────────────────────────────────────

import { prisma } from '@/lib/prisma';

const cache = new Map<string, { value: string; ts: number }>();
const CACHE_TTL_MS = 60_000; // 1 dakika

/** Bir ayarın değerini oku. Cache varsa cache'den döner. */
export async function getSetting(key: string): Promise<string | null> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const row = await prisma.systemSetting.findUnique({ where: { key } });
    const value = row?.value ?? null;
    if (value !== null) {
      cache.set(key, { value, ts: Date.now() });
    }
    return value;
  } catch (err) {
    // Tablo yoksa veya DB hatası varsa null dön
    console.warn('[system-settings] getSetting failed for key=%s: %s', key, err instanceof Error ? err.message : String(err));
    return null;
  }
}

/** Bir ayarın değerini güncelle. */
export async function setSetting(key: string, value: string, updatedBy?: string): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key },
    create: { key, value, updatedBy },
    update: { value, updatedBy },
  });
  cache.delete(key);
}

/** Cache'i temizle (testler için). */
export function clearSettingsCache(): void {
  cache.clear();
}
