import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { ProfileRow } from '@/lib/supabase/types';
import MfaSetup from '@/components/MfaSetup';

export default async function SettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: _profile } = await supabase.from('profiles').select('*').eq('id', user!.id).single();
  const profile = _profile as ProfileRow | null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hesap Ayarları</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {profile?.full_name ?? profile?.email}
          {profile?.role ? ` · ${profile.role}` : ''}
        </p>
      </div>

      <MfaSetup />
    </div>
  );
}
