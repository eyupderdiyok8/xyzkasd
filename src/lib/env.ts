/**
 * Validates that critical environment variables are set at startup.
 * Call this in the root layout or middleware to prevent cryptic runtime errors.
 */
export function validateEnv(): { ok: boolean; missing: string[] } {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];

  const optional = [
    'SUPABASE_SERVICE_ROLE_KEY', // required for admin operations (invite, user management)
    'DATABASE_URL',              // required for Prisma
    'GOOGLE_REVIEW_URL',         // Google Review link for survey high-score responses
  ];

  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  for (const key of optional) {
    if (!process.env[key]) {
      console.warn(`[env] Optional env var ${key} is not set — some features may not work`);
    }
  }

  if (missing.length > 0) {
    console.error(`[env] Missing required env vars: ${missing.join(', ')}`);
    return { ok: false, missing };
  }

  return { ok: true, missing: [] };
}
