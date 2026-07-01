'use client';

import { useState, useRef, useCallback, type ReactNode } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number; // px to pull before triggering
}

/**
 * Pull-to-refresh wrapper for mobile lists.
 * iOS/Android native-feel pull gesture.
 */
export default function PullToRefresh({ onRefresh, children, threshold = 80 }: PullToRefreshProps) {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only trigger when scrolled to top
    const el = containerRef.current;
    if (!el || el.scrollTop > 5) return;
    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 5) { setPulling(false); setPullDistance(0); return; }

    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      // Resistance: ease the pull
      setPullDistance(Math.min(diff * 0.4, threshold * 1.5));
    }
  }, [pulling, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);

    if (pullDistance >= threshold) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
    setPullDistance(0);
  }, [pulling, pullDistance, threshold, onRefresh]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-y-auto h-full"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center transition-all duration-200 z-10 pointer-events-none"
        style={{
          top: -50 + pullDistance * 0.6,
          opacity: Math.min(pullDistance / threshold, 1),
        }}
      >
        <div className={`
          flex items-center gap-2 rounded-full bg-white px-4 py-1.5 shadow-md border border-border text-xs text-slate-500
          ${refreshing ? 'animate-pulse' : ''}
        `}>
          <svg
            className={`h-4 w-4 transition-transform ${refreshing ? 'animate-spin' : ''}`}
            style={{ transform: refreshing ? undefined : `rotate(${pullDistance * 1.5}deg)` }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M1 4v6h6M23 20v-6h-6" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>{refreshing ? 'Yenileniyor...' : pullDistance >= threshold ? 'Bırakın' : 'Çekerek yenileyin'}</span>
        </div>
      </div>

      {/* Content */}
      <div style={{ transform: `translateY(${pullDistance * 0.3}px)`, transition: pulling ? 'none' : 'transform 0.25s ease-out' }}>
        {children}
      </div>
    </div>
  );
}
