import { redirect } from 'next/navigation';
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
  if (profile.tenant_id) {
    const { data: _tenant } = await supabase
      .from('tenants')
      .select('membershipType, membershipExpiresAt')
      .eq('id', profile.tenant_id)
      .single();
    if (_tenant) {
      const row = _tenant as { membershipType?: string; membershipExpiresAt?: string | null };
      membershipType = (row.membershipType as MembershipType) ?? 'MONTHLY';
      membershipExpiresAt = row.membershipExpiresAt ?? null;
    }
  }

  return (
    <>
      <DashboardShell
        role={profile.role}
        membershipType={membershipType}
        membershipExpiresAt={membershipExpiresAt}
        fullName={profile.full_name}
        email={profile.email}
      >
        <MembershipBanner membershipType={membershipType} expiresAt={membershipExpiresAt} />
        {children}
      </DashboardShell>
      <OfflineBanner />
    </>
  );
}
