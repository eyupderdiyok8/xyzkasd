'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * Konum paylaşım bileşeni.
 * Dashboard layout'a eklenir, teknisyen giriş yaptığında otomatik başlar.
 * 30 saniyede bir konumu POST /api/technicians/locations'a gönderir.
 */
export default function LocationSharer() {
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<string>('');

  const sendLocation = useCallback(async (lat: number, lng: number) => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (key === lastSentRef.current) return;
    lastSentRef.current = key;

    try {
      await fetch('/api/technicians/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
    } catch {
      // sessiz
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
      () => {},
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 10_000 },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [sendLocation]);

  return null;
}
