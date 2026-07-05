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
import { Plus, Search, X, Phone, MapPin, Wrench, ClipboardList, LayoutGrid, List, ChevronRight } from 'lucide-react';

interface PhoneInfo { id: string; label: string; number: string; }
interface Customer {
  id: string; name: string; email: string | null; notes: string | null; tags: string;
  phone: string; address: string | null; city: string | null; district: string | null;
  deletedAt: string | null; createdAt: string;
  phones: PhoneInfo[];
  _count: { devices: number; serviceTickets: number; addresses: number; phones: number };
}

export default function CustomersPage() {
  const { role } = useDashboardSession();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ total: number; totalPages: number; page: number; pageSize: number } | null>(null);

  const fetchCustomers = useCallback(async (term: string, nextPage = 1) => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (term) params.set('search', term);
      params.set('page', String(nextPage));
      params.set('pageSize', '25');
      const json = await cachedJson<{ data?: Customer[]; meta?: { total: number; totalPages: number; page: number; pageSize: number }; error?: { message?: string } }>(`/api/customers?${params}`, undefined, 1000);
      if (json.error) { setError(json.error.message || 'Yüklenemedi'); return; }
      setCustomers(json.data ?? []);
      setMeta(json.meta ?? null);
      setPage(json.meta?.page ?? nextPage);
    } catch { setError('Sunucuya bağlanılamadı'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(search, 1), 300);
    return () => clearTimeout(timer);
  }, [fetchCustomers, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchCustomers(search, 1);
  };
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" silinsin mi?`)) return;
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    if (res.ok) setCustomers(p => p.filter(c => c.id !== id));
  };

  const canEdit = hasRole(role, 'technician');
  const totalCustomers = meta?.total ?? customers.length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Müşteriler</h1>
          <p className="text-sm text-slate-500">{totalCustomers} müşteri</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${viewMode === 'table' ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-700'}`}
              title="Liste görünümü"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`rounded-md px-2.5 py-1.5 text-sm transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-slate-500 hover:text-slate-700'}`}
              title="Grid görünümü"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
          {canEdit && (
            <Button asChild><Link href="/customers/new"><Plus className="mr-1.5 h-4 w-4" />Yeni Müşteri</Link></Button>
          )}
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="İsim veya telefon..." className="pl-9 bg-white" />
        </div>
        <Button type="submit" variant="secondary">Ara</Button>
        {search && <Button type="button" variant="ghost" onClick={() => { setSearch(''); setPage(1); fetchCustomers('', 1); }}><X className="mr-1 h-3.5 w-3.5" />Temizle</Button>}
      </form>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Loading */}
      {loading && <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>}

      {/* Table / Grid */}
      {!loading && !error && (
        <>
          {viewMode === 'table' ? (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Müşteri</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Telefon</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Konum</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Etiket</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Cihaz</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500">Servis</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {customers.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/customers/${c.id}`} className="font-medium text-blue-600 hover:text-blue-800">{c.name}</Link>
                        {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {(c.phones ?? []).length > 0 ? (
                          <div className="space-y-0.5">
                            {(c.phones ?? []).map(p => (
                              <span key={p.id} className="flex items-center gap-1 text-xs text-slate-600"><Phone className="h-3 w-3" />{p.number}</span>
                            ))}
                          </div>
                        ) : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.city ? <span className="flex items-center gap-1 text-xs text-slate-500"><MapPin className="h-3 w-3" />{c.district && `${c.district}/`}{c.city}</span> : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {c.tags ? c.tags.split(',').filter(Boolean).map(t => <Badge key={t} variant="secondary" className="mr-1 text-[10px]">{t.trim()}</Badge>) : <span className="text-xs text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-medium tabular-nums">{c._count?.devices ?? 0}</td>
                      <td className="px-4 py-3 text-center text-xs font-medium tabular-nums">{c._count?.serviceTickets ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" asChild><Link href={`/customers/${c.id}`}>Detay</Link></Button>
                          {canEdit && <Button variant="ghost" size="sm" asChild><Link href={`/customers/${c.id}/edit`}>Düzenle</Link></Button>}
                          {canEdit && <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(c.id, c.name)}>Sil</Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {customers.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">{search ? 'Eşleşen müşteri bulunamadı' : 'Henüz müşteri yok'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* ── Grid View ──────────────────────── */
            <>
              {customers.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-12 text-center text-sm text-slate-400">
                  {search ? 'Eşleşen müşteri bulunamadı' : 'Henüz müşteri yok'}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {customers.map(c => {
                    const primaryPhone = (c.phones ?? []).length > 0 ? c.phones[0].number : (c.phone || null);
                    const tagList = c.tags ? c.tags.split(',').filter(Boolean) : [];
                    return (
                      <div key={c.id} className="group rounded-lg border border-slate-200 bg-white p-4 transition-shadow hover:shadow-md">
                        {/* Avatar + Name */}
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <Link href={`/customers/${c.id}`} className="block truncate text-sm font-semibold text-slate-900 hover:text-blue-600">
                                {c.name}
                              </Link>
                              {c.email && <p className="truncate text-xs text-slate-400">{c.email}</p>}
                            </div>
                          </div>
                        </div>

                        {/* Phone */}
                        {primaryPhone && (
                          <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate">{primaryPhone}</span>
                            {(c.phones ?? []).length > 1 && (
                              <span className="shrink-0 text-[10px] text-slate-400">+{c.phones.length - 1}</span>
                            )}
                          </div>
                        )}

                        {/* Location */}
                        {c.city && (
                          <div className="mb-1.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                            <span className="truncate">{[c.district, c.city].filter(Boolean).join('/')}</span>
                          </div>
                        )}

                        {/* Tags */}
                        {tagList.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-1">
                            {tagList.map(t => (
                              <Badge key={t} variant="secondary" className="text-[10px]">{t.trim()}</Badge>
                            ))}
                          </div>
                        )}

                        {/* Stats */}
                        <div className="mb-3 flex gap-3 rounded-lg bg-slate-50 px-3 py-2">
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Wrench className="h-3 w-3" />
                            <span className="font-semibold tabular-nums text-slate-700">{c._count?.devices ?? 0}</span>
                            <span className="text-[10px]">cihaz</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <ClipboardList className="h-3 w-3" />
                            <span className="font-semibold tabular-nums text-slate-700">{c._count?.serviceTickets ?? 0}</span>
                            <span className="text-[10px]">servis</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                          <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                            <Link href={`/customers/${c.id}`}>
                              Detay <ChevronRight className="ml-0.5 h-3 w-3" />
                            </Link>
                          </Button>
                          {canEdit && (
                            <div className="flex gap-0.5">
                              <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
                                <Link href={`/customers/${c.id}/edit`}>Düzenle</Link>
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-600 hover:text-red-700" onClick={() => handleDelete(c.id, c.name)}>Sil</Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">
          <span className="text-slate-500">Sayfa {meta.page} / {meta.totalPages}</span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => fetchCustomers(search, Math.max(1, page - 1))}>Önceki</Button>
            <Button type="button" variant="outline" size="sm" disabled={page >= meta.totalPages || loading} onClick={() => fetchCustomers(search, page + 1)}>Sonraki</Button>
          </div>
        </div>
      )}
    </div>
  );
}
