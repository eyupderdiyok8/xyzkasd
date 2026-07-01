'use client';

import { useEffect, useState } from 'react';

// ─── Types ─────────────────────────────────────

interface DashboardStats {
  todayServiceCount: number;
  todayServices: Array<{
    id: string;
    ticketNo: string;
    status: string;
    customer: { name: string; phone: string };
    technician: { name: string } | null;
    scheduledAt: string | null;
    createdAt: string;
  }>;
  upcomingMaintenanceCount: number;
  overdueMaintenanceCount: number;
}

interface TechnicianPerformance {
  technicianId: string;
  technicianName: string;
  totalServices: number;
  completedServices: number;
  avgScore: number;
  surveyCount: number;
}

interface MostChangedFilter {
  filterId: string;
  filterName: string;
  stage: string;
  changeCount: number;
}

interface MonthlyForecast {
  month: string;
  label: string;
  count: number;
}

interface SatisfactionSummary {
  total: number;
  responded: number;
  responseRate: number;
  avgScore: number;
  highScores: number;
  lowScores: number;
  distribution: Record<number, number>;
}

interface RevenueStats {
  totalRevenue: number;
  collectedToday: number;
  pendingAmount: number;
  overdueAmount: number;
  byMethod: Array<{ method: string; total: number; count: number }>;
  byTechnician: Array<{ technicianId: string; technicianName: string; total: number; count: number }>;
  monthlyRevenue: Array<{ month: string; total: number; count: number }>;
}

// ─── Helpers ────────────────────────────────────

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

