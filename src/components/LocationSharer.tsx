'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Power } from 'lucide-react';

const LOCATION_SEND_INTERVAL_MS = 60_000;

export default function LocationSharer() {
  const [status, setStatus] = useState<'idle' | 'sharing' | 'error' | 'denied' | 'unavailable'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [panelOpen, setPanelOpen] = useState(false);
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
    setPanelOpen(false);
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
          setPanelOpen(false);
        } catch {
          setStatus('error');
          setErrorMsg('Bağlantı hatası. İnternet bağlantınızı kontrol edin.');
          setPanelOpen(true);
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
        setPanelOpen(true);
      },
      { enableHighAccuracy: false, maximumAge: LOCATION_SEND_INTERVAL_MS, timeout: 15_000 },
    );
  }, []);

  const isProblem = status === 'denied' || status === 'error' || status === 'unavailable';
  const isSharing = status === 'sharing';

  const handleButtonClick = () => {
    if (isSharing || isProblem) {
      setPanelOpen((open) => !open);
      return;
    }
    startSharing();
  };

  return (
    <div className="fixed bottom-20 right-4 z-[55] md:bottom-4 md:left-4 md:right-auto">
      {panelOpen && (
        <div className="mb-3 w-[min(82vw,280px)] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
          <p className="text-sm font-bold text-slate-950">
            {isSharing && 'Konum paylaşılıyor'}
            {status === 'denied' && 'Konum izni reddedildi'}
            {status === 'error' && 'Konum hatası'}
            {status === 'unavailable' && 'Konum kullanılamıyor'}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {isSharing
              ? 'Firma sahibi son konumunuzu haritada görebilir. İş bitince paylaşımı durdurabilirsiniz.'
              : errorMsg}
          </p>
          <div className="mt-3 flex gap-2">
            {isSharing ? (
              <button
                type="button"
                onClick={() => stopSharing(true)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"
              >
                <Power className="h-3.5 w-3.5" />
                Durdur
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  stopSharing(false);
                  startSharing();
                }}
                className="flex-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600"
              >
                Tekrar dene
              </button>
            )}
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleButtonClick}
        aria-label={isSharing ? 'Konum paylaşımı açık' : isProblem ? 'Konum paylaşımı hatası' : 'Konum paylaşımını başlat'}
        className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all active:scale-95 ${
          isSharing
            ? 'bg-emerald-600 text-white shadow-emerald-600/30'
            : isProblem
              ? 'bg-amber-500 text-white shadow-amber-500/30'
              : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'
        }`}
      >
        {isSharing && <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-30 animate-ping" />}
        <MapPin className="relative h-6 w-6" />
        <span
          className={`absolute right-1 top-1 h-3 w-3 rounded-full border-2 border-white ${
            isSharing ? 'bg-emerald-300' : isProblem ? 'bg-red-500' : 'bg-slate-300'
          }`}
        />
      </button>
    </div>
  );
}
