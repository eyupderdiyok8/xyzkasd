import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ProfileRow } from '@/lib/supabase/types';
import MaintenanceReminders from '@/components/MaintenanceReminders';
import OverdueQueue from '@/components/OverdueQueue';
import DashboardStats from '@/components/DashboardStats';
import RevenueStats from '@/components/RevenueStats';
import QuickActions from '@/components/QuickActions';
import { Activity, Shield, User } from 'lucide-react';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: _profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
  const profile = _profile as ProfileRow | null;
  const displayName = profile?.full_name ?? profile?.email?.split('@')[0] ?? 'Kullanıcı';

  // Revenue stats are shown for manager+ roles
  const canSeeRevenue = profile?.role && ['manager', 'tenant_admin', 'super_admin'].includes(profile.role);

  return (
    <div className="space-y-6 animate-fade-in">
      {searchParams.error === 'forbidden' && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Bu sayfaya erişim yetkiniz bulunmuyor.
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Hoş geldin, {displayName}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {profile?.tenant_id ? 'Firmaya bağlı' : 'Süper Admin'} · {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Revenue Stats (manager+) — the most important part! 💰 */}
      {canSeeRevenue && <RevenueStats />}

      {/* Top row: Stats + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DashboardStats />
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Bottom row: Maintenance + Overdue */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Bakım Hatırlatmaları</h2>
          <MaintenanceReminders />
        </div>
        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Gecikmiş Bakım Kuyruğu</h2>
          <OverdueQueue />
        </div>
      </div>

      {/* Account tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile icon={<Shield className="h-4 w-4" />} label="Rol" value={profile?.role ?? '—'} />
        <Tile icon={<Activity className="h-4 w-4" />} label="Hesap" value={profile?.is_active ? 'Aktif' : 'Pasif'} />
        <Tile icon={<User className="h-4 w-4" />} label="Firma" value={profile?.tenant_id ? 'Atanmış' : 'Yok'} />
      </div>
    </div>
  );
}

function Tile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-white p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        {icon}
      </div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
