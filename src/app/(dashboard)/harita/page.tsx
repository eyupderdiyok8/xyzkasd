'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MapPin, Navigation, Clock, RefreshCw } from 'lucide-react';

interface TechnicianLocation {
  id: string;
  name: string;
  phone: string | null;
  lastLat: number | null;
  lastLng: number | null;
  locationUpdatedAt: string | null;
}

export default function HaritaPage() {
  const [techs, setTechs] = useState<TechnicianLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);

  // Load Leaflet dynamically (no SSR)
  useEffect(() => {
    let L: any;
    import('leaflet').then(mod => {
      L = mod.default;
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (mapContainerRef.current && !mapRef.current) {
        mapRef.current = L.map(mapContainerRef.current).setView([39.0, 35.0], 6);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(mapRef.current);
      }
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
    const L = (window as any).L;
    if (!L || !mapRef.current) return;

    // Clear old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const activeTechs = techs.filter(t => t.lastLat && t.lastLng);
    const bounds: any[] = [];

    activeTechs.forEach(tech => {
      const marker = L.marker([tech.lastLat, tech.lastLng])
        .addTo(mapRef.current)
        .bindPopup(`<b>${tech.name}</b><br>${tech.phone ?? ''}<br><small>${formatTimeAgo(tech.locationUpdatedAt)}</small>`);
      markersRef.current.push(marker);
      bounds.push([tech.lastLat, tech.lastLng]);
    });

    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [techs]);

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 15_000);
    return () => clearInterval(interval);
  }, [fetchLocations]);

  const activeTechs = techs.filter(t => t.lastLat && t.lastLng);
  const offlineTechs = techs.filter(t => !t.lastLat || !t.lastLng);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teknisyen Konumları</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {activeTechs.length} aktif, {offlineTechs.length} çevrimdışı
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
        <div ref={mapContainerRef} className="h-[450px] w-full" />
      </div>

      {/* Technician Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {techs.map(tech => {
          const isOnline = tech.lastLat && tech.lastLng;
          return (
            <div
              key={tech.id}
              className={`rounded-xl border p-4 transition-all ${
                isOnline
                  ? 'border-green-200 bg-green-50/50'
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg">
                    {isOnline ? '📍' : '🔴'}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{tech.name}</p>
                    {tech.phone && <p className="text-xs text-muted-foreground">{tech.phone}</p>}
                  </div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isOnline ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                  {isOnline ? 'Aktif' : 'Çevrimdışı'}
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
                    <span>{formatTimeAgo(tech.locationUpdatedAt)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string | null) {
  if (!dateStr) return '—';
  const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60_000);
  if (mins < 1) return 'Şimdi';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  return `${hours} saat önce`;
}
