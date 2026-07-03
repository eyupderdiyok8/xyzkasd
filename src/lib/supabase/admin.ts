import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/** Service-role client — bypasses RLS. Use only in server-side trusted contexts. */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('[admin] Eksik env: NEXT_PUBLIC_SUPABASE_URL=%s, SUPABASE_SERVICE_ROLE_KEY=%s',
      url ? 'var' : 'YOK',
      key ? 'var' : 'YOK');
    throw new Error('SUPABASE_SERVICE_ROLE_KEY tanımlı değil. .env.local dosyasını kontrol edin.');
  }
  return createClient<Database>(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
