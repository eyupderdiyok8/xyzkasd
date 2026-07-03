'use client';

import { useEffect, useState } from 'react';
import type { OverdueQueueItem } from '@/lib/dashboard-data';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2 } from 'lucide-react';

const SL: Record<string, string> = { PENDING: 'Bekliyor', ASSIGNED: 'Atandı', IN_PROGRESS: 'İşlemde' };
const SV: Record<string, 'secondary' | 'default' | 'outline'> = { PENDING: 'secondary', ASSIGNED: 'default', IN_PROGRESS: 'outline' };

export default function OverdueQueue({ initialData }: { initialData?: OverdueQueueItem[] }) {
  const [queue, setQueue] = useState<OverdueQueueItem[] | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) return;
    fetch('/api/maintenance/overdue-queue')
      .then(r => r.json()).then(j => { if (j.data) setQueue(j.data); else setError(j.error?.message); })
      .catch(() => setError('Sunucuya bağlanılamadı'))
      .finally(() => setLoading(false));
  }, [initialData]);

  if (loading) return <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!queue) return null;

  const items = queue;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span><b className="text-foreground">{items.length}</b> gecikmiş talep</span>
        <Link href="/technician" className="font-medium text-primary hover:text-primary/80">Tümü →</Link>
      </div>
      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" />Kuyruk boş</div>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {items.map(item => (
            <Link key={item.id} href={`/technician/${item.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs transition-colors hover:bg-muted/50">
              <div className="min-w-0">
                <span className="font-medium text-foreground">{item.deviceBrand} {item.deviceModel}</span>
                <span className="ml-2 text-muted-foreground">{item.ticketNo} · {item.customerName ?? '—'}</span>
              </div>
              <Badge variant={SV[item.status] ?? 'outline'} className="text-[10px]">{SL[item.status] ?? item.status}</Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
