// ──────────────────────────────────────────────
// Water Purifier Service ERP — Supabase Admin Client Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('createAdminClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  it('creates a Supabase client with service role key', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-123';

    const { createAdminClient } = await import('../admin');
    const client = createAdminClient();

    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
    expect(typeof client.storage).toBe('object');
  });
});
