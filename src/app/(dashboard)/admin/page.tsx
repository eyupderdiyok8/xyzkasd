import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ROLE_LABELS, ROLE_HIERARCHY } from '@/lib/roles';
import { PLAN_LABELS, PLAN_COLORS, type PlanType } from '@/lib/features';
import { redirect } from 'next/navigation';
import type { ProfileRow, UserRole } from '@/lib/supabase/types';
import UserManagement from './UserManagement';
import PlanManagement from './PlanManagement';
import TenantManagement from '@/components/TenantManagement';
import TenantSettings from '@/components/TenantSettings';
import DefaultSurveyMessageEditor from '@/components/DefaultSurveyMessageEditor';

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

  // Fetch tenant plan
  let plan: PlanType = 'STARTER';
  if (profile.tenant_id) {
    const { data: _tenant } = await supabase
      .from('tenants')
      .select('plan')
      .eq('id', profile.tenant_id)
      .single();
    if (_tenant) {
      plan = (_tenant as { plan: PlanType }).plan ?? 'STARTER';
    }
  }
  const planColorClass = PLAN_COLORS[plan] ?? 'bg-gray-100 text-foreground';

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kullanıcıları, rolleri ve firmaları yönetin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${planColorClass}`}>
            {PLAN_LABELS[plan]}
          </span>
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
            {roleLabel}
          </span>
        </div>
      </div>

      <UserManagement currentRole={role} />
      <TenantSettings />
      {role === 'super_admin' && <DefaultSurveyMessageEditor />}
      {role === 'super_admin' && <TenantManagement />}
      <PlanManagement />
    </div>
  );
}
