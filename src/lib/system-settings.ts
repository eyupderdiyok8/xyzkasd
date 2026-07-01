// ──────────────────────────────────────────────
// System Settings — key-value yapılandırma
// Super admin tarafından yönetilebilen global ayarlar.
// Basit in-memory cache, 60 saniye TTL.
// ──────────────────────────────────────────────

import { prismaClient } from '@/repositories/base.repository';

const cache = new Map<string, { value: string; ts: number }>();
const CACHE_TTL_MS = 60_000; // 1 dakika

/** Bir ayarın değerini oku. Cache varsa cache'den döner. */
export async function getSetting(key: string): Promise<string | null> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.value;
  }

  try {
    const row = await (prismaClient as any).systemSetting.findUnique({ where: { key } });
    const value = row?.value ?? null;
    if (value !== null) {
      cache.set(key, { value, ts: Date.now() });
    }
    return value;
  } catch {
    // Tablo yoksa veya DB hatası varsa null dön
    return null;
  }
}

/** Bir ayarın değerini güncelle. */
export async function setSetting(key: string, value: string, updatedBy?: string): Promise<void> {
  await (prismaClient as any).systemSetting.upsert({
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
