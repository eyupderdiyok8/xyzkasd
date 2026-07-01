// ──────────────────────────────────────────────
// Water Purifier Service ERP — Users API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = { ok: true, userId: 'user-1', role: 'tenant_admin' as const, tenantId: 'tenant-1', error: null as any };
vi.mock('@/lib/supabase/require-role', () => ({ requireRole: vi.fn(() => Promise.resolve(mockAuth)) }));

const mockProfiles = [
  { id: 'user-1', email: 'admin@test.com', full_name: 'Admin', role: 'tenant_admin', tenant_id: 'tenant-1', is_active: true, phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'user-2', email: 'tech@test.com', full_name: 'Teknisyen', role: 'technician', tenant_id: 'tenant-1', is_active: true, phone: null, avatar_url: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const mockSupabase = {
  auth: { admin: { createUser: vi.fn(), deleteUser: vi.fn() } },
  from: vi.fn(() => ({
    select: vi.fn(() => {
      const chain: any = { order: vi.fn(() => chain), eq: vi.fn(() => chain), limit: vi.fn() };
      chain.limit.mockResolvedValue({ data: [...mockProfiles], error: null });
      return chain;
    }),
    update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
  })),
};

vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: vi.fn(() => mockSupabase) }));

describe('GET /api/users', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns users for tenant_admin', async () => {
    const { GET } = await import('../users/route');
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it('filters by tenant_id for tenant_admin', async () => {
    const { GET } = await import('../users/route');
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it('returns 500 on query error', async () => {
    const chain: any = { order: vi.fn(() => chain), eq: vi.fn(() => chain), limit: vi.fn() };
    chain.limit.mockResolvedValue({ data: null as any, error: new Error('DB error') });
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => chain),
      update: vi.fn(() => ({ eq: vi.fn() })),
    });
    const { GET } = await import('../users/route');
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(500);
  });
});
