'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Power } from 'lucide-react';

const LOCATION_SEND_INTERVAL_MS = 60_000;

export default function LocationSharer() {
  const [status, setStatus] = useState<'idle' | 'sharing' | 'error' | 'denied' | 'unavailable'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const watchIdRef = useRef<number | null>(null);

  const stopSharing = useCallback((notifyServer = true) => {
    const wasSharing = watchIdRef.current !== null;
    if (watchIdRef.current !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (notifyServer && wasSharing) {
      fetch('/api/technicians/locations', {
        method: 'DELETE',
        keepalive: true,
      }).catch(() => {});
    }

    setStatus('idle');
    setErrorMsg('');
  }, []);

  useEffect(() => {
    const handlePageHide = () => {
      if (watchIdRef.current === null) return;
      stopSharing(true);
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      stopSharing(true);
    };
  }, [stopSharing]);

  const startSharing = useCallback(() => {
    if (typeof window === 'undefined') return;

    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.startsWith('172.');
    if (!window.isSecureContext && !isLocal) {
      setStatus('unavailable');
      setErrorMsg('Konum paylaşımı için HTTPS bağlantı gerekiyor.');
      return;
    }
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      setErrorMsg('Tarayıcınız konum paylaşımını desteklemiyor.');
      return;
    }
    if (watchIdRef.current !== null) return;

    let lastSentAt = 0;

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (lastSentAt && now - lastSentAt < LOCATION_SEND_INTERVAL_MS) return;
        lastSentAt = now;

        try {
          const res = await fetch('/api/technicians/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            if (res.status === 404) {
              setStatus('error');
              setErrorMsg(err.error?.message ?? 'Teknisyen kaydı profilinize bağlı değil. Yöneticinize bildirin.');
            } else {
              setStatus('error');
              setErrorMsg(err.error?.message ?? 'Konum gönderilemedi: ' + res.status);
            }
            return;
          }
          setStatus('sharing');
        } catch {
          setStatus('error');
          setErrorMsg('Bağlantı hatası. İnternet bağlantınızı kontrol edin.');
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus('denied');
          setErrorMsg('Konum izni reddedildi. Tarayıcı ayarları → Konum → İzin ver.');
        } else {
          setStatus('error');
          setErrorMsg('Konum alınamadı: ' + err.message);
        }
      },
      { enableHighAccuracy: false, maximumAge: LOCATION_SEND_INTERVAL_MS, timeout: 15_000 },
    );
  }, []);

  if (status === 'sharing') {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-green-500 animate-pulse" />
          <span className="text-xs font-medium text-green-700">Konum paylaşılıyor</span>
        </div>
        <button
          type="button"
          onClick={() => stopSharing(true)}
          className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Power className="h-3 w-3" />
          Durdur
        </button>
      </div>
    );
  }

  if (status === 'denied' || status === 'error' || status === 'unavailable') {
    return (
      <div className="fixed bottom-4 left-4 z-50 max-w-xs rounded-lg border border-amber-200 bg-amber-50 p-3 shadow-lg">
        <p className="text-xs font-medium text-amber-800">
          {status === 'denied' && 'Konum izni reddedildi'}
          {status === 'error' && 'Konum hatası'}
          {status === 'unavailable' && 'Konum kullanılamıyor'}
        </p>
        <p className="mt-0.5 text-[10px] text-amber-600">{errorMsg}</p>
        <button onClick={() => stopSharing(true)} className="mt-2 text-[10px] text-amber-700 underline">
          Tekrar dene
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={startSharing}
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 shadow-lg hover:bg-muted transition-colors"
    >
      <MapPin className="h-4 w-4 text-muted-foreground" />
      <span className="text-xs font-medium text-foreground">Konum Paylaşımını Başlat</span>
    </button>
  );
}
