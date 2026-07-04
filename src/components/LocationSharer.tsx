'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { MapPin, X } from 'lucide-react';

export default function LocationSharer() {
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<string>('');
  const [status, setStatus] = useState<'idle' | 'sharing' | 'error' | 'denied' | 'unavailable'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const sendLocation = useCallback(async (lat: number, lng: number) => {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (key === lastSentRef.current) return;
    lastSentRef.current = key;

    try {
      const res = await fetch('/api/technicians/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });
      if (!res.ok && res.status === 404) {
        setStatus('error');
        setErrorMsg('Teknisyen kaydı bulunamadı. Profiliniz bir teknisyene bağlı değil.');
        return;
      }
      if (res.ok) setStatus('sharing');
    } catch {
      // ağ hatası — sessiz, tekrar dene
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // HTTPS veya localhost/local-network değilse geolocation çalışmaz
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.');
    const isSecure = window.isSecureContext || isLocal;
    if (!isSecure) {
      setStatus('unavailable');
      setErrorMsg('Konum paylaşımı için HTTPS bağlantı gerekiyor.');
      return;
    }

    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      setErrorMsg('Tarayıcınız konum paylaşımını desteklemiyor.');
      return;
    }

    // Önce izin durumunu kontrol et
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        if (result.state === 'denied') {
          setStatus('denied');
          setErrorMsg('Konum izni reddedildi. Tarayıcı ayarlarından konum iznini etkinleştirin.');
          return;
        }
      });
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => sendLocation(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setErrorMsg('Konum izni reddedildi.');
        } else {
          setStatus('error');
          setErrorMsg('Konum alınamadı: ' + err.message);
        }
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 },
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [sendLocation]);

  if (status === 'idle') return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-xs rounded-lg border border-border bg-card p-3 shadow-lg">
      <div className="flex items-start gap-2">
        <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${
          status === 'sharing' ? 'text-green-500 animate-pulse' : 'text-muted-foreground'
        }`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-foreground">
            {status === 'sharing' && 'Konum paylaşılıyor'}
            {status === 'error' && 'Konum hatası'}
            {status === 'denied' && 'Konum izni reddedildi'}
            {status === 'unavailable' && 'Konum kullanılamıyor'}
          </p>
          {errorMsg && <p className="mt-0.5 text-[10px] text-muted-foreground">{errorMsg}</p>}
        </div>
        <button onClick={() => setStatus('idle')} className="shrink-0 text-muted-foreground hover:text-foreground">
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
