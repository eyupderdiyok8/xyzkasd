'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2 } from 'lucide-react';

interface QueueItem {
  id: string; ticketNo: string; issueDesc: string; status: string;
  customerName: string | null; customerPhone: string | null;
  deviceSerialNo: string; deviceBrand: string; deviceModel: string;
  technicianName: string | null; createdAt: string; scheduledAt: string | null;
}
interface QueueData { data: QueueItem[]; total: number; }

const SL: Record<string, string> = { PENDING: 'Bekliyor', ASSIGNED: 'Atandı', IN_PROGRESS: 'İşlemde' };
const SV: Record<string, 'secondary' | 'default' | 'outline'> = { PENDING: 'secondary', ASSIGNED: 'default', IN_PROGRESS: 'outline' };

export default function OverdueQueue() {
  const [queue, setQueue] = useState<QueueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/maintenance/overdue-queue')
      .then(r => r.json()).then(j => { if (j.data) setQueue(j.data); else setError(j.error?.message); })
      .catch(() => setError('Sunucuya bağlanılamadı'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!queue) return null;

  const items = queue.data ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span><b className="text-slate-700">{queue.total ?? items.length}</b> gecikmiş talep</span>
        <Link href="/technician" className="font-medium text-blue-600 hover:text-blue-800">Tümü →</Link>
      </div>
      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />Kuyruk boş</div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {items.map(item => (
            <Link key={item.id} href={`/technician/${item.id}`} className="flex items-center justify-between px-3 py-2.5 text-xs hover:bg-slate-50">
              <div>
                <span className="font-medium text-slate-700">{item.deviceBrand} {item.deviceModel}</span>
                <span className="ml-2 text-slate-400">{item.ticketNo} · {item.customerName ?? '—'}</span>
              </div>
              <Badge variant={SV[item.status] ?? 'outline'} className="text-[10px]">{SL[item.status] ?? item.status}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