const STAGE_LABELS: Record<string, string> = {
  SEDIMENT: 'Sediment',
  CARBON_BLOCK: 'Karbon Blok',
  GAC: 'Granül Karbon',
  MEMBRANE: 'Membran',
  POST_CARBON: 'Son Karbon',
  UV: 'UV',
  ALKALINE: 'Alkali',
  MINERAL: 'Mineral',
  OTHER: 'Diğer',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cls(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Bar Chart Component ───────────────────────

function BarChart({
  data,
  color = 'blue',
  maxBarHeight = 160,
}: {
  data: { label: string; value: number }[];
  color?: string;
  maxBarHeight?: number;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <div className="flex items-end gap-3" style={{ height: maxBarHeight + 24 }}>
      {data.map((item) => {
        const height = Math.max(8, (item.value / maxValue) * maxBarHeight);
        return (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-semibold text-muted-foreground">{item.value}</span>
            <div
              className={cls('w-full rounded-t', colorClasses[color] || 'bg-blue-500')}
              style={{ height }}
              title={`${item.label}: ${item.value}`}
            />
            <span className="text-xs text-gray-500 truncate w-full text-center" title={item.label}>
              {item.label.length > 12 ? item.label.slice(0, 10) + '..' : item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Star Display ──────────────────────────────

function StarRating({ score, max = 5 }: { score: number; max?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < Math.round(score) ? 'text-amber-400' : 'text-gray-200'}>
          ★
        </span>
      ))}
      <span className="ml-1 text-sm text-gray-600">({score.toFixed(1)})</span>
    </span>
  );
}

// ─── Tabs ───────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Pano' },
  { id: 'revenue', label: '💰 Finansal' },
  { id: 'technician', label: 'Teknisyen Performansı' },
  { id: 'satisfaction', label: 'Memnuniyet' },
  { id: 'filters', label: 'En Çok Değişen Filtreler' },
  { id: 'forecast', label: 'Bakım Tahmini' },
] as const;

type TabId = (typeof TABS)[number]['id'];

// ─── Page ───────────────────────────────────────

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Report data
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [techPerf, setTechPerf] = useState<TechnicianPerformance[]>([]);
  const [satisfaction, setSatisfaction] = useState<SatisfactionSummary | null>(null);
  const [topFilters, setTopFilters] = useState<MostChangedFilter[]>([]);
  const [forecast, setForecast] = useState<MonthlyForecast[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const params = new URLSearchParams({ type: activeTab });
    fetch(`/api/reports?${params}`, { signal: controller.signal })
      .then(async (r) => {
        const text = await r.text();
        try { return JSON.parse(text); }
        catch { throw new Error(text || 'Sunucudan geçersiz yanıt'); }
      })
      .then((json) => {
        if (json.error) { setError(json.error.message || 'Yüklenemedi'); return; }
        switch (activeTab) {
          case 'dashboard': setDashboardStats(json.data); break;
          case 'technician': setTechPerf(json.data ?? []); break;
          case 'satisfaction': setSatisfaction(json.data); break;
          case 'filters': setTopFilters(json.data ?? []); break;
          case 'forecast': setForecast(json.data ?? []); break;
          case 'revenue': setRevenueStats(json.data); break;
        }
      })
      .catch((err) => {
        if (err?.name === 'AbortError') setError('Rapor yüklenemedi (zaman aşımı)');
        else setError(err?.message || 'Sunucuya bağlanılamadı');
      })
      .finally(() => {
        clearTimeout(timer);
        setLoading(false);
      });
  }, [activeTab]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Raporlar</h1>
        <p className="mt-1 text-sm text-gray-500">
          Operasyonel raporlar ve performans analizi
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cls(
              'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-gray-400">Yükleniyor...</p>
        </div>
      ) : (
        <>
          {activeTab === 'dashboard' && dashboardStats && (
            <DashboardTab stats={dashboardStats} />
          )}
          {activeTab === 'revenue' && revenueStats && (
            <RevenueTab stats={revenueStats} />
          )}
          {activeTab === 'technician' && <TechnicianTab data={techPerf} />}
          {activeTab === 'satisfaction' && satisfaction && (
            <SatisfactionTab data={satisfaction} />
          )}
          {activeTab === 'filters' && <FiltersTab data={topFilters} />}
          {activeTab === 'forecast' && <ForecastTab data={forecast} />}
        </>
      )}
    </div>
  );
}

// ─── Dashboard Tab ──────────────────────────────

function DashboardTab({ stats }: { stats: DashboardStats }) {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-medium text-blue-700">Bugünkü Servisler</p>
          <p className="mt-1 text-3xl font-bold text-blue-900">{stats.todayServiceCount}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-medium text-amber-700">Yaklaşan Bakım (30 gün)</p>
          <p className="mt-1 text-3xl font-bold text-amber-900">{stats.upcomingMaintenanceCount}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <p className="text-sm font-medium text-red-700">Gecikmiş Bakım</p>
          <p className="mt-1 text-3xl font-bold text-red-900">{stats.overdueMaintenanceCount}</p>
        </div>
      </div>

      {/* Today's Services */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-foreground">Bugünkü Servisler</h3>
        {stats.todayServices.length === 0 ? (
          <div className="rounded-lg border border-border bg-white p-8 text-center">
            <p className="text-sm text-gray-500">Bugün henüz servis kaydı bulunmuyor.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.todayServices.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-border bg-white p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-blue-600">
                      {s.ticketNo}
                    </span>
                    <span
                      className={cls(
                        'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                        STATUS_COLORS[s.status] ?? '',
                      )}
                    >
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-foreground">{s.customer.name}</p>
                  {s.technician && (
                    <p className="text-xs text-gray-500">Teknisyen: {s.technician.name}</p>
                  )}
                </div>
                <span className="text-xs text-gray-400">{formatDate(s.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Technician Tab ─────────────────────────────

function TechnicianTab({ data }: { data: TechnicianPerformance[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white p-12 text-center">
        <p className="text-gray-500">Henüz teknisyen verisi bulunmuyor.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Teknisyen
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
              Toplam Servis
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
              Tamamlanan
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
              Tamamlama Oranı
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
              Anket Sayısı
            </th>
            <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
              Memnuniyet
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((t) => {
            const completionRate =
              t.totalServices > 0
                ? Math.round((t.completedServices / t.totalServices) * 100)
                : 0;
            return (
              <tr key={t.technicianId} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-foreground">
                  {t.technicianName}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-muted-foreground">
                  {t.totalServices}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-muted-foreground">
                  {t.completedServices}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-muted-foreground">
                  <span
                    className={cls(
                      'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                      completionRate >= 80
                        ? 'bg-green-100 text-green-800'
                        : completionRate >= 50
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800',
                    )}
                  >
                    %{completionRate}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm text-muted-foreground">
                  {t.surveyCount}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-center text-sm">
                  {t.surveyCount > 0 ? (
                    <StarRating score={t.avgScore} />
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Satisfaction Tab ───────────────────────────

function SatisfactionTab({ data }: { data: SatisfactionSummary }) {
  const distData = Object.entries(data.distribution).map(([score, count]) => ({
    label: `${score} Puan`,
    value: count,
  }));

  const maxDist = Math.max(...distData.map((d) => d.value), 1);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-5">
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Toplam Anket</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{data.total}</p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Yanıtlanan</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{data.responded}</p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4">
          <p className="text-xs font-medium text-gray-500">Yanıt Oranı</p>
          <p className="mt-1 text-2xl font-bold text-foreground">%{data.responseRate}</p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-xs font-medium text-green-700">Ort. Puan</p>
          <p className="mt-1 text-2xl font-bold text-green-900">{data.avgScore}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-xs font-medium text-red-700">Düşük Puan (≤2)</p>
          <p className="mt-1 text-2xl font-bold text-red-900">{data.lowScores}</p>
        </div>
      </div>

      {/* Score Distribution */}
      <div>
        <h3 className="mb-3 text-lg font-semibold text-foreground">Puan Dağılımı</h3>
        <div className="rounded-lg border border-border bg-white p-6">
          <div className="flex items-end gap-4" style={{ height: 180 }}>
            {distData.map((item) => {
              const height = Math.max(8, (item.value / maxDist) * 150);
              const isHigh = Number(item.label[0]) >= 4;
              const isLow = Number(item.label[0]) <= 2;
              return (
                <div key={item.label} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs font-semibold text-muted-foreground">{item.value}</span>
                  <div
                    className={cls(
                      'w-full rounded-t',
                      isHigh ? 'bg-green-500' : isLow ? 'bg-red-500' : 'bg-blue-500',
                    )}
                    style={{ height }}
                  />
                  <span className="text-xs text-gray-500">{item.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-700">
            Yüksek Memnuniyet (4-5 Puan)
          </p>
          <p className="mt-2 text-2xl font-bold text-green-900">{data.highScores}</p>
          <p className="mt-1 text-xs text-green-600">
            Müşterilerin %{
              data.responded > 0
                ? Math.round((data.highScores / data.responded) * 100)
                : 0
            }'ü yüksek puan verdi
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">Düşük Memnuniyet (1-2 Puan)</p>
          <p className="mt-2 text-2xl font-bold text-red-900">{data.lowScores}</p>
          <p className="mt-1 text-xs text-red-600">
            Müşterilerin %{
              data.responded > 0
                ? Math.round((data.lowScores / data.responded) * 100)
                : 0
            }'ü düşük puan verdi
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Filters Tab ────────────────────────────────

function FiltersTab({ data }: { data: MostChangedFilter[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white p-12 text-center">
        <p className="text-gray-500">Henüz filtre değişim verisi bulunmuyor.</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((f) => f.changeCount), 1);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        En sık değiştirilen filtreler — toplam değişim sayısına göre sıralı
      </p>

      <div className="space-y-3">
        {data.map((f, index) => {
          const barWidth = Math.max(8, (f.changeCount / maxCount) * 100);
          return (
            <div key={f.filterId} className="rounded-lg border border-border bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{f.filterName}</p>
                    <p className="text-xs text-gray-500">
                      {STAGE_LABELS[f.stage] ?? f.stage}
                    </p>
                  </div>
                </div>
                <span className="text-lg font-bold text-blue-700">{f.changeCount}</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-100">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Toplam değişimlerin %{Math.round((f.changeCount / maxCount) * 100)}'ü
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Forecast Tab ───────────────────────────────

function ForecastTab({ data }: { data: MonthlyForecast[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white p-12 text-center">
        <p className="text-gray-500">Tahmin verisi bulunmuyor.</p>
      </div>
    );
  }

  const totalForecast = data.reduce((sum, m) => sum + m.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
          <p className="text-sm font-medium text-blue-700">12 Aylık Toplam Tahmini</p>
          <p className="mt-1 text-3xl font-bold text-blue-900">{totalForecast}</p>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-5">
          <p className="text-sm font-medium text-indigo-700">Aylık Ortalama</p>
          <p className="mt-1 text-3xl font-bold text-indigo-900">
            {Math.round(totalForecast / Math.max(data.length, 1))}
          </p>
        </div>
        <div className="rounded-lg border border-green-200 bg-green-50 p-5">
          <p className="text-sm font-medium text-green-700">En Yoğun Ay</p>
          <p className="mt-1 text-3xl font-bold text-green-900">
            {Math.max(...data.map((m) => m.count))}
          </p>
          <p className="text-xs text-green-600">
            {data.find((m) => m.count === Math.max(...data.map((x) => x.count)))?.label}
          </p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Aylık Bakım Tahmini</h3>
        <BarChart
          data={data.map((m) => ({ label: m.label, value: m.count }))}
          color="blue"
        />
        <p className="mt-4 text-xs text-gray-400">
          Filtre ömrü ve kurulum tarihine göre hesaplanan tahmini bakım sayıları
        </p>
      </div>
    </div>
  );
}

// ─── Revenue Tab — FINANSAL 💰 ──────────────────

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Nakit',
  CREDIT_CARD: 'Kredi Kartı',
  BANK_TRANSFER: 'Banka Transferi',
  PROMISSORY_NOTE: 'Senet',
  DEFERRED: 'İleri Tarihli',
};

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  CASH: 'bg-emerald-500',
  CREDIT_CARD: 'bg-blue-500',
  BANK_TRANSFER: 'bg-violet-500',
  PROMISSORY_NOTE: 'bg-amber-500',
  DEFERRED: 'bg-rose-500',
};

function RevenueTab({ stats }: { stats: RevenueStats }) {
  const { totalRevenue, collectedToday, pendingAmount, overdueAmount, byMethod, byTechnician, monthlyRevenue } = stats;

  const grandTotal = byMethod.reduce((s, m) => s + m.total, 0) || 1;
  const months = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const maxMonthly = Math.max(...monthlyRevenue.map((m) => m.total), 1);

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ─────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <RevenueReportKpi title="Toplam Ciro" value={`${totalRevenue.toLocaleString('tr-TR')}₺`} color="blue" />
        <RevenueReportKpi title="Bugün Tahsil Edilen" value={`${collectedToday.toLocaleString('tr-TR')}₺`} color="emerald" />
        <RevenueReportKpi title="Bekleyen Ödemeler" value={`${pendingAmount.toLocaleString('tr-TR')}₺`} color="amber" warn={pendingAmount > 0} />
        <RevenueReportKpi title="Gecikmiş Alacaklar" value={`${overdueAmount.toLocaleString('tr-TR')}₺`} color="red" warn={overdueAmount > 0} />
      </div>

      {/* ── Charts Row ────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Payment Method Distribution */}
        <div className="rounded-lg border border-border bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Ödeme Yöntemi Dağılımı</h3>
          {byMethod.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Henüz veri yok</p>
          ) : (
            <div className="space-y-4">
              {byMethod.map((m) => {
                const pct = Math.round((m.total / grandTotal) * 100);
                return (
                  <div key={m.method} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {PAYMENT_METHOD_LABELS[m.method] ?? m.method}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {m.total.toLocaleString('tr-TR')}₺ ({m.count} işlem)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 flex-1 rounded-full bg-gray-100">
                        <div
                          className={`h-3 rounded-full ${PAYMENT_METHOD_COLORS[m.method] ?? 'bg-gray-400'}`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <span className="w-10 text-right text-xs font-semibold tabular-nums text-gray-500">
                        %{pct}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Technician Revenue */}
        <div className="rounded-lg border border-border bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Teknisyen Bazlı Ciro</h3>
          {byTechnician.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Henüz veri yok</p>
          ) : (
            <div className="space-y-3">
              {byTechnician.map((t) => {
                const maxTech = Math.max(...byTechnician.map((x) => x.total), 1);
                const barW = Math.max(4, (t.total / maxTech) * 100);
                return (
                  <div key={t.technicianId} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">{t.technicianName}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {t.total.toLocaleString('tr-TR')}₺ ({t.count} servis)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${barW}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Monthly Revenue Chart ──────────────── */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Aylık Gelir Grafiği</h3>
        {monthlyRevenue.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">Henüz gelir verisi yok</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-3" style={{ minHeight: 180, height: 180 }}>
              {monthlyRevenue.map((m) => {
                const monthIdx = parseInt(m.month.split('-')[1], 10) - 1;
                const label = months[monthIdx] ?? m.month;
                const barH = Math.max(8, (m.total / maxMonthly) * 150);

                return (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-1 min-w-[40px]">
                    <span className="text-[10px] font-semibold text-gray-500">
                      {m.total >= 1000 ? `${(m.total / 1000).toFixed(0)}K` : m.total}
                    </span>
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-blue-600 to-blue-400"
                      style={{ height: barH }}
                      title={`${m.month}: ${m.total.toLocaleString('tr-TR')}₺ (${m.count} işlem)`}
                    />
                    <span className="text-[10px] text-gray-400">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-gray-400">
          Tahsil edilen ödemelerin aylık dağılımı (bekleyen ve gecikmiş ödemeler hariç)
        </p>
      </div>

      {/* ── Quick Summary ──────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-700">Ortalama Servis Geliri</p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">
            {byMethod.reduce((s, m) => s + m.count, 0) > 0
              ? `${Math.round(totalRevenue / byMethod.reduce((s, m) => s + m.count, 0)).toLocaleString('tr-TR')}₺`
              : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-medium text-blue-700">Toplam İşlem</p>
          <p className="mt-2 text-2xl font-bold text-blue-900">
            {byMethod.reduce((s, m) => s + m.count, 0)}
          </p>
        </div>
        <div className={`rounded-lg border p-4 ${overdueAmount > 0 ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`text-sm font-medium ${overdueAmount > 0 ? 'text-red-700' : 'text-gray-500'}`}>
            Tahsilat Oranı
          </p>
          <p className={`mt-2 text-2xl font-bold ${overdueAmount > 0 ? 'text-red-900' : 'text-gray-400'}`}>
            {totalRevenue + pendingAmount + overdueAmount > 0
              ? `%${Math.round((totalRevenue / (totalRevenue + pendingAmount + overdueAmount)) * 100)}`
              : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

function RevenueReportKpi({ title, value, color, warn }: { title: string; value: string; color: string; warn?: boolean }) {
  const bgMap: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    amber: 'border-amber-200 bg-amber-50',
    red: 'border-red-200 bg-red-50',
  };
  const textMap: Record<string, string> = {
    blue: 'text-blue-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
  };
  const valMap: Record<string, string> = {
    blue: 'text-blue-900',
    emerald: 'text-emerald-900',
    amber: warn ? 'text-amber-900' : 'text-gray-900',
    red: warn ? 'text-red-900' : 'text-gray-900',
  };

  return (
    <div className={`rounded-lg border p-5 ${warn ? bgMap[color]?.replace('bg-', 'border-').replace('50', '200') + ' ' + bgMap[color] : 'border-border bg-white'}`}>
      <p className={`text-sm font-medium ${warn ? textMap[color] : 'text-gray-500'}`}>{title}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${warn ? valMap[color] : 'text-foreground'}`}>{value}</p>
    </div>
  );
}
