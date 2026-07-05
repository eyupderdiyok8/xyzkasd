'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { hasRole } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardSession } from '@/components/DashboardSessionProvider';
import { cachedJson } from '@/lib/client-api-cache';
import { Plus, Search, X, ShieldCheck } from 'lucide-react';

interface Device {
  id: string; serialNo: string; brand: string; model: string;
  qrCode: string | null; status: string; warrantyStart: string | null;
  warrantyEnd: string | null; installDate: string | null;
  customer: { id: string; name: string } | null; createdAt: string;
  _count?: { tdsReadings: number; serviceTickets: number; photos: number };
}

const STATUS_OPTS = ['', 'ACTIVE', 'PASSIVE', 'SCRAP'] as const;
const STATUS_LABELS = ['Tümü', 'Aktif', 'Pasif', 'Hurda'];
const STATUS_VARS: Record<string, 'success' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'success', PASSIVE: 'secondary', SCRAP: 'destructive',
};

export default function DevicesPage() {
  const { role } = useDashboardSession();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ total: number; totalPages: number; page: number; pageSize: number } | null>(null);

  const fetchDevices = useCallback(async (term: string, status: string, nextPage = 1) => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams();
      if (term) p.set('search', term);
      if (status) p.set('status', status);
      p.set('page', String(nextPage));
      p.set('pageSize', '25');
      const json = await cachedJson<{ data?: Device[]; meta?: { total: number; totalPages: number; page: number; pageSize: number }; error?: { message?: string } }>(`/api/devices?${p}`, undefined, 1000);
      if (json.error) { setError(json.error.message || 'Yüklenemedi'); return; }
      setDevices(json.data ?? []);
      setMeta(json.meta ?? null);
      setPage(json.meta?.page ?? nextPage);
    } catch { setError('Sunucuya bağlanılamadı'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchDevices(search, statusFilter, 1), 300);
    return () => clearTimeout(timer);
  }, [fetchDevices, search, statusFilter]);

  const canEdit = hasRole(role, 'technician');
  const totalDevices = meta?.total ?? devices.length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Cihazlar</h1>
          <p className="text-sm text-slate-500">{totalDevices} cihaz</p>
        </div>
        {canEdit && <Button asChild><Link href="/devices/new"><Plus className="mr-1.5 h-4 w-4" />Yeni Cihaz</Link></Button>}
      </div>

      {/* Search + Status tabs */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          {STATUS_OPTS.map((v, i) => {
            const active = statusFilter === v;
            return (
              <button key={v} onClick={() => { setStatusFilter(v); setPage(1); }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {STATUS_LABELS[i]}
              </button>
            );
          })}
        </div>
        <form onSubmit={e => { e.preventDefault(); setPage(1); fetchDevices(search, statusFilter, 1); }} className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Seri no, marka..." className="pl-9 bg-white w-48" />
          </div>
          <Button type="submit" variant="secondary" size="sm">Ara</Button>
          {search && <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(''); setPage(1); fetchDevices('', statusFilter, 1); }}><X className="h-3.5 w-3.5" /></Button>}
        </form>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}

      {!loading && !error && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Cihaz</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Seri No</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Müşteri</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Durum</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Garanti</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">TDS</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Servis</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devices.map(d => {
                const w = d.warrantyEnd && new Date(d.warrantyEnd) > new Date();
                return (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/devices/${d.id}`} className="font-medium text-blue-600 hover:text-blue-800">{d.brand} {d.model}</Link>
                    </td>
                    <td className="px-4 py-3"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-600">{d.serialNo}</code></td>
                    <td className="px-4 py-3">{d.customer ? <Link href={`/customers/${d.customer.id}`} className="text-xs text-slate-600 hover:text-slate-900">{d.customer.name}</Link> : <span className="text-xs text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-center"><Badge variant={STATUS_VARS[d.status] ?? 'outline'} className="text-[10px]">{d.status}</Badge></td>
                    <td className="px-4 py-3 text-center text-xs font-medium">{d.warrantyEnd ? <span className={w ? 'text-emerald-600' : 'text-red-600'}>{w ? 'Aktif' : 'Süresi doldu'}</span> : <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-3 text-center text-xs font-medium tabular-nums">{d._count?.tdsReadings ?? 0}</td>
                    <td className="px-4 py-3 text-center text-xs font-medium tabular-nums">{d._count?.serviceTickets ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" asChild><Link href={`/devices/${d.id}`}>Detay</Link></Button>
                        {canEdit && <Button variant="ghost" size="sm" asChild><Link href={`/devices/${d.id}/edit`}>Düzenle</Link></Button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {devices.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">{search || statusFilter ? 'Eşleşen cihaz bulunamadı' : 'Henüz cihaz yok'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
          <span className="text-slate-500">Sayfa {meta.page} / {meta.totalPages}</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => fetchDevices(search, statusFilter, Math.max(1, page - 1))}>Önceki</Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= meta.totalPages || loading} onClick={() => fetchDevices(search, statusFilter, page + 1)}>Sonraki</Button>
          </div>
        </div>
      )}
    </div>
  );
}
