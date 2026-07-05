import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import type { ProfileRow } from '@/lib/supabase/types';
import type { UserRole } from '@/lib/supabase/types';
import { ROLE_LABELS } from '@/lib/roles';
import { loadDashboardStats, loadMaintenanceReminders, loadOverdueQueue, loadRevenueStats } from '@/lib/dashboard-data';
import MaintenanceReminders from '@/components/MaintenanceReminders';
import OverdueQueue from '@/components/OverdueQueue';
import DashboardStats from '@/components/DashboardStats';
import RevenueStats from '@/components/RevenueStats';
import QuickActions from '@/components/QuickActions';
import { AlertTriangle, CalendarDays, CheckCircle2, Sparkles } from 'lucide-react';

const EMPTY_DASHBOARD_STATS = {
  todayServiceCount: 0,
  todayServices: [],
  upcomingMaintenanceCount: 0,
  overdueMaintenanceCount: 0,
};

const EMPTY_MAINTENANCE_REMINDERS = {
  upcoming15Count: 0,
  upcoming7Count: 0,
  overdueCount: 0,
  upcoming15: [],
  upcoming7: [],
  overdue: [],
};

const EMPTY_REVENUE_STATS = {
  totalRevenue: 0,
  collectedToday: 0,
  pendingAmount: 0,
  overdueAmount: 0,
  byMethod: [],
  byTechnician: [],
  monthlyRevenue: [],
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: _profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
  const profile = _profile as ProfileRow | null;
  const displayName = profile?.full_name ?? profile?.email?.split('@')[0] ?? 'Kullanıcı';
  const canSeeRevenue = profile?.role && ['manager', 'tenant_admin', 'super_admin'].includes(profile.role);
  const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });

  let effectiveTenantId = profile?.tenant_id ?? null;
  if (profile?.role === 'super_admin') {
    const cookieStore = await cookies();
    const tenantCtx = cookieStore.get('tenant_ctx')?.value;
    effectiveTenantId = tenantCtx && tenantCtx !== 'all' ? tenantCtx : null;
  }

  let tenantName: string | null = null;
  if (effectiveTenantId) {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', effectiveTenantId)
      .single();
    tenantName = (tenant as { name?: string } | null)?.name ?? null;
  }

  // Fetch ALL dashboard data in parallel on the server — single Prisma roundtrip batch
  const [stats, reminders, queue, revenue] = effectiveTenantId
    ? await Promise.all([
        loadDashboardStats(effectiveTenantId),
        loadMaintenanceReminders(effectiveTenantId),
        loadOverdueQueue(effectiveTenantId),
        canSeeRevenue ? loadRevenueStats(effectiveTenantId) : null,
      ])
    : [null, null, null, null];

  const todayServiceCount = stats?.todayServiceCount ?? 0;
  const overdueMaintenanceCount = stats?.overdueMaintenanceCount ?? 0;
  const pendingAmount = revenue?.pendingAmount ?? 0;
  const hasAttention = overdueMaintenanceCount > 0 || pendingAmount > 0 || (queue?.length ?? 0) > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-fade-in">
      {sp.error === 'forbidden' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Bu sayfaya erişim yetkiniz bulunmuyor.
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-card">
        <div className="grid gap-0 lg:grid-cols-[1.6fr_1fr]">
          <div className="p-5 md:p-6">
            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {tenantName ?? (profile?.role === 'super_admin' ? 'Tüm firmalar' : 'Firma seçilmedi')}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                <CalendarDays className="h-3.5 w-3.5" />
                {today}
              </span>
              <span className="rounded-full bg-muted px-2.5 py-1">
                {profile?.role ? ROLE_LABELS[profile.role] : 'Kullanıcı'}
              </span>
            </div>

            <div className="max-w-2xl">
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Hoş geldin, {displayName}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Bugünün işlerini, geciken bakımları ve tahsilat durumunu tek ekranda toparladım.
              </p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <HeroMetric label="Bugünkü servis" value={todayServiceCount} tone="primary" />
              <HeroMetric label="Gecikmiş bakım" value={overdueMaintenanceCount} tone={overdueMaintenanceCount > 0 ? 'danger' : 'success'} />
              <HeroMetric label="Kuyrukta bekleyen" value={queue?.length ?? 0} tone={(queue?.length ?? 0) > 0 ? 'warning' : 'success'} />
            </div>
          </div>

          <div className="border-t border-border bg-muted/40 p-5 md:p-6 lg:border-l lg:border-t-0">
            <div className="mb-4 flex items-center gap-2">
              {hasAttention ? (
                <AlertTriangle className="h-5 w-5 text-warning" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-success" />
              )}
              <h2 className="text-sm font-semibold text-foreground">Öncelik</h2>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              {hasAttention
                ? 'Gecikmiş işler veya bekleyen tahsilatlar var. Önce sağdaki hızlı işlemlerden servis ve stok akışını kontrol edebilirsin.'
                : 'Operasyon sakin görünüyor. Yeni servis veya müşteri ekleyerek güne hızlı başlayabilirsin.'}
            </p>
            <div className="mt-5">
              <QuickActions role={profile?.role as UserRole | undefined} />
            </div>
          </div>
        </div>
      </section>

      {!effectiveTenantId && (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
          Verileri görmek için üst menüden bir firma seçin.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]">
        <div className="space-y-6">
          <DashboardStats initialData={stats ?? EMPTY_DASHBOARD_STATS} />
          {canSeeRevenue && <RevenueStats initialData={revenue ?? EMPTY_REVENUE_STATS} />}
        </div>

        <div className="space-y-6">
          <Panel title="Bakım Hatırlatmaları">
            <MaintenanceReminders initialData={reminders ?? EMPTY_MAINTENANCE_REMINDERS} />
          </Panel>
          <Panel title="Gecikmiş Bakım Kuyruğu">
            <OverdueQueue initialData={queue ?? []} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const toneClass = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    danger: 'text-destructive bg-destructive/10',
  }[tone];

  return (
    <div className="border-l border-border py-1 pl-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-2 inline-flex rounded-md px-2 py-1 text-2xl font-bold tabular-nums ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-card-foreground">{title}</h2>
      </div>
      <div>
        {children}
      </div>
    </section>
  );
}
