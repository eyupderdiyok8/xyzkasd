import { Suspense } from 'react';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ROLE_LABELS } from '@/lib/roles';
import type { ProfileRow } from '@/lib/supabase/types';
import { DashboardStats, MaintenanceReminders, OverdueQueue } from '@/components/dashboard-client-barrel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ERROR_MESSAGES: Record<string, string> = {
  forbidden: 'Bu sayfaya erişim yetkiniz bulunmuyor.',
  plan_upgrade: 'Bu özellik yalnızca Professional planında kullanılabilir.',
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: _profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single();

  const profile = _profile as ProfileRow | null;
  const errorMessage = sp.error ? ERROR_MESSAGES[sp.error] ?? null : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Error banner */}
      {errorMessage && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
          {errorMessage}
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gösterge Paneli</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hoş geldiniz, {profile?.full_name ?? profile?.email}
          </p>
        </div>
        {profile?.tenant_id && (
          <Badge variant="outline" className="text-xs">
            {profile.tenant_id ? 'Firma Aktif' : 'Firma Atanmamış'}
          </Badge>
        )}
      </div>

      {/* Dashboard Stats — bento grid */}
      <Suspense fallback={<div className="h-32 animate-pulse rounded-xl bg-muted" />}>
        <DashboardStats />
      </Suspense>

      {/* Bento grid: Maintenance + Overdue side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="animate-fade-up [animation-delay:100ms]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bakım Hatırlatmaları</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-20 animate-pulse rounded-lg bg-muted" />}>
              <MaintenanceReminders />
            </Suspense>
          </CardContent>
        </Card>

        <Card className="animate-fade-up [animation-delay:200ms]">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Gecikmiş Bakım Kuyruğu</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="h-20 animate-pulse rounded-lg bg-muted" />}>
              <OverdueQueue />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      {/* Account info cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile
          title="Rolünüz"
          value={profile?.role ? ROLE_LABELS[profile.role] : '—'}
          description="Sistem erişim seviyeniz"
          delay="300ms"
        />
        <StatTile
          title="Organizasyon"
          value={profile?.tenant_id ? 'Atanmış' : 'Yok'}
          description="Bağlı olduğunuz firma"
          delay="400ms"
        />
        <StatTile
          title="Hesap Durumu"
          value={profile?.is_active ? 'Aktif' : 'Pasif'}
          description={profile?.is_active ? 'Hesabınız aktif' : 'Yöneticinizle iletişime geçin'}
          variant={profile?.is_active ? 'success' : 'danger'}
          delay="500ms"
        />
      </div>
    </div>
  );
}

function StatTile({
  title,
  value,
  description,
  variant = 'default',
  delay,
}: {
  title: string;
  value: string;
  description: string;
  variant?: 'default' | 'success' | 'danger';
  delay?: string;
}) {
  const valueColor =
    variant === 'success' ? 'text-success' :
    variant === 'danger' ? 'text-destructive' :
    'text-foreground';

  return (
    <Card
      className="animate-scale-in"
      style={{ animationDelay: delay }}
    >
      <CardContent className="p-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
        <p className={`mt-2 text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
