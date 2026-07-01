import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ROLE_HIERARCHY } from '@/lib/roles';
import type { ProfileRow, UserRole } from '@/lib/supabase/types';
import WhatsAppSettings from './WhatsAppSettings';

export default async function AdminWhatsAppPage() {
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WhatsApp Bağlantısı</h1>
          <p className="mt-1 text-sm text-gray-500">
            WhatsApp Web üzerinden işletme numaranızı bağlayın. Müşterilere bakım
            hatırlatmaları ve servis bildirimleri bu numaradan gönderilir.
          </p>
        </div>
      </div>

      <WhatsAppSettings />
    </div>
  );
}
