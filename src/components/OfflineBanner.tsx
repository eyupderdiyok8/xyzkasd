'use client';

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
      // syncAll handles errors internally
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  // Online + nothing pending → completely hidden
  if (isOnline && pendingCount === 0) return null;

  const isCompact = pendingCount === 0;

  return (
    <div
      className={`
        fixed left-0 right-0 z-40 shadow-lg transition-all
        /* Mobile: above bottom nav (h-14 = 56px) */
        /* Desktop: bottom edge */
        bottom-14 md:bottom-0
        ${isCompact ? 'h-7' : 'py-2'}
        ${!isOnline ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}
      `}
    >
      {isCompact ? (
        /* Compact: thin indicator strip, no text */
        <div className="h-full flex items-center justify-center">
          <span className="text-[10px] font-medium opacity-90">
            {!isOnline ? '📡 Çevrimdışı' : '📶 Senkronize ediliyor...'}
          </span>
        </div>
      ) : (
        /* Full: pending operations exist */
        <div className="mx-auto max-w-4xl flex items-center justify-between gap-3 px-4">
          <span className="text-sm font-medium">
            {!isOnline
              ? `📡 Çevrimdışı · ${pendingCount} işlem bekliyor`
              : `📶 Çevrimiçi · ${pendingCount} işlem senkronize ediliyor...`}
          </span>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="shrink-0 rounded-lg bg-white/20 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/30 disabled:opacity-50 transition-colors"
          >
            {syncing ? 'Senkronize ediliyor...' : 'Şimdi Senkronize Et'}
          </button>
        </div>
      )}
    </div>
  );
}
