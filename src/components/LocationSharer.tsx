'use client';

import { useState, useCallback } from 'react';
import { MapPin } from 'lucide-react';

export default function LocationSharer() {
  const [status, setStatus] = useState<'idle' | 'sharing' | 'error' | 'denied' | 'unavailable'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

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

    let lastSent = '';

    navigator.geolocation.watchPosition(
      async (pos) => {
        const key = `${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`;
        if (key === lastSent) return;
        lastSent = key;

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
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 15_000 },
    );
  }, []);

  if (status === 'sharing') {
    return (
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 shadow-lg">
        <MapPin className="h-4 w-4 text-green-500 animate-pulse" />
        <span className="text-xs font-medium text-green-700">Konum paylaşılıyor</span>
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
        <button onClick={() => setStatus('idle')} className="mt-2 text-[10px] text-amber-700 underline">
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
