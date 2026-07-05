import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { MembershipType } from '@/lib/features';
import type { ProfileRow } from '@/lib/supabase/types';
import DashboardShell from './DashboardShell';
import OfflineBanner from '@/components/OfflineBanner';
import MembershipBanner from '@/components/MembershipBanner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: _profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const profile = _profile as ProfileRow | null;
  if (!profile) redirect('/login');

  let membershipType: MembershipType | null = null;
  let membershipExpiresAt: string | null = null;
  let themeConfig: string | null = null;
  let effectiveTenantId = profile.tenant_id;

  if (profile.role === 'super_admin') {
    const cookieStore = await cookies();
    const tenantCtx = cookieStore.get('tenant_ctx')?.value;
    effectiveTenantId = tenantCtx && tenantCtx !== 'all' ? tenantCtx : null;
  }

  if (effectiveTenantId) {
    let { data: _tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('membershipType, membershipExpiresAt, themeConfig')
      .eq('id', effectiveTenantId)
      .single();

    if (tenantError && String(tenantError.message).includes('themeConfig')) {
      const retry = await supabase
        .from('tenants')
        .select('membershipType, membershipExpiresAt')
        .eq('id', effectiveTenantId)
        .single();
      _tenant = retry.data;
    }

    if (_tenant) {
      const row = _tenant as { membershipType?: string; membershipExpiresAt?: string | null; themeConfig?: string | null };
      membershipType = (row.membershipType as MembershipType) ?? 'MONTHLY';
      membershipExpiresAt = row.membershipExpiresAt ?? null;
      themeConfig = row.themeConfig ?? null;
    }
  }

  return (
    <>
      <DashboardShell
        role={profile.role}
        membershipType={membershipType}
        membershipExpiresAt={membershipExpiresAt}
        themeConfig={themeConfig}
        fullName={profile.full_name}
        email={profile.email}
        userId={user.id}
        tenantId={profile.tenant_id}
        effectiveTenantId={effectiveTenantId}
      >
        <MembershipBanner membershipType={membershipType} expiresAt={membershipExpiresAt} />
        {children}
      </DashboardShell>
      <OfflineBanner />
    </>
  );
}
