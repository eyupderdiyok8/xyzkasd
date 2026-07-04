'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Activity, Clipboard, Trash2, X } from 'lucide-react';

type PerfRecord = {
  id: number;
  route: string;
  method: string;
  url: string;
  status: number | 'ERR';
  durationMs: number;
  startedAt: string;
};

declare global {
  interface Window {
    __dashboardPerfPatched?: boolean;
    __dashboardPerfRecords?: PerfRecord[];
  }
}

const MAX_RECORDS = 150;
const EVENT_NAME = 'dashboard-perf-record';

function shouldEnable(searchParams: URLSearchParams) {
  if (process.env.NODE_ENV !== 'production') return true;
  if (searchParams.get('perf') === '1') return true;
  if (typeof window !== 'undefined' && window.localStorage.getItem('dashboardPerf') === '1') return true;
  return false;
}

function getFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function getFetchMethod(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase();
  if (typeof input !== 'string' && !(input instanceof URL) && input.method) return input.method.toUpperCase();
  return 'GET';
}

export default function DashboardPerfMonitor() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const enabled = shouldEnable(searchParams);
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<PerfRecord[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || window.__dashboardPerfPatched) return;

    const originalFetch = window.fetch.bind(window);
    window.__dashboardPerfPatched = true;
    window.__dashboardPerfRecords = [];

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = getFetchUrl(input);
      const method = getFetchMethod(input, init);
      const shouldTrack = url.startsWith('/api/') || url.includes('/api/');
      const start = performance.now();
      const startedAt = new Date().toISOString();

      try {
        const response = await originalFetch(input, init);
        if (shouldTrack) {
          const record: PerfRecord = {
            id: Date.now() + Math.random(),
            route: window.location.pathname,
            method,
            url,
            status: response.status,
            durationMs: Math.round(performance.now() - start),
            startedAt,
          };
          window.__dashboardPerfRecords = [record, ...(window.__dashboardPerfRecords ?? [])].slice(0, MAX_RECORDS);
          window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: record }));
        }
        return response;
      } catch (error) {
        if (shouldTrack) {
          const record: PerfRecord = {
            id: Date.now() + Math.random(),
            route: window.location.pathname,
            method,
            url,
            status: 'ERR',
            durationMs: Math.round(performance.now() - start),
            startedAt,
          };
          window.__dashboardPerfRecords = [record, ...(window.__dashboardPerfRecords ?? [])].slice(0, MAX_RECORDS);
          window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: record }));
        }
        throw error;
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleRecord = (event: Event) => {
      const record = (event as CustomEvent<PerfRecord>).detail;
      setRecords((current) => [record, ...current].slice(0, MAX_RECORDS));
    };

    setRecords(window.__dashboardPerfRecords ?? []);
    window.addEventListener(EVENT_NAME, handleRecord);
    return () => window.removeEventListener(EVENT_NAME, handleRecord);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const nav = window.performance?.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined;
    const durationMs = nav && window.performance.timeOrigin
      ? Math.max(0, Math.round(Date.now() - window.performance.timeOrigin))
      : 0;
    const record: PerfRecord = {
      id: Date.now(),
      route: pathname,
      method: 'PAGE',
      url: pathname,
      status: 200,
      durationMs,
      startedAt: new Date().toISOString(),
    };
    window.__dashboardPerfRecords = [record, ...(window.__dashboardPerfRecords ?? [])].slice(0, MAX_RECORDS);
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: record }));
  }, [enabled, pathname]);

  const stats = useMemo(() => {
    const apiRecords = records.filter((record) => record.method !== 'PAGE');
    const slowest = apiRecords.reduce<PerfRecord | null>(
      (current, record) => (!current || record.durationMs > current.durationMs ? record : current),
      null,
    );
    const average = apiRecords.length
      ? Math.round(apiRecords.reduce((sum, record) => sum + record.durationMs, 0) / apiRecords.length)
      : 0;
    const errors = apiRecords.filter((record) => record.status === 'ERR' || Number(record.status) >= 400).length;
    return { apiCount: apiRecords.length, slowest, average, errors };
  }, [records]);

  if (!enabled) return null;

  const clearRecords = () => {
    window.__dashboardPerfRecords = [];
    setRecords([]);
  };

  const copyRecords = async () => {
    await navigator.clipboard.writeText(JSON.stringify(records, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="fixed bottom-20 right-20 z-[70] md:bottom-4 md:right-4">
      {open && (
        <div className="mb-3 w-[min(92vw,560px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-950">Dashboard ölçüm paneli</p>
              <p className="text-xs text-slate-500">
                {stats.apiCount} API çağrısı, ortalama {stats.average} ms, hata {stats.errors}
              </p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600 sm:grid-cols-3">
            <div>
              <span className="font-semibold text-slate-950">En yavaş</span>
              <p className="mt-1 truncate">{stats.slowest ? `${stats.slowest.durationMs} ms ${stats.slowest.url}` : 'Henüz yok'}</p>
            </div>
            <div>
              <span className="font-semibold text-slate-950">Sayfa</span>
              <p className="mt-1 truncate">{pathname}</p>
            </div>
            <div className="flex items-end gap-2 sm:justify-end">
              <button
                type="button"
                onClick={copyRecords}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Clipboard className="h-3.5 w-3.5" />
                {copied ? 'Kopyalandı' : 'Kopyala'}
              </button>
              <button
                type="button"
                onClick={clearRecords}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Temizle
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-auto">
            {records.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">Sayfada gezinince API süreleri burada görünecek.</p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="px-4 py-2 font-semibold">Süre</th>
                    <th className="px-2 py-2 font-semibold">Durum</th>
                    <th className="px-2 py-2 font-semibold">Metot</th>
                    <th className="px-2 py-2 font-semibold">Adres</th>
                    <th className="px-4 py-2 font-semibold">Sayfa</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b border-slate-50">
                      <td className={`whitespace-nowrap px-4 py-2 font-bold ${record.durationMs > 1000 ? 'text-red-600' : record.durationMs > 400 ? 'text-amber-600' : 'text-emerald-700'}`}>
                        {record.durationMs} ms
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-slate-600">{record.status}</td>
                      <td className="whitespace-nowrap px-2 py-2 font-mono text-slate-600">{record.method}</td>
                      <td className="max-w-[220px] truncate px-2 py-2 font-mono text-slate-700" title={record.url}>{record.url}</td>
                      <td className="max-w-[140px] truncate px-4 py-2 text-slate-500" title={record.route}>{record.route}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`flex h-12 w-12 items-center justify-center rounded-full shadow-2xl transition active:scale-95 ${
          stats.errors > 0
            ? 'bg-red-600 text-white shadow-red-600/25'
            : stats.apiCount > 0
              ? 'bg-slate-950 text-white shadow-slate-950/25'
              : 'bg-white text-slate-700 ring-1 ring-slate-200'
        }`}
        aria-label="Dashboard ölçüm paneli"
        title="Dashboard ölçüm paneli"
      >
        <Activity className="h-5 w-5" />
      </button>
    </div>
  );
}
