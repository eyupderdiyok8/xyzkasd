'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MapPin, Clock, RefreshCw, ExternalLink } from 'lucide-react';

interface TechnicianLocation {
  id: string;
  name: string;
  phone: string | null;
  lastLat: number | null;
  lastLng: number | null;
  locationUpdatedAt: string | null;
  locationSharingEnabled: boolean;
}

type LocationStatus = 'live' | 'recent' | 'stale' | 'off' | 'none';

const MAP_REFRESH_INTERVAL_MS = 60_000;
const TURKEY_CENTER: [number, number] = [39.0, 35.0];

export default function HaritaPage() {
  const [techs, setTechs] = useState<TechnicianLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const leafletRef = useRef<any>(null);
  const didFitBoundsRef = useRef(false);
  const [leafletReady, setLeafletReady] = useState(false);

  // Load Leaflet dynamically (no SSR)
  useEffect(() => {
    import('leaflet').then(mod => {
      const L = mod.default;
      leafletRef.current = L;

      if (mapContainerRef.current && !mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current).setView(TURKEY_CENTER, 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(mapRef.current);
        setTimeout(() => mapRef.current?.invalidateSize(), 0);
        setTimeout(() => mapRef.current?.invalidateSize(), 250);
      }

      setLeafletReady(true);
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const res = await fetch('/api/technicians/locations');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Yüklenemedi');
      setTechs(json.data ?? []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update markers on map when techs change
  useEffect(() => {
    const L = leafletRef.current;
    if (!L || !mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const activeTechs = techs.filter(hasLocation);
    const bounds: any[] = [];

    activeTechs.forEach(tech => {
      const status = getLocationStatus(tech);
      const marker = L.marker([tech.lastLat, tech.lastLng])
        .setIcon(createTechnicianIcon(L, tech, status))
        .addTo(mapRef.current)
        .bindPopup(createPopupHtml(tech));
      markersRef.current.push(marker);
      bounds.push([tech.lastLat, tech.lastLng]);
    });

    if (bounds.length === 1 && !didFitBoundsRef.current) {
      mapRef.current.setView(bounds[0], 13);
      didFitBoundsRef.current = true;
    } else if (bounds.length > 1 && !didFitBoundsRef.current) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
      didFitBoundsRef.current = true;
    } else if (bounds.length === 0 && !didFitBoundsRef.current) {
      mapRef.current.setView(TURKEY_CENTER, 6);
    }
  }, [techs, leafletReady]);

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, MAP_REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchLocations]);

  const activeTechs = techs.filter(hasLocation);
  const offlineTechs = techs.filter(t => !hasLocation(t));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teknisyen Konumları</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTechs.length} son konumlu, {offlineTechs.length} konum paylaşmadı
          </p>
        </div>
        <button
          onClick={fetchLocations}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          Yenile
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Map */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="relative">
          <div ref={mapContainerRef} className="technician-map h-[420px] w-full sm:h-[520px]" />
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-medium text-muted-foreground">
              Harita yükleniyor...
            </div>
          )}
          {activeTechs.length === 0 && (
            <div className="pointer-events-none absolute inset-x-4 top-4 rounded-xl border border-amber-200 bg-amber-50/95 p-4 text-sm text-amber-800 shadow-sm">
              Henüz konum paylaşan teknisyen yok. Teknisyen PWA üzerinden konum paylaşımını başlatınca burada marker görünecek.
            </div>
          )}
        </div>
      </div>

      {/* Technician Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {techs.map(tech => {
          const status = getLocationStatus(tech);
          const statusStyle = getStatusStyle(status);
          const isOnline = status !== 'none';
          return (
            <div
              key={tech.id}
              className={`rounded-xl border p-4 transition-all ${
                isOnline
                  ? statusStyle.card
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full ${statusStyle.pin}`}>
                      <MapPin className="h-4 w-4" />
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{tech.name}</p>
                    {tech.phone && <p className="text-xs text-muted-foreground">{tech.phone}</p>}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusStyle.badge}`}>
                  {statusStyle.label}
                </span>
              </div>

              {isOnline && (
                <div className="mt-3 space-y-1 border-t border-border pt-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>{tech.lastLat!.toFixed(4)}, {tech.lastLng!.toFixed(4)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>
                      {status === 'off' ? 'Paylaşım kapalı, son görülen: ' : ''}
                      {formatTimeAgo(tech.locationUpdatedAt)}
                    </span>
                  </div>
                  <a
                    href={googleMapsUrl(tech)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Google Maps'te aç
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {!isOnline && (
                <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
                  Konum paylaşmadı
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function hasLocation(tech: TechnicianLocation): tech is TechnicianLocation & { lastLat: number; lastLng: number } {
  return typeof tech.lastLat === 'number' && typeof tech.lastLng === 'number';
}

function getLocationStatus(tech: TechnicianLocation): LocationStatus {
  if (!hasLocation(tech) || !tech.locationUpdatedAt) return 'none';
  if (!tech.locationSharingEnabled) return 'off';
  const mins = Math.floor((Date.now() - new Date(tech.locationUpdatedAt).getTime()) / 60_000);
  if (mins < 2) return 'live';
  if (mins < 10) return 'recent';
  return 'stale';
}

function getStatusStyle(status: LocationStatus) {
  switch (status) {
    case 'live':
      return {
        label: 'Canlı',
        markerClass: 'technician-marker-live',
        pin: 'bg-green-100 text-green-700',
        badge: 'bg-green-100 text-green-700',
        card: 'border-green-200 bg-green-50/50',
      };
    case 'recent':
      return {
        label: 'Yakın zamanda',
        markerClass: 'technician-marker-recent',
        pin: 'bg-amber-100 text-amber-700',
        badge: 'bg-amber-100 text-amber-700',
        card: 'border-amber-200 bg-amber-50/50',
      };
    case 'stale':
      return {
        label: 'Eski konum',
        markerClass: 'technician-marker-stale',
        pin: 'bg-slate-100 text-slate-600',
        badge: 'bg-slate-100 text-slate-600',
        card: 'border-slate-200 bg-slate-50',
      };
    case 'off':
      return {
        label: 'Paylaşım kapalı',
        markerClass: 'technician-marker-off',
        pin: 'bg-slate-100 text-slate-600',
        badge: 'bg-slate-100 text-slate-600',
        card: 'border-slate-200 bg-slate-50',
      };
    default:
      return {
        label: 'Konum yok',
        markerClass: 'technician-marker-none',
        pin: 'bg-muted text-muted-foreground',
        badge: 'bg-muted text-muted-foreground',
        card: 'border-border bg-card',
      };
  }
}

function createTechnicianIcon(L: any, tech: TechnicianLocation, status: LocationStatus) {
  const style = getStatusStyle(status);
  const initial = escapeHtml((tech.name || '?').trim().charAt(0).toUpperCase() || '?');
  return L.divIcon({
    className: 'technician-marker-wrapper',
    html: `<div class="technician-marker ${style.markerClass}"><span>${initial}</span></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
    popupAnchor: [0, -38],
  });
}

function createPopupHtml(tech: TechnicianLocation) {
  const lat = typeof tech.lastLat === 'number' ? tech.lastLat.toFixed(5) : '';
  const lng = typeof tech.lastLng === 'number' ? tech.lastLng.toFixed(5) : '';
  const phone = tech.phone ? `<div>${escapeHtml(tech.phone)}</div>` : '';
  return `
    <div class="technician-popup">
      <strong>${escapeHtml(tech.name)}</strong>
      ${phone}
      <small>${tech.locationSharingEnabled ? '' : 'Paylaşım kapalı, son görülen: '}${formatTimeAgo(tech.locationUpdatedAt)}</small>
      <small>${lat}, ${lng}</small>
      <a href="${googleMapsUrl(tech)}" target="_blank" rel="noreferrer">Google Maps'te aç</a>
    </div>
  `;
}

function googleMapsUrl(tech: TechnicianLocation) {
  return `https://www.google.com/maps?q=${tech.lastLat},${tech.lastLng}`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return '—';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
  if (mins < 1) return 'Şimdi';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  return `${hours} saat önce`;
}
