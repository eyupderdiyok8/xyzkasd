'use client';

// ─── useOnlineStatus ──────────────────────────────────────
// React hook that tracks network connectivity and pending sync queue size.
// Auto-triggers sync when coming back online (with debounce).

import { useState, useEffect, useRef, useCallback } from 'react';
import { getQueueStats, getTotalPending, syncAll } from '@/lib/offline/sync-queue';

export interface OnlineStatus {
  isOnline: boolean;
  pendingCount: number;
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnlineState, setIsOnlineState] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [pendingCount, setPendingCount] = useState(0);
  const lastSyncRef = useRef(0);
  const syncingRef = useRef(false);

  // Poll queue stats every 3 seconds
  const pollStats = useCallback(async () => {
    try {
      const stats = await getQueueStats();
      setPendingCount(getTotalPending(stats));
    } catch {
      // IndexedDB not available — no-op
    }
  }, []);

  useEffect(() => {
    // Initial poll
    pollStats();

    const interval = setInterval(pollStats, 3000);
    return () => clearInterval(interval);
  }, [pollStats]);

  // Listen to online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnlineState(true);
      // Debounce sync: at most once per 5 seconds
      const now = Date.now();
      if (now - lastSyncRef.current < 5000 || syncingRef.current) return;
      lastSyncRef.current = now;

      syncingRef.current = true;
      syncAll()
        .then((stats) => {
          setPendingCount(getTotalPending(stats));
        })
        .catch(() => {
          // Ignore sync errors — will retry on next poll
        })
        .finally(() => {
          syncingRef.current = false;
        });
    };

    const handleOffline = () => {
      setIsOnlineState(false);
    };

    // Also listen to sync-complete from sync-queue
    const handleSyncComplete = (e: Event) => {
      const customEvent = e as CustomEvent<{ stats: { pendingForms: number; pendingPhotos: number; pendingPayments: number } }>;
      if (customEvent.detail?.stats) {
        setPendingCount(getTotalPending(customEvent.detail.stats));
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('sync-complete', handleSyncComplete);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('sync-complete', handleSyncComplete);
    };
  }, []);

  return { isOnline: isOnlineState, pendingCount };
}
