// ──────────────────────────────────────────────
// Water Purifier Service ERP — Auth/Me API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockProfile = {
  id: 'user-1',
  email: 'test@test.com',
  full_name: 'Test User',
  role: 'manager',
  tenant_id: 'tenant-1',
  is_active: true,
  phone: null,
  avatar_url: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

function createMockSupabase(getUserResult: any, profileResult: any) {
  let callCount = 0;
  return {
    auth: { getUser: vi.fn().mockResolvedValue(getUserResult) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue(profileResult),
        })),
      })),
    })),
  };
}

describe('GET /api/auth/me', () => {
  beforeEach(() => { vi.resetModules(); });

  it('returns current user profile', async () => {
    const mockSupabase = createMockSupabase(
      { data: { user: { id: 'user-1' } }, error: null },
      { data: mockProfile, error: null },
    );
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => mockSupabase),
    }));
    const { GET } = await import('../auth/me/route');
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe('user-1');
    expect(body.data.role).toBe('manager');
  });

  it('returns 401 when not authenticated', async () => {
    const mockSupabase = createMockSupabase(
      { data: { user: null }, error: null },
      { data: null, error: null },
    );
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => mockSupabase),
    }));
    const { GET } = await import('../auth/me/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 401 on auth error', async () => {
    const mockSupabase = createMockSupabase(
      { data: { user: null }, error: new Error('Auth error') },
      { data: null, error: null },
    );
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => mockSupabase),
    }));
    const { GET } = await import('../auth/me/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 404 when profile not found', async () => {
    const mockSupabase = createMockSupabase(
      { data: { user: { id: 'user-1' } }, error: null },
      { data: null, error: null },
    );
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => mockSupabase),
    }));
    const { GET } = await import('../auth/me/route');
    const res = await GET();
    expect(res.status).toBe(404);
  });
});
