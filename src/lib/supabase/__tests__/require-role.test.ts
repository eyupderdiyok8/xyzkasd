// ──────────────────────────────────────────────
// Water Purifier Service ERP — requireRole Tests
// Multi-Tenant SaaS
//
// Tests: auth middleware — role checking, profile lookup, edge cases
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

function createMockSupabase(getUserResult: any, profilesResult: any) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue(getUserResult) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue(profilesResult),
        })),
      })),
    })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
});

describe('requireRole', () => {
  let requireRole: typeof import('../require-role').requireRole;
  let mockSupabase: any;

  beforeEach(async () => {
    mockSupabase = createMockSupabase(
      { data: { user: { id: 'user-1' } }, error: null },
      { data: { role: 'technician', tenant_id: 'tenant-1', is_active: true }, error: null },
    );

    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => mockSupabase),
    }));

    requireRole = (await import('../require-role')).requireRole;
  });

  it('returns ok for technician with minimum viewer role', async () => {
    const result = await requireRole('viewer');
    expect(result.ok).toBe(true);
    expect(result.role).toBe('technician');
    expect(result.tenantId).toBe('tenant-1');
    expect(result.userId).toBe('user-1');
    expect(result.error).toBeNull();
  });

  it('returns ok for technician with minimum technician role', async () => {
    const result = await requireRole('technician');
    expect(result.ok).toBe(true);
  });

  it('returns 403 for technician with minimum manager role', async () => {
    const result = await requireRole('manager');
    expect(result.ok).toBe(false);
    expect(result.error?.status).toBe(403);
    expect(result.error?.code).toBe('FORBIDDEN');
  });

  it('returns 401 when user is not authenticated', async () => {
    // Re-initialize for this test case
    mockSupabase = createMockSupabase(
      { data: { user: null }, error: null },
      { data: null, error: null },
    );
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => mockSupabase),
    }));
    requireRole = (await import('../require-role')).requireRole;

    const result = await requireRole('viewer');
    expect(result.ok).toBe(false);
    expect(result.error?.status).toBe(401);
    expect(result.error?.code).toBe('UNAUTHORIZED');
  });

  it('returns 401 on auth error', async () => {
    mockSupabase = createMockSupabase(
      { data: { user: null }, error: new Error('Auth error') },
      { data: null, error: null },
    );
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => mockSupabase),
    }));
    requireRole = (await import('../require-role')).requireRole;

    const result = await requireRole('viewer');
    expect(result.ok).toBe(false);
    expect(result.error?.status).toBe(401);
  });

  it('returns 403 when profile not found', async () => {
    mockSupabase = createMockSupabase(
      { data: { user: { id: 'user-1' } }, error: null },
      { data: null, error: null },
    );
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => mockSupabase),
    }));
    requireRole = (await import('../require-role')).requireRole;

    const result = await requireRole('viewer');
    expect(result.ok).toBe(false);
    expect(result.error?.status).toBe(403);
    expect(result.error?.code).toBe('FORBIDDEN');
  });

  it('returns 403 when profile is inactive', async () => {
    mockSupabase = createMockSupabase(
      { data: { user: { id: 'user-1' } }, error: null },
      { data: { role: 'technician', tenant_id: 'tenant-1', is_active: false }, error: null },
    );
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => mockSupabase),
    }));
    requireRole = (await import('../require-role')).requireRole;

    const result = await requireRole('viewer');
    expect(result.ok).toBe(false);
    expect(result.error?.status).toBe(403);
    expect(result.error?.message).toContain('Hesabınız aktif değil');
  });

  it('return has null userId and role on auth failure', async () => {
    mockSupabase = createMockSupabase(
      { data: { user: null }, error: new Error('fail') },
      { data: null, error: null },
    );
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => mockSupabase),
    }));
    requireRole = (await import('../require-role')).requireRole;

    const result = await requireRole('manager');
    expect(result.userId).toBeNull();
    expect(result.role).toBeNull();
  });

  it('super_admin passes all role checks', async () => {
    mockSupabase = createMockSupabase(
      { data: { user: { id: 'super-1' } }, error: null },
      { data: { role: 'super_admin', tenant_id: null, is_active: true }, error: null },
    );
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => mockSupabase),
    }));
    requireRole = (await import('../require-role')).requireRole;

    const result = await requireRole('tenant_admin');
    expect(result.ok).toBe(true);
    expect(result.role).toBe('super_admin');
  });
});
