// ──────────────────────────────────────────────
// Water Purifier Service ERP — Admin Plan API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mutable reference for dynamic mock behavior
let mockAuthData: Record<string, any> = {
  ok: true, userId: 'user-1', role: 'tenant_admin', tenantId: 'tenant-1', error: null,
};

vi.mock('@/lib/supabase/require-role', () => ({
  requireRole: vi.fn(() => Promise.resolve(mockAuthData)),
}));

// Shared mock admin client references
let mockSelectSingle: any = vi.fn();
let mockUpdateEq: any = vi.fn();

function createMockAdminClient() {
  return {
    from: vi.fn((_table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSelectSingle,
        })),
      })),
      update: vi.fn(() => ({
        eq: mockUpdateEq,
      })),
    })),
  };
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => createMockAdminClient()),
}));

beforeEach(() => {
  vi.clearAllMocks();
  // Reset mutable references
  mockAuthData = {
    ok: true, userId: 'user-1', role: 'tenant_admin', tenantId: 'tenant-1', error: null,
  };
  mockSelectSingle = vi.fn();
  mockUpdateEq = vi.fn();
});

describe('GET /api/admin/plan', () => {
  it('returns the current tenant plan', async () => {
    mockSelectSingle = vi.fn().mockResolvedValue({ data: { id: 'tenant-1', name: 'Test Firma', slug: 'test', plan: 'PROFESSIONAL' }, error: null });

    const { GET } = await import('../admin/plan/route');
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.plan).toBe('PROFESSIONAL');
    expect(body.data.planLabel).toBe('Professional');
  });

  it('returns 404 when tenant not found', async () => {
    mockSelectSingle = vi.fn().mockResolvedValue({ data: null, error: null });

    const { GET } = await import('../admin/plan/route');
    const res = await GET();
    expect(res.status).toBe(404);
  });

  it('returns 404 when no tenantId (super_admin edge case)', async () => {
    mockAuthData = { ok: true, userId: 'user-1', role: 'super_admin', tenantId: null, error: null };

    const { GET } = await import('../admin/plan/route');
    const res = await GET();
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/admin/plan', () => {
  it('updates tenant plan to PROFESSIONAL', async () => {
    mockUpdateEq = vi.fn().mockResolvedValue({ error: null });

    const { PATCH } = await import('../admin/plan/route');
    const req = { json: vi.fn().mockResolvedValue({ plan: 'PROFESSIONAL' }) } as any;
    const res = await PATCH(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.plan).toBe('PROFESSIONAL');
  });

  it('returns 400 for invalid plan', async () => {
    const { PATCH } = await import('../admin/plan/route');
    const req = { json: vi.fn().mockResolvedValue({ plan: 'INVALID' }) } as any;
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing plan field', async () => {
    const { PATCH } = await import('../admin/plan/route');
    const req = { json: vi.fn().mockResolvedValue({}) } as any;
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });
});
