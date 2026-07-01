// ──────────────────────────────────────────────
// Water Purifier Service ERP — Invite API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = {
  ok: true, userId: 'user-1', role: 'tenant_admin' as const, tenantId: 'tenant-1', error: null as any,
};

vi.mock('@/lib/supabase/require-role', () => ({
  requireRole: vi.fn(() => Promise.resolve(mockAuth)),
}));

describe('POST /api/invite', () => {
  beforeEach(() => { vi.resetModules(); });

  it('invites a new user successfully', async () => {
    const mockAdminClient = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'new-user-1' } },
            error: null,
          }),
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
        },
      },
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })),
    };
    const mockSupabaseClient = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    };

    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => mockAdminClient),
    }));
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => mockSupabaseClient),
    }));

    const { POST } = await import('../invite/route');
    const req = {
      json: vi.fn().mockResolvedValue({
        email: 'newuser@test.com',
        password: 'Pass123!',
        fullName: 'Yeni Kullanıcı',
        role: 'technician',
      }),
    } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.email).toBe('newuser@test.com');
    expect(body.data.role).toBe('technician');
  });

  it('returns 400 for invalid JSON body', async () => {
    const { POST } = await import('../invite/route');
    const req = { json: vi.fn().mockRejectedValue(new Error('Invalid JSON')) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when required fields are missing', async () => {
    const { POST } = await import('../invite/route');
    const req = { json: vi.fn().mockResolvedValue({ email: 'test@test.com' }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for invalid role', async () => {
    const { POST } = await import('../invite/route');
    const req = {
      json: vi.fn().mockResolvedValue({
        email: 'test@test.com',
        password: 'Pass123!',
        fullName: 'Test',
        role: 'invalid_role',
      }),
    } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 when tenant_admin tries to create super_admin', async () => {
    const { POST } = await import('../invite/route');
    const req = {
      json: vi.fn().mockResolvedValue({
        email: 'sa@test.com',
        password: 'Pass123!',
        fullName: 'Super',
        role: 'super_admin',
      }),
    } as any;
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 when tenant_admin tries to create tenant_admin', async () => {
    const { POST } = await import('../invite/route');
    const req = {
      json: vi.fn().mockResolvedValue({
        email: 'ta@test.com',
        password: 'Pass123!',
        fullName: 'TA',
        role: 'tenant_admin',
      }),
    } as any;
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 403 when tenant_admin invites user to different tenant', async () => {
    const { POST } = await import('../invite/route');
    const req = {
      json: vi.fn().mockResolvedValue({
        email: 'other@test.com',
        password: 'Pass123!',
        fullName: 'Other',
        role: 'technician',
        tenantId: 'tenant-2',
      }),
    } as any;
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 500 on auth creation error', async () => {
    const mockAdminClient = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Email already registered'),
          }),
        },
      },
    };
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => mockAdminClient),
    }));
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => ({
        from: vi.fn(() => ({
          update: vi.fn(() => ({ eq: vi.fn() })),
        })),
      })),
    }));

    const { POST } = await import('../invite/route');
    const req = {
      json: vi.fn().mockResolvedValue({
        email: 'existing@test.com',
        password: 'Pass123!',
        fullName: 'Existing',
        role: 'technician',
      }),
    } as any;
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('rolls back auth user on profile creation failure', async () => {
    const mockDeleteUser = vi.fn().mockResolvedValue({ error: null });
    const mockAdminClient = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'new-user-1' } },
            error: null,
          }),
          deleteUser: mockDeleteUser,
        },
      },
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: new Error('Profile update failed') }),
      })),
    };
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => mockAdminClient),
    }));
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => ({
        from: vi.fn(() => ({
          update: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ error: new Error('Profile update failed') }),
          })),
        })),
      })),
    }));

    const { POST } = await import('../invite/route');
    const req = {
      json: vi.fn().mockResolvedValue({
        email: 'test@test.com',
        password: 'Pass123!',
        fullName: 'Test',
        role: 'technician',
      }),
    } as any;
    const res = await POST(req);
    expect(res.status).toBe(500);
    // Verify rollback was called
    expect(mockDeleteUser).toHaveBeenCalledWith('new-user-1');
  });

  it('for super_admin role, allows null tenantId', async () => {
    vi.doMock('@/lib/supabase/require-role', () => ({
      requireRole: vi.fn(() => Promise.resolve({ ...mockAuth, role: 'super_admin' })),
    }));
    const mockAdminClient = {
      auth: {
        admin: {
          createUser: vi.fn().mockResolvedValue({
            data: { user: { id: 'sa-user' } },
            error: null,
          }),
        },
      },
      from: vi.fn(() => ({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      })),
    };
    const mockSupabaseClient = {
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })),
    };
    vi.doMock('@/lib/supabase/admin', () => ({
      createAdminClient: vi.fn(() => mockAdminClient),
    }));
    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => mockSupabaseClient),
    }));

    const { POST } = await import('../invite/route');
    const req = {
      json: vi.fn().mockResolvedValue({
        email: 'sa@test.com',
        password: 'Pass123!',
        fullName: 'Super Admin',
        role: 'super_admin',
        tenantId: null,
      }),
    } as any;
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
});
