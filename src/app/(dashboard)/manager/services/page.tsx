'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { cachedJson } from '@/lib/client-api-cache';

interface TicketListItem {
  id: string;
  ticketNo: string;
  status: string;
  issueDesc: string;
  createdAt: string;
  scheduledAt: string | null;
  customer: { id: string; name: string; phone: string };
  device: { id: string; serialNo: string; brand: string; model: string };
  technician: { id: string; name: string } | null;
  _count: { photos: number; filterChanges: number };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Bekliyor',
  ASSIGNED: 'Atandı',
  IN_PROGRESS: 'İşlemde',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function ManagerServicesPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ total: number; totalPages: number; page: number; pageSize: number } | null>(null);

  const fetchTickets = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      params.set('page', String(nextPage));
      params.set('pageSize', '25');
      const json = await cachedJson<{ data?: TicketListItem[]; meta?: { total: number; totalPages: number; page: number; pageSize: number }; error?: { message?: string } }>(`/api/service-tickets?${params.toString()}`, undefined, 1000);
      if (json.error) {
        setError(json.error.message || 'Yüklenemedi');
        return;
      }
      setTickets(json.data ?? []);
      setMeta(json.meta ?? null);
      setPage(json.meta?.page ?? nextPage);
    } catch {
      setError('Sunucuya bağlanılamadı');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => fetchTickets(1), 300);
    return () => clearTimeout(timer);
  }, [fetchTickets]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Servis Kayıtları</h1>
          <p className="mt-1 text-sm text-gray-500">Tüm servis çağrılarını görüntüleyin ve yönetin</p>
        </div>
        <Link
          href="/manager/services/new"
          className="inline-flex items-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          + Yeni Servis Kaydı
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
          {[
            { value: '', label: 'Tümü' },
            { value: 'PENDING', label: 'Bekliyor' },
            { value: 'ASSIGNED', label: 'Atandı' },
            { value: 'IN_PROGRESS', label: 'İşlemde' },
            { value: 'COMPLETED', label: 'Tamamlandı' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setStatusFilter(tab.value); setPage(1); }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-gray-600 hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Servis no veya arıza açıklaması ara..."
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none w-64"
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-400">Yükleniyor...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-12 text-center">
          <p className="text-gray-500">Henüz servis kaydı bulunmuyor.</p>
          <Link
            href="/manager/services/new"
            className="mt-4 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            + İlk servis kaydını oluştur
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/technician/${ticket.id}`}
              className="block rounded-lg border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-semibold text-blue-600">{ticket.ticketNo}</span>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[ticket.status] ?? ''}`}>
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">{ticket.customer.name}</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {ticket.device.brand} {ticket.device.model} — {ticket.device.serialNo}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-1">{ticket.issueDesc}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>{new Date(ticket.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                    {ticket.technician && <span>👤 {ticket.technician.name}</span>}
                    {ticket._count.photos > 0 && <span>📷 {ticket._count.photos}</span>}
                    {ticket._count.filterChanges > 0 && <span>🔄 {ticket._count.filterChanges} filtre</span>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3 text-sm">
          <span className="text-gray-500">Sayfa {meta.page} / {meta.totalPages} · {meta.total} servis</span>
          <div className="flex gap-2">
            <button className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50" disabled={page <= 1 || loading} onClick={() => fetchTickets(Math.max(1, page - 1))}>Önceki</button>
            <button className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50" disabled={page >= meta.totalPages || loading} onClick={() => fetchTickets(page + 1)}>Sonraki</button>
          </div>
        </div>
      )}
    </div>
  );
}
