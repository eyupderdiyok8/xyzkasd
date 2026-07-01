// ──────────────────────────────────────────────
// Water Purifier Service ERP — Users, Invite, Admin & Auth API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = { ok: true, userId: 'user-1', role: 'tenant_admin' as const, tenantId: 'tenant-1', error: null as any };
vi.mock('@/lib/supabase/require-role', () => ({ requireRole: vi.fn(() => Promise.resolve(mockAuth)) }));

const { mockSupabase } = vi.hoisted(() => ({
  mockSupabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
      admin: { createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null }), deleteUser: vi.fn().mockResolvedValue({ error: null }) },
    },
    from: vi.fn((table: string) => {
      const upsert = vi.fn().mockResolvedValue({ error: null });
      const eq = vi.fn().mockResolvedValue({ error: null });
      return {
        select: vi.fn(() => {
          const chain: any = {};
          chain.order = vi.fn(() => chain);
          chain.eq = vi.fn(() => chain);
          chain.single = vi.fn().mockResolvedValue({ data: { id: 'tenant-1', name: 'Test', slug: 'test', plan: 'PROFESSIONAL' }, error: null });
          chain.limit = vi.fn().mockResolvedValue({ data: [{ id: 'user-1', email: 'admin@test.com', role: 'tenant_admin', tenant_id: 'tenant-1', is_active: true, full_name: 'Admin', created_at: new Date().toISOString() }], error: null });
          return chain;
        }),
        update: vi.fn(() => ({ eq })),
        upsert,
      };
    }),
  },
}));

vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: vi.fn(() => mockSupabase) }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn(() => mockSupabase) }));

function mockReq(body = {}): any {
  return { nextUrl: new URL('http://localhost:3000/api'), json: vi.fn().mockResolvedValue(body), headers: new Headers() };
}

describe('GET /api/users', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns users', async () => {
    const { GET } = await import('../users/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
  it('returns 401 when unauthenticated', async () => {
    const { requireRole } = await import('@/lib/supabase/require-role');
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, userId: null, role: null, tenantId: null, error: { status: 401, code: 'UNAUTHORIZED', message: '' } });
    const { GET } = await import('../users/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/users', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('updates a user role', async () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'user-2', email: 'tech@test.com', role: 'technician', tenant_id: 'tenant-1', is_active: true }, error: null }) }) )})),
      update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    });
    const { PATCH } = await import('../users/route');
    const req = mockReq({ id: 'user-2', role: 'manager' });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.role).toBe('manager');
  });
  it('returns 400 when id missing', async () => {
    const { PATCH } = await import('../users/route');
    const res = await PATCH(mockReq({ role: 'manager' }));
    expect(res.status).toBe(400);
  });
  it('returns 400 on invalid JSON', async () => {
    const { PATCH } = await import('../users/route');
    const req = { json: vi.fn().mockRejectedValue(new Error('Invalid JSON')) } as any;
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure admin client mock has upsert for invite route
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => ({
        auth: {
          admin: {
            createUser: vi.fn().mockResolvedValue({ data: { user: { id: 'new-user-1' } }, error: null }),
            deleteUser: vi.fn().mockResolvedValue({ error: null }),
          },
        },
        from: vi.fn(() => ({
          upsert: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    }));
  });

  it('creates a new user', async () => {
    const { POST } = await import('../invite/route');
    const req = mockReq({ email: 'new@test.com', password: 'pass123', fullName: 'Yeni', role: 'technician' });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
  it('returns 400 when fields missing', async () => {
    const { POST } = await import('../invite/route');
    const res = await POST(mockReq({ email: 'test@test.com' }));
    expect(res.status).toBe(400);
  });
  it('returns 400 for invalid role', async () => {
    const { POST } = await import('../invite/route');
    const res = await POST(mockReq({ email: 'test@test.com', password: 'pass', fullName: 'T', role: 'invalid' }));
    expect(res.status).toBe(400);
  });
  it('blocks tenant_admin from creating super_admin', async () => {
    const { POST } = await import('../invite/route');
    const res = await POST(mockReq({ email: 't@t.com', password: 'pass', fullName: 'T', role: 'super_admin' }));
    expect(res.status).toBe(403);
  });
});

describe('Admin Plan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default admin mock (may have been overridden by invite tests)
    vi.doMock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn(() => mockSupabase) }));
  });
  it('GET returns current plan', async () => {
    const { GET } = await import('../admin/plan/route');
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(body.data.plan).toBeDefined();
  });
  it('PATCH switches plan', async () => {
    const { PATCH } = await import('../admin/plan/route');
    const res = await PATCH(mockReq({ plan: 'STARTER' }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.plan).toBe('STARTER');
  });
  it('PATCH returns 400 for invalid plan', async () => {
    const { PATCH } = await import('../admin/plan/route');
    const res = await PATCH(mockReq({ plan: 'INVALID' }));
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns current user', async () => {
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: { id: 'user-1', email: 'user@test.com', full_name: 'Test', role: 'technician', tenant_id: 'tenant-1', is_active: true }, error: null }) }) )})),
      update: vi.fn(() => ({ eq: vi.fn() })),
      upsert: vi.fn(),
    });
    const { GET } = await import('../auth/me/route');
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.email).toBe('user@test.com');
  });
  it('returns 401 when not authenticated', async () => {
    mockSupabase.auth.getUser = vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('No session') });
    const { GET } = await import('../auth/me/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });
});
