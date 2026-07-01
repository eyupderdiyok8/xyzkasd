import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PLAN_LABELS, type PlanType } from '@/lib/features';
import type { ProfileRow } from '@/lib/supabase/types';
import DashboardShell from './DashboardShell';
import OfflineBanner from '@/components/OfflineBanner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: _profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  const profile = _profile as ProfileRow | null;
  if (!profile) redirect('/login');

  let plan: PlanType = 'STARTER';
  if (profile.tenant_id) {
    const { data: _tenant } = await supabase.from('tenants').select('plan').eq('id', profile.tenant_id).single();
    if (_tenant) plan = (_tenant as { plan: PlanType }).plan ?? 'STARTER';
  }

  return (
    <>
      <DashboardShell role={profile.role} plan={plan} fullName={profile.full_name} email={profile.email}>
        {children}
      </DashboardShell>
      <OfflineBanner />
    </>
  );
}
