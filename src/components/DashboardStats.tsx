'use client';

import { useEffect, useState } from 'react';
import type { DashboardStatsData } from '@/lib/dashboard-data';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Wrench, Clock, AlertTriangle } from 'lucide-react';

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
    <div className="grid gap-4 sm:grid-cols-3">
      {[1,2,3].map(i => <div key={i} className="rounded-lg border border-slate-200 bg-white p-5"><Skeleton className="h-3 w-20 mb-3" /><Skeleton className="h-8 w-12" /></div>)}
    </div>
  );
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi title="Bugünkü Servisler" value={data.todayServiceCount} icon={Wrench} color="blue" />
        <Kpi title="Yaklaşan (30 gün)" value={data.upcomingMaintenanceCount} icon={Clock} color="emerald" />
        <Kpi title="Gecikmiş Bakım" value={data.overdueMaintenanceCount} icon={AlertTriangle} color="red" />
      </div>

      {/* Today's services */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Bugünkü Servisler</h3>
        </div>
        {(data.todayServices ?? []).length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-slate-400">Bugün henüz servis kaydı yok</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(data.todayServices ?? []).map(s => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-blue-600">{s.ticketNo}</span>
                  <span className="text-sm text-slate-700">{s.customer.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  {s.technician && <span className="text-xs text-slate-400">{s.technician.name}</span>}
                  <Badge variant={SV[s.status] ?? 'outline'} className="text-[10px]">{SL[s.status] ?? s.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ title, value, icon: Icon, color }: { title: string; value: number; icon: React.ElementType; color: 'blue' | 'emerald' | 'red' }) {
  const c = { blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-600' }[color];
  const tc = { blue: 'text-blue-700', emerald: 'text-emerald-700', red: 'text-red-700' }[color];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c}`}><Icon className="h-4 w-4" /></div>
        <div>
          <p className="text-xs text-slate-500">{title}</p>
          <p className={`text-2xl font-bold tabular-nums ${tc}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
