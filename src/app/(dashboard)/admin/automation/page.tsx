import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ROLE_LABELS, ROLE_HIERARCHY } from '@/lib/roles';
import { redirect } from 'next/navigation';
import type { ProfileRow, UserRole } from '@/lib/supabase/types';
import AutomationRules from './AutomationRules';

export const metadata = {
  title: 'Otomasyon Kuralları',
};

export default async function AutomationPage() {
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
  if (ROLE_HIERARCHY[role] < ROLE_HIERARCHY['manager']) {
    redirect('/dashboard?error=forbidden');
  }
  const roleLabel = ROLE_LABELS[role] ?? role;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Otomasyon Kuralları</h1>
          <p className="mt-1 text-sm text-gray-500">
            Event-driven otomasyon motoru — tetikleyici → koşul → aksiyon
          </p>
        </div>
        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
          {roleLabel}
        </span>
      </div>

      <AutomationRules />
    </div>
  );
}
