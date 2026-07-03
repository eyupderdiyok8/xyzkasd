import { createServerSupabaseClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { ROLE_LABELS, ROLE_HIERARCHY } from '@/lib/roles';
import { MEMBERSHIP_LABELS, MEMBERSHIP_COLORS, FOUNDER_BADGE, isMembershipActive, formatRemainingDays, getRemainingDays, type MembershipType } from '@/lib/features';
import { redirect } from 'next/navigation';
import type { ProfileRow, UserRole } from '@/lib/supabase/types';
import UserManagement from './UserManagement';
import PlanManagement from './PlanManagement';
import TenantManagement from '@/components/TenantManagement';
import TenantSettings from '@/components/TenantSettings';
import DefaultSurveyMessageEditor from '@/components/DefaultSurveyMessageEditor';
import BackupExport from '@/components/BackupExport';
import DataImport from '@/components/DataImport';
import MembershipAssigner from '@/components/MembershipAssigner';
import WidgetSettings from '@/components/WidgetSettings';
import AdminTabs, { type AdminSection } from './AdminTabs';

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: _profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  const profile = _profile as ProfileRow | null;
  if (!profile) redirect('/login');

  const role = profile.role as UserRole;
  // Defense-in-depth: verify user has at least tenant_admin role
  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY['tenant_admin']) {
    redirect('/dashboard?error=forbidden');
  }
  const roleLabel = ROLE_LABELS[role] ?? role;
  const isSuperAdmin = role === 'super_admin';
  let effectiveTenantId = profile.tenant_id;
  if (isSuperAdmin) {
    const cookieStore = await cookies();
    const tenantCtx = cookieStore.get('tenant_ctx')?.value;
    effectiveTenantId = tenantCtx && tenantCtx !== 'all' ? tenantCtx : null;
  }

  // Tenant bilgisi yoksa erken dön — super_admin için sorun değil, tenant_admin için uyarı
  if (!profile.tenant_id && !isSuperAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-6 w-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Firma Ataması Eksik</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Kullanıcı hesabınız henüz bir firmaya bağlanmamış.
            Süper admin&apos;in sizi bir firmaya ataması gerekiyor.
          </p>
        </div>
      </div>
    );
  }

  // Fetch tenant membership info
  let membershipType: MembershipType | null = null;
  let membershipExpiresAt: string | null = null;
  let membershipLabel = isSuperAdmin && !effectiveTenantId ? 'Tüm firmalar' : 'Aylık';
  let membershipActive = false;
  let remainingLabel = '';
  let membershipColorClass = 'bg-gray-100 text-foreground';

  let tenantName = '';
  let tenantSlug = '';
  if (effectiveTenantId) {
    const { data: _tenant } = await supabase
      .from('tenants')
      .select('name, slug, membershipType, membershipExpiresAt')
      .eq('id', effectiveTenantId)
      .single();
    if (_tenant) {
      const row = _tenant as { name?: string; slug?: string; membershipType?: string; membershipExpiresAt?: string | null };
      tenantName = row.name ?? '';
      tenantSlug = row.slug ?? '';
      membershipType = (row.membershipType as MembershipType) ?? 'MONTHLY';
      membershipExpiresAt = row.membershipExpiresAt ?? null;
      membershipActive = isMembershipActive(membershipType, membershipExpiresAt);
      membershipLabel = membershipType === 'FOUNDER'
        ? `${FOUNDER_BADGE} ${MEMBERSHIP_LABELS[membershipType]}`
        : MEMBERSHIP_LABELS[membershipType];
      remainingLabel = formatRemainingDays(
        membershipType === 'FOUNDER' ? Infinity : getRemainingDays(membershipExpiresAt)
      );
      membershipColorClass = membershipActive
        ? (MEMBERSHIP_COLORS[membershipType] ?? 'bg-gray-100 text-foreground')
        : 'bg-red-100 text-red-800';
    }
  }

  const sections: AdminSection[] = [
    {
      id: 'users',
      title: 'Kullanıcılar',
      description: 'Ekip üyelerini, rollerini ve erişimlerini yönetin.',
      children: <UserManagement currentRole={role} />,
    },
    {
      id: 'company',
      title: 'Firma Ayarları',
      description: 'Firma bilgileri, logo, uygulama teması, PDF rapor ve güvenlik ayarları.',
      children: <TenantSettings />,
    },
    {
      id: 'widget',
      title: 'Widget',
      description: 'Web sitenizde görünen servis talep widget ayarları ve önizlemesi.',
      children: <WidgetSettings />,
    },
    {
      id: 'data',
      title: 'Veri İşlemleri',
      description: 'Yedek alma ve veri içe aktarma işlemlerini buradan yapın.',
      children: (
        <>
          <BackupExport />
          <DataImport />
        </>
      ),
    },
    {
      id: 'membership',
      title: 'Üyelik',
      description: 'Firmanın üyelik durumunu ve plan bilgisini yönetin.',
      children: (
        <>
          {role === 'super_admin' && <MembershipAssigner />}
          <PlanManagement
            tenantId={effectiveTenantId}
            tenantName={tenantName}
            tenantSlug={tenantSlug}
            membershipType={membershipType}
            membershipLabel={membershipLabel}
            membershipExpiresAt={membershipExpiresAt}
            isActive={membershipActive}
            remainingLabel={remainingLabel}
          />
        </>
      ),
    },
  ];

  if (role === 'super_admin') {
    sections.push({
      id: 'system',
      title: 'Sistem',
      description: 'Tüm firmalar ve varsayılan sistem mesajları.',
      children: (
        <>
          <TenantManagement />
          <DefaultSurveyMessageEditor />
        </>
      ),
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-lg border border-border bg-card p-5 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Paneli</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tenantName ? `${tenantName} ayarlarını yönetiyorsunuz.` : 'Kullanıcıları, firma ayarlarını ve sistem işlemlerini yönetin.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${membershipColorClass}`}>
              {membershipLabel}
            </span>
            {membershipActive && membershipType !== 'FOUNDER' && (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {remainingLabel}
              </span>
            )}
            <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
              {roleLabel}
            </span>
          </div>
        </div>
      </div>

      <AdminTabs sections={sections} />
    </div>
  );
}
