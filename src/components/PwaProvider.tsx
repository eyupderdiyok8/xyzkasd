'use client';

import { useEffect } from 'react';
import { registerSW, unregisterSW } from '@/lib/offline/sw-register';

/**
 * Client-side PWA bootstrap.
 * Production'da service worker'ı kaydeder, dev'de devre dışı bırakır
 * (cache'lenmiş font/API yanıtları yüzünden sonsuz refresh yapar).
 */
export default function PwaProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      registerSW();
    } else {
      // Dev modda mevcut service worker'ı kaldır
      unregisterSW();
    }
  }, []);

  return <>{children}</>;
}
