'use client';

import { useEffect } from 'react';
import { registerSW } from '@/lib/offline/sw-register';

/**
 * Client-side PWA bootstrap.
 * Wraps children and triggers service worker registration on mount.
 */
export default function PwaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    registerSW();
  }, []);

  return <>{children}</>;
}
