// ──────────────────────────────────────────────
// Water Purifier Service ERP — Env Validation Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, beforeEach } from 'vitest';
import { validateEnv } from '../env';

const ORIGINAL_ENV = process.env;

describe('validateEnv', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('returns ok when all required vars are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role';
    process.env.DATABASE_URL = 'postgres://localhost:5432/db';
    process.env.GOOGLE_REVIEW_URL = 'https://g.page/r/test';

    const result = validateEnv();
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('returns missing vars when required vars are absent', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const result = validateEnv();
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('NEXT_PUBLIC_SUPABASE_URL');
    expect(result.missing).toContain('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });

  it('does not fail when optional vars are missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.DATABASE_URL;
    delete process.env.GOOGLE_REVIEW_URL;

    const result = validateEnv();
    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('reports only the actually missing required vars', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const result = validateEnv();
    expect(result.ok).toBe(false);
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]).toBe('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  });
});
