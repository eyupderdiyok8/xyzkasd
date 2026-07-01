'use client';

// ──────────────────────────────────────────────
// OfflineBanner — Çevrimdışı durum göstergesi
//
// - Çevrimdışı: "📡 Çevrimdışı · X işlem bekliyor" + "Senkronize Et"
// - Çevrimiçi + bekleyen var: "📶 Çevrimiçi · X bekleyen — senkronize ediliyor..."
// - Çevrimiçi + bekleyen yok: gizli
// - Tüm metinler Türkçe
// ──────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { syncAll } from '@/lib/offline/sync-queue';

export default function OfflineBanner() {
  const { isOnline, pendingCount } = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      await syncAll();
    } catch {
      // syncAll hata yönetimini kendi içinde yapar
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  // Çevrimiçi ve bekleyen yok → gizli
  if (isOnline && pendingCount === 0) {
    return null;
  }

  // Çevrimdışı
  if (!isOnline) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[60] bg-amber-500 text-white px-4 py-3 shadow-lg">
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-3">
          <span className="text-sm font-medium">
            📡 Çevrimdışı · {pendingCount} işlem bekliyor
          </span>
          {pendingCount > 0 && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="shrink-0 rounded-lg bg-white/20 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/30 disabled:opacity-50 transition-colors"
            >
              {syncing ? 'Senkronize ediliyor...' : 'Senkronize Et'}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Çevrimiçi ama bekleyen işlem var
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] bg-blue-600 text-white px-4 py-3 shadow-lg">
      <div className="mx-auto max-w-4xl flex items-center justify-between gap-3">
        <span className="text-sm font-medium">
          📶 Çevrimiçi · {pendingCount} bekleyen — senkronize ediliyor...
        </span>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="shrink-0 rounded-lg bg-white/20 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/30 disabled:opacity-50 transition-colors"
        >
          {syncing ? 'Senkronize ediliyor...' : 'Şimdi Senkronize Et'}
        </button>
      </div>
    </div>
  );
}
