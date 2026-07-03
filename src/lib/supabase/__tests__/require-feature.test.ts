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
      { data: { membershipType: 'MONTHLY', membershipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() }, error: null },
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
        { data: { membershipType: 'MONTHLY', membershipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() }, error: null },
      );
      vi.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: vi.fn(() => viewerSupabase),
      }));
      const { requireFeature: rf } = await import('../require-feature');
      const result = await rf('manager', 'whatsapp');
      expect(result.ok).toBe(false);
      expect(result.error?.status).toBe(403);
      expect(result.membershipType).toBeNull();
    });
  });

  describe('tenant plan checks', () => {
    it('allows features with active membership', async () => {
      const result = await requireFeature('viewer', 'whatsapp');
      expect(result.ok).toBe(true);
      expect(result.membershipType).toBe('MONTHLY');
    });

    it('blocks features on expired membership (expired)', async () => {
      vi.resetModules();
      const starterSupabase = createMockSupabase(
        { data: { user: { id: 'user-1' } }, error: null },
        { data: { role: 'manager', tenant_id: 'tenant-1', is_active: true }, error: null },
        { data: { membershipType: 'MONTHLY', membershipExpiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }, error: null },
      );
      vi.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: vi.fn(() => starterSupabase),
      }));
      const { requireFeature: rf } = await import('../require-feature');
      const result = await rf('viewer', 'whatsapp');
      expect(result.ok).toBe(false);
      expect(result.error?.status).toBe(403);
      expect(result.error?.message).toContain('Üyeliğinizin süresi dolmuş');
      expect(result.membershipType).toBe('MONTHLY');
    });

    it('allows features with active (future) membership', async () => {
      vi.resetModules();
      const activeSupabase = createMockSupabase(
        { data: { user: { id: 'user-1' } }, error: null },
        { data: { role: 'technician', tenant_id: 'tenant-1', is_active: true }, error: null },
        { data: { membershipType: 'MONTHLY', membershipExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() }, error: null },
      );
      vi.doMock('@/lib/supabase/server', () => ({
        createServerSupabaseClient: vi.fn(() => activeSupabase),
      }));
      const { requireFeature: rf } = await import('../require-feature');
      const result = await rf('viewer', 'coupons');
      expect(result.ok).toBe(true);
      expect(result.membershipType).toBe('MONTHLY');
    });

    it('blocks features on expired membership', async () => {
      vi.resetModules();
      const starterSupabase = createMockSupabase(
        { data: { user: { id: 'user-1' } }, error: null },
        { data: { role: 'manager', tenant_id: 'tenant-1', is_active: true }, error: null },
        { data: { membershipType: 'MONTHLY', membershipExpiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }, error: null },
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

    it('returns blocked when no tenant membership found', async () => {
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
      // No tenant row → no membership info → blocks
      expect(result.ok).toBe(false);
      expect(result.membershipType).toBe('MONTHLY');
    });
  });

  describe('return shape', () => {
    it('returns FeatureCheckResult extending RoleCheckResult with membership info', async () => {
      const result = await requireFeature('viewer', 'surveys');
      expect(result).toHaveProperty('ok');
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('membershipType');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('isActive');
    });
  });
});

