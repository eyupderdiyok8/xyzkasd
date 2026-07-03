// ──────────────────────────────────────────────
// In-memory rate limiter — public endpoint koruması
// Serverless ortamda instance'lar arası paylaşılmaz,
// ancak aynı warm instance içinde etkilidir.
// Production için Redis/Upstash önerilir.
// ──────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

/** Periyodik temizlik — 60 saniyede bir süresi dolmuş entry'leri sil */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000).unref();

export interface RateLimitConfig {
  /** Maksimum istek sayısı (varsayılan: 10) */
  maxRequests?: number;
  /** Pencere süresi, milisaniye (varsayılan: 60_000 = 1 dakika) */
  windowMs?: number;
  /** Rate-limit anahtarı için prefix (örn: "survey-respond") */
  keyPrefix: string;
}

/**
 * Rate-limit kontrolü yapar.
 * Limit aşıldıysa `{ allowed: false, retryAfter }` döner,
 * aksi halde `{ allowed: true }`.
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): { allowed: boolean; retryAfter?: number } {
  const maxRequests = config.maxRequests ?? 10;
  const windowMs = config.windowMs ?? 60_000;
  const key = `${config.keyPrefix}:${identifier}`;

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Yeni pencere
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}
