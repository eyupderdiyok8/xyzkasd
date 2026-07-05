'use client';

type CacheEntry = {
  expiresAt: number;
  promise: Promise<unknown>;
};

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL_MS = 5000;

export async function cachedJson<T>(url: string, init?: RequestInit, ttlMs = DEFAULT_TTL_MS): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  if (method !== 'GET') {
    const res = await fetch(url, init);
    return res.json() as Promise<T>;
  }

  const key = `${method}:${url}`;
  const now = Date.now();
  const existing = cache.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.promise as Promise<T>;
  }

  const promise = fetch(url, init).then((res) => res.json());
  cache.set(key, { expiresAt: now + ttlMs, promise });
  return promise as Promise<T>;
}

export function invalidateCachedJson(url?: string) {
  if (!url) {
    cache.clear();
    return;
  }
  cache.delete(`GET:${url}`);
}
