'use client';

import { useEffect, useState } from 'react';
import type { MaintenanceRemindersData, MaintenanceItemData } from '@/lib/dashboard-data';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Bell, Calendar, CheckCircle2 } from 'lucide-react';

export default function MaintenanceReminders({ initialData }: { initialData?: MaintenanceRemindersData }) {
  const [data, setData] = useState<MaintenanceRemindersData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) return;
    fetch('/api/maintenance/reminders')
      .then(r => r.json()).then(j => { if (j.data) setData(j.data); else setError(j.error?.message); })
      .catch(() => setError('Sunucuya bağlanılamadı'))
      .finally(() => setLoading(false));
  }, [initialData]);

  if (loading) return <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-10 w-full" /></div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!data) return null;

  const overdue = data.overdue ?? [];
  const upcoming7 = data.upcoming7 ?? [];
  const upcoming15 = data.upcoming15 ?? [];
  const has = (data.overdueCount ?? 0) > 0 || (data.upcoming7Count ?? 0) > 0 || (data.upcoming15Count ?? 0) > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Chip icon={AlertTriangle} label="Gecikmiş" count={data.overdueCount ?? 0} color="red" />
        <Chip icon={Bell} label="7 Gün Kala" count={data.upcoming7Count ?? 0} color="amber" />
        <Chip icon={Calendar} label="15 Gün Kala" count={data.upcoming15Count ?? 0} color="blue" />
      </div>

      {overdue.length > 0 && (
        <Section title="Gecikmiş" count={overdue.length} color="red">
          {overdue.slice(0, 5).map(item => <Row key={`o-${item.deviceId}`} item={item} color="red" />)}
        </Section>
      )}
      {upcoming7.length > 0 && (
        <Section title="Bu Hafta" count={upcoming7.length} color="amber">
          {upcoming7.slice(0, 5).map(item => <Row key={`7-${item.deviceId}`} item={item} color="amber" />)}
        </Section>
      )}
      {upcoming15.length > 0 && (
        <Section title="Yakında" count={upcoming15.length} color="blue">
          {upcoming15.slice(0, 5).map(item => <Row key={`15-${item.deviceId}`} item={item} color="blue" />)}
        </Section>
      )}
      {!has && <div className="flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" />Tüm bakımlar güncel</div>}
    </div>
  );
}

function Chip({ icon: Icon, label, count, color }: { icon: React.ElementType; label: string; count: number; color: 'red' | 'amber' | 'blue' }) {
  const c = { red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-700', blue: 'bg-blue-50 text-blue-700' }[color];
  return <div className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${c}`}><Icon className="h-3 w-3" />{label} <span className="font-bold">{count}</span></div>;
}

function Section({ title, count, children, color }: { title: string; count: number; children: React.ReactNode; color: 'red' | 'amber' | 'blue' }) {
  const tc = { red: 'text-red-600', amber: 'text-amber-600', blue: 'text-blue-600' }[color];
  return (
    <div>
      <p className={`mb-1.5 text-[11px] font-semibold uppercase tracking-wider ${tc}`}>{title} ({count})</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ item, color }: { item: MaintenanceItemData; color: 'red' | 'amber' | 'blue' }) {
  const b = { red: 'border-red-300', amber: 'border-amber-300', blue: 'border-blue-300' }[color];
  const bg = { red: 'bg-red-50', amber: 'bg-amber-50', blue: 'bg-blue-50' }[color];
  return (
    <Link href={`/devices/${item.deviceId}`} className={`flex items-center justify-between rounded border-l-2 bg-slate-50 px-3 py-2 text-xs transition-colors hover:${bg} ${b}`}>
      <div>
        <p className="font-medium text-slate-700">{item.brand} {item.model}</p>
        <p className="text-slate-400">{item.customerName ?? '—'}{item.filterName && ` · ${item.filterName}`}</p>
      </div>
      {item.daysOverdue != null && <Badge variant="destructive" className="text-[10px]">{item.daysOverdue} gün</Badge>}
      {item.daysUntilDue != null && !item.daysOverdue && <Badge variant="outline" className="text-[10px]">{item.daysUntilDue} gün</Badge>}
    </Link>
  );
}
