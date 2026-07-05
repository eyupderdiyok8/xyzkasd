'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DashboardStatsData } from '@/lib/dashboard-data';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, Clock, Wrench } from 'lucide-react';

const SL: Record<string, string> = { PENDING: 'Bekliyor', ASSIGNED: 'Atandı', IN_PROGRESS: 'İşlemde', COMPLETED: 'Tamamlandı', CANCELLED: 'İptal' };
const SV: Record<string, 'secondary' | 'default' | 'success' | 'destructive' | 'outline'> = { PENDING: 'secondary', ASSIGNED: 'default', IN_PROGRESS: 'default', COMPLETED: 'success', CANCELLED: 'destructive' };

export default function DashboardStats({ initialData }: { initialData?: DashboardStatsData }) {
  const [data, setData] = useState<DashboardStatsData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) return; // server already provided data
    fetch('/api/reports?type=dashboard')
      .then(r => r.json()).then(j => { if (j.error) setError(j.error.message); else setData(j.data); })
      .catch(() => setError('Sunucuya bağlanılamadı'))
      .finally(() => setLoading(false));
  }, [initialData]);

  if (loading) return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-card">
      <Skeleton className="mb-4 h-5 w-40" />
      <div className="space-y-2">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    </div>
  );
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  if (!data) return null;

  const todayServices = data.todayServices ?? [];
  const hiddenTodayServices = Math.max(0, data.todayServiceCount - todayServices.length);

  return (
    <section className="rounded-lg border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">Bugünkü Servis Akışı</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Planlanan ve işlemde olan servisleri hızlıca takip edin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SummaryChip icon={Wrench} label="Servis" count={data.todayServiceCount} />
          <SummaryChip icon={Clock} label="30 gün" count={data.upcomingMaintenanceCount} />
        </div>
      </div>

      <div>
        {todayServices.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Bugün henüz servis kaydı yok
          </div>
        ) : (
          <div className="divide-y divide-border">
            {todayServices.map(s => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-muted/50">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-primary">{s.ticketNo}</span>
                    <span className="truncate text-sm font-medium text-card-foreground">{s.customer.name}</span>
                  </div>
                  {s.technician && <p className="mt-1 text-xs text-muted-foreground">{s.technician.name}</p>}
                </div>
                <Badge variant={SV[s.status] ?? 'outline'} className="text-[10px]">{SL[s.status] ?? s.status}</Badge>
              </div>
            ))}
            {hiddenTodayServices > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-xs text-muted-foreground">
                <span>İlk {todayServices.length} kayıt gösteriliyor, {hiddenTodayServices} kayıt daha var.</span>
                <Link href="/technician" className="font-semibold text-primary hover:text-primary/80">
                  Tüm servisleri gör
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryChip({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count: number }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5" />
      <span>{label}</span>
      <span className="font-semibold text-foreground">{count}</span>
    </div>
  );
}
