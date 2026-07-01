'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import PullToRefresh from '@/components/PullToRefresh';
import { saveTicket, getAllTickets } from '@/lib/offline/db';
import { getQueueStats, getTotalPending } from '@/lib/offline/sync-queue';

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

export default function TechnicianPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [pendingCount, setPendingCount] = useState(0);
  const [showingCached, setShowingCached] = useState(false);

  // Poll pending sync count
  useEffect(() => {
    const poll = async () => {
      const stats = await getQueueStats();
      setPendingCount(getTotalPending(stats));
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchTickets = async (status: string) => {
    setLoading(true);
    setError(null);
    setShowingCached(false);

    const isOnline = typeof navigator !== 'undefined' && navigator.onLine;

    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const res = await fetch(`/api/service-tickets?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Yüklenemedi');
      }
      const data = json.data ?? [];
      setTickets(data);

      // Cache in IndexedDB for offline access
      try {
        for (const ticket of data) {
          await saveTicket(ticket as unknown as Record<string, unknown>);
        }
      } catch {
        // IndexedDB caching is best-effort
      }
    } catch {
      // API failed — try loading from IndexedDB cache
      if (!isOnline) {
        setError('Çevrimdışısınız. Önbellekteki kayıtlar gösteriliyor.');
      } else {
        setError('Sunucuya bağlanılamadı. Önbellekteki kayıtlar gösteriliyor.');
      }
      setShowingCached(true);

      try {
        const cached = await getAllTickets();
        const cachedTickets = cached.map((t) => t.data as TicketListItem);
        // Apply status filter on cached data if needed
        const filtered = status
          ? cachedTickets.filter((t) => t.status === status)
          : cachedTickets;
        setTickets(filtered);
      } catch {
        setTickets([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets(statusFilter);
  }, [statusFilter]);

  const statusTabs = [
    { value: '', label: 'Tümü' },
    { value: 'ASSIGNED', label: 'Atandı' },
    { value: 'IN_PROGRESS', label: 'İşlemde' },
    { value: 'COMPLETED', label: 'Tamamlandı' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Servis Kayıtlarım</h1>
          <p className="mt-1 text-sm text-gray-500">
            Size atanmış servis çağrıları
          </p>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            📋 {pendingCount} bekleyen
          </span>
        )}
      </div>

      {/* Status tabs — scrollable on mobile */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto no-scrollbar">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              statusFilter === tab.value
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className={`rounded-lg border p-4 text-sm ${
          showingCached
            ? 'border-amber-200 bg-amber-50 text-amber-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-white p-5 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <PullToRefresh onRefresh={() => fetchTickets(statusFilter)}>
          <div className="rounded-lg border border-border bg-white p-12 text-center">
            <p className="text-gray-500">
              {showingCached
                ? 'Önbellekte kayıt bulunamadı. İnternet bağlantınızı kontrol edin.'
                : 'Henüz size atanmış bir servis kaydı bulunmuyor.'}
            </p>
          </div>
        </PullToRefresh>
      ) : (
        <PullToRefresh onRefresh={() => fetchTickets(statusFilter)}>
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
                    <span className="font-mono text-sm font-semibold text-blue-600">
                      {ticket.ticketNo}
                    </span>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[ticket.status] ?? ''
                      }`}
                    >
                      {STATUS_LABELS[ticket.status] ?? ticket.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-medium text-foreground">
                    {ticket.customer.name}
                  </p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {ticket.device.brand} {ticket.device.model} — {ticket.device.serialNo}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                    {ticket.issueDesc}
                  </p>

                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                    <span>
                      {new Date(ticket.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    {ticket._count.photos > 0 && (
                      <span>{ticket._count.photos} fotoğraf</span>
                    )}
                    {ticket._count.filterChanges > 0 && (
                      <span>{ticket._count.filterChanges} filtre</span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
          </div>
        </PullToRefresh>
      )}
    </div>
  );
}
