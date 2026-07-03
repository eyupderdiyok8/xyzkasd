'use client';

import { useEffect, useState } from 'react';
import type { RevenueStatsData } from '@/lib/dashboard-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Banknote, Clock, AlertTriangle, TrendingUp, Wallet, CreditCard, Landmark, FileText, Calendar } from 'lucide-react';

// ─── Types ──────────────────────────────────────

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Nakit',
  CREDIT_CARD: 'Kredi Kartı',
  BANK_TRANSFER: 'Banka Transferi',
  PROMISSORY_NOTE: 'Senet',
  DEFERRED: 'İleri Tarihli',
};

const METHOD_ICONS: Record<string, React.ReactNode> = {
  CASH: <Wallet className="h-4 w-4" />,
  CREDIT_CARD: <CreditCard className="h-4 w-4" />,
  BANK_TRANSFER: <Landmark className="h-4 w-4" />,
  PROMISSORY_NOTE: <FileText className="h-4 w-4" />,
  DEFERRED: <Calendar className="h-4 w-4" />,
};

const METHOD_COLORS: Record<string, string> = {
  CASH: 'bg-emerald-500',
  CREDIT_CARD: 'bg-blue-500',
  BANK_TRANSFER: 'bg-violet-500',
  PROMISSORY_NOTE: 'bg-amber-500',
  DEFERRED: 'bg-rose-500',
};

// ─── Mini Bar Chart (pure SVG) ──────────────────

function MonthlyBarChart({ data }: { data: Array<{ month: string; total: number; count: number }> }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Henüz gelir verisi yok</p>;
  }

  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const h = 120;
  const w = data.length * 52;
  const barW = 36;
  const gap = 16;

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(w, 200)} height={h + 24} className="mx-auto block">
        {data.map((d, i) => {
          const monthIdx = parseInt(d.month.split('-')[1], 10) - 1;
          const label = months[monthIdx] ?? d.month;
          const barH = Math.max((d.total / maxVal) * h, 2);
          const x = i * (barW + gap);
          const y = h - barH;

          return (
            <g key={d.month}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={4}
                className="fill-primary opacity-80"
              />
              {/* Value */}
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px] font-medium"
              >
                {d.total.toLocaleString('tr-TR')}₺
              </text>
              {/* Month label */}
              <text
                x={x + barW / 2}
                y={h + 16}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Payment Method Breakdown ───────────────────

function MethodBreakdown({ byMethod }: { byMethod: Array<{ method: string; total: number; count: number }> }) {
  const grandTotal = byMethod.reduce((s, m) => s + m.total, 0) || 1;

  return (
    <div className="space-y-3">
      {byMethod.length === 0 && (
        <p className="text-sm text-muted-foreground">Henüz tahsilat verisi yok</p>
      )}
      {byMethod.map((m) => {
        const pct = Math.round((m.total / grandTotal) * 100);
        return (
          <div key={m.method} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="text-muted-foreground">{METHOD_ICONS[m.method] ?? null}</span>
                {METHOD_LABELS[m.method] ?? m.method}
              </span>
              <span className="font-medium tabular-nums text-card-foreground">
                {m.total.toLocaleString('tr-TR')}₺
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${METHOD_COLORS[m.method] ?? 'bg-slate-400'}`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
              <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────

export default function RevenueStats({ initialData }: { initialData?: RevenueStatsData }) {
  const [data, setData] = useState<RevenueStatsData | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) return;
    fetch('/api/reports?type=revenue')
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error.message);
        else setData(j.data);
      })
      .catch(() => setError('Sunucuya bağlanılamadı'))
      .finally(() => setLoading(false));
  }, [initialData]);

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-5 shadow-card">
        <Skeleton className="mb-4 h-5 w-36" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { totalRevenue, collectedToday, pendingAmount, overdueAmount, byMethod, monthlyRevenue } = data;

  return (
    <section className="rounded-lg border border-border bg-card shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-card-foreground">Finans Özeti</h2>
          <p className="mt-1 text-xs text-muted-foreground">Tahsilat ve ödeme dağılımını tek bakışta görün.</p>
        </div>
        <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {totalRevenue.toLocaleString('tr-TR')}₺ toplam
        </div>
      </div>

      <div className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RevenueKpi
            title="Bugünkü Tahsilat"
            value={`${collectedToday.toLocaleString('tr-TR')}₺`}
            icon={<TrendingUp className="h-4 w-4" />}
            color="emerald"
          />
          <RevenueKpi
            title="Bekleyen Ödemeler"
            value={`${pendingAmount.toLocaleString('tr-TR')}₺`}
            icon={<Clock className="h-4 w-4" />}
            color="amber"
            warn={pendingAmount > 0}
          />
          <RevenueKpi
            title="Gecikmiş Alacaklar"
            value={`${overdueAmount.toLocaleString('tr-TR')}₺`}
            icon={<AlertTriangle className="h-4 w-4" />}
            color="red"
            warn={overdueAmount > 0}
          />
          <RevenueKpi
            title="Toplam Gelir"
            value={`${totalRevenue.toLocaleString('tr-TR')}₺`}
            icon={<Banknote className="h-4 w-4" />}
            color="blue"
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Ödeme Yöntemine Göre</h3>
          <MethodBreakdown byMethod={byMethod} />
          </div>

          <div className="border-t border-border pt-5 lg:col-span-3 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <h3 className="mb-4 text-sm font-semibold text-card-foreground">Aylık Gelir</h3>
          <MonthlyBarChart data={monthlyRevenue} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── KPI Card ───────────────────────────────────

function RevenueKpi({
  title,
  value,
  icon,
  color,
  warn,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'amber' | 'red';
  warn?: boolean;
}) {
  const bgMap = {
    blue: 'bg-primary/10 text-primary',
    emerald: 'bg-success/10 text-success',
    amber: 'bg-warning/10 text-warning',
    red: 'bg-destructive/10 text-destructive',
  };
  const valMap = {
    blue: 'text-card-foreground',
    emerald: 'text-success',
    amber: warn ? 'text-warning' : 'text-card-foreground',
    red: warn ? 'text-destructive' : 'text-card-foreground',
  };

  return (
    <div
      className={`rounded-lg p-3 transition-colors ${
        warn ? 'bg-warning/5' : 'bg-muted/40'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bgMap[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className={`text-xl font-bold tabular-nums ${valMap[color]}`}>{value}</p>
        </div>
      </div>
    </div>
  );
}
