// ──────────────────────────────────────────────
// Water Purifier Service ERP — requireFeature Tests
// Multi-Tenant SaaS
//
// Tests: plan-based feature gating — starter vs professional
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Supabase ─────────────────────────────

function createMockSupabase(
  getUserResult: any,
  profilesResult: any,
  tenantResult: any,
) {
  // For the role check → uses profiles
  // For feature check → uses tenants
  let callCount = 0;
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue(getUserResult),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue(profilesResult),
            })),
          })),
        };
      }
      if (table === 'tenants') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue(tenantResult),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn() })) })),
      };
    }),
  };
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

describe('requireFeature', () => {
  let requireFeature: typeof import('../require-feature').requireFeature;
  let mockSupabase: any;

  beforeEach(async () => {
    vi.resetModules();
    mockSupabase = createMockSupabase(
      { data: { user: { id: 'user-1' } }, error: null },
      { data: { role: 'manager', tenant_id: 'tenant-1', is_active: true }, error: null },
      { data: { plan: 'PROFESSIONAL' }, error: null },
    );

    vi.doMock('@/lib/supabase/server', () => ({
      createServerSupabaseClient: vi.fn(() => mockSupabase),
    }));

    requireFeature = (await import('../require-feature')).requireFeature;
  });

  describe('role check failures', () => {
    it('returns unauthorized when role check fails', async () => {
      // A viewer trying to access a manager feature
      vi.resetModules();
      const viewerSupabase = createMockSupabase(
        { data: { user: { id: 'user-1' } }, error: null },
        { data: { role: 'viewer', tenant_id: 'tenant-1', is_active: true }, error: null },
        { data: { plan: 'PROFESSIONAL' }, error: null },
      );
      vi.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: vi.fn(() => viewerSupabase),
      }));
      const { requireFeature: rf } = await import('../require-feature');
      const result = await rf('manager', 'whatsapp');
      expect(result.ok).toBe(false);
      expect(result.error?.status).toBe(403);
      expect(result.plan).toBeNull();
    });
  });

  describe('tenant plan checks', () => {
    it('allows PROFESSIONAL feature on PROFESSIONAL plan', async () => {
      const result = await requireFeature('viewer', 'whatsapp');
      expect(result.ok).toBe(true);
      expect(result.plan).toBe('PROFESSIONAL');
    });

    it('blocks PROFESSIONAL feature on STARTER plan', async () => {
      vi.resetModules();
      const starterSupabase = createMockSupabase(
        { data: { user: { id: 'user-1' } }, error: null },
        { data: { role: 'manager', tenant_id: 'tenant-1', is_active: true }, error: null },
        { data: { plan: 'STARTER' }, error: null },
      );
      vi.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: vi.fn(() => starterSupabase),
      }));
      const { requireFeature: rf } = await import('../require-feature');
      const result = await rf('viewer', 'whatsapp');
      expect(result.ok).toBe(false);
      expect(result.error?.status).toBe(403);
      expect(result.error?.message).toContain('Professional plana yükseltmek');
      expect(result.plan).toBe('STARTER');
    });

    it('allows STARTER feature on STARTER plan', async () => {
      vi.resetModules();
      const starterSupabase = createMockSupabase(
        { data: { user: { id: 'user-1' } }, error: null },
        { data: { role: 'technician', tenant_id: 'tenant-1', is_active: true }, error: null },
        { data: { plan: 'STARTER' }, error: null },
      );
      vi.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: vi.fn(() => starterSupabase),
      }));
      const { requireFeature: rf } = await import('../require-feature');
      const result = await rf('viewer', 'coupons');
      expect(result.ok).toBe(true);
      expect(result.plan).toBe('STARTER');
    });

    it('blocks automation on STARTER plan', async () => {
      vi.resetModules();
      const starterSupabase = createMockSupabase(
        { data: { user: { id: 'user-1' } }, error: null },
        { data: { role: 'manager', tenant_id: 'tenant-1', is_active: true }, error: null },
        { data: { plan: 'STARTER' }, error: null },
      );
      vi.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: vi.fn(() => starterSupabase),
      }));
      const { requireFeature: rf } = await import('../require-feature');
      const result = await rf('viewer', 'automation');
      expect(result.ok).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('returns 403 when tenantId is null', async () => {
      vi.resetModules();
      const noTenantSupabase = createMockSupabase(
        { data: { user: { id: 'user-1' } }, error: null },
        { data: { role: 'super_admin', tenant_id: null, is_active: true }, error: null },
        { data: null, error: null },
      );
      vi.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: vi.fn(() => noTenantSupabase),
      }));
      const { requireFeature: rf } = await import('../require-feature');
      const result = await rf('viewer', 'whatsapp');
      expect(result.ok).toBe(false);
      expect(result.error?.status).toBe(403);
      expect(result.error?.code).toBe('FORBIDDEN');
    });

    it('defaults to STARTER when no tenant plan found', async () => {
      vi.resetModules();
      const noPlanSupabase = createMockSupabase(
        { data: { user: { id: 'user-1' } }, error: null },
        { data: { role: 'manager', tenant_id: 'tenant-1', is_active: true }, error: null },
        { data: null, error: null },
      );
      vi.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: vi.fn(() => noPlanSupabase),
      }));
      const { requireFeature: rf } = await import('../require-feature');
      const result = await rf('viewer', 'whatsapp');
      // No tenant row → defaults to STARTER → blocks whatsapp
      expect(result.ok).toBe(false);
      expect(result.plan).toBe('STARTER');
    });
  });

  describe('return shape', () => {
    it('returns FeatureCheckResult extending RoleCheckResult with plan', async () => {
      const result = await requireFeature('viewer', 'surveys');
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('plan');
    });
  });
});
