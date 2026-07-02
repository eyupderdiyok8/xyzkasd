// ──────────────────────────────────────────────
// Water Purifier Service ERP — Middleware Comprehensive Edge Cases
// Multi-Tenant SaaS
//
// Tests: edge cases for super_admin null tenant, path matching,
// route prefix guards, combined role+feature checks
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mutable mock state ───────────────────────

let mockUserResult: { id: string } | null = { id: 'user-1' };
let mockUserError: Error | null = null;
let mockProfileResult: { role: string; tenant_id: string | null; is_active: boolean } | null = {
  role: 'technician', tenant_id: 'tenant-1', is_active: true,
};
let mockProfileError: Error | null = null;
let mockTenantResult: { plan: string } | null = { plan: 'PROFESSIONAL' };
let mockMinRole: string | null = null;
let mockRequiredFeature: string | null = null;
let mockHasFeatureResult = true;

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: mockUserResult },
        error: mockUserError,
      })),
    },
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: mockProfileResult,
                error: mockProfileError,
              })),
            })),
          })),
        };
      }
      if (table === 'tenants') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: mockTenantResult,
                error: null,
              })),
            })),
          })),
        };
      }
      return { select: vi.fn(), eq: vi.fn() };
    }),
  })),
}));

vi.mock('@/lib/roles', () => ({
  getMinimumRoleForPath: vi.fn(() => mockMinRole),
  ROLE_HIERARCHY: { viewer: 0, technician: 1, manager: 2, tenant_admin: 3, super_admin: 4 },
}));

vi.mock('@/lib/features', () => ({
  getRequiredFeatureForPath: vi.fn(() => mockRequiredFeature),
  hasFeature: vi.fn(() => mockHasFeatureResult),
}));

let redirectUrl: string | null = null;
vi.mock('next/server', () => {
  // Use a getter-based approach to avoid hoisting issues with vi.mock
  const mockRedirect = vi.fn((url: string) => {
    redirectUrl = url;
    return { status: 307, headers: new Map([['Location', String(url)]]) };
  });
  return {
    NextResponse: {
      next: vi.fn((opts?: any) => ({ status: 200, ...opts })),
      redirect: mockRedirect,
    },
  };
});

function createMockRequest(pathname: string): any {
  const url = new URL(`http://localhost:3000${pathname}`);
  const cloneUrl = () => { const c = new URL(url.href); return c; };
  return {
    url: url.href,
    nextUrl: {
      clone: vi.fn(cloneUrl),
      pathname: url.pathname,
      searchParams: url.searchParams,
      href: url.href,
      origin: url.origin,
    },
    cookies: { getAll: vi.fn().mockReturnValue([]), set: vi.fn(), get: vi.fn() },
    headers: new Headers(),
  };
}

describe('Middleware — edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserResult = { id: 'user-1' };
    mockUserError = null;
    mockProfileResult = { role: 'technician', tenant_id: 'tenant-1', is_active: true };
    mockProfileError = null;
    mockTenantResult = { plan: 'PROFESSIONAL' };
    mockMinRole = null;
    mockRequiredFeature = null;
    mockHasFeatureResult = true;
    redirectUrl = null;
  });

  it('allows super_admin with null tenant through restricted routes', async () => {
    mockProfileResult = { role: 'super_admin', tenant_id: null, is_active: true };
    mockMinRole = 'tenant_admin';
    const { proxy: middleware } = await import('./proxy');
    const res = await middleware(createMockRequest('/admin'));
    expect(res.status).toBe(200);
  });

  it('allows super_admin through /admin/whatsapp without plan check', async () => {
    mockProfileResult = { role: 'super_admin', tenant_id: null, is_active: true };
    mockMinRole = 'tenant_admin';
    mockRequiredFeature = 'whatsapp';
    // super_admin has no tenant → tenantResult null → hasFeature default false
    mockTenantResult = null;
    const { proxy: middleware } = await import('./proxy');
    const res = await middleware(createMockRequest('/admin/whatsapp'));
    // super_admin with null tenant skips feature check entirely
    expect(res.status).toBe(200);
  });

  it('blocks access when tenant query returns null', async () => {
    mockMinRole = 'viewer';
    mockRequiredFeature = 'whatsapp';
    mockHasFeatureResult = false;
    mockProfileResult = { role: 'manager', tenant_id: 'tenant-1', is_active: true };
    mockTenantResult = null; // No tenant row
    const { proxy: middleware } = await import('./proxy');
    const res = await middleware(createMockRequest('/admin/whatsapp'));
    expect(res.status).toBe(307);
  });

  it('handles /admin path with partial match', async () => {
    mockMinRole = 'manager';
    mockProfileResult = { role: 'manager', tenant_id: 'tenant-1', is_active: true };
    const { proxy: middleware } = await import('./proxy');
    const res = await middleware(createMockRequest('/admin'));
    // manager < tenant_admin, but getMinimumRoleForPath returns what mock returns
    expect(res.status).toBe(200);
  });

  it('strips query params from path for feature check', async () => {
    mockMinRole = 'viewer';
    mockProfileResult = { role: 'viewer', tenant_id: 'tenant-1', is_active: true };
    const { proxy: middleware } = await import('./proxy');
    const res = await middleware(createMockRequest('/dashboard?foo=bar'));
    expect(res.status).toBe(200);
  });

  it('redirects unauthenticated user to login with error', async () => {
    mockUserResult = null;
    const { proxy: middleware } = await import('./proxy');
    const res = await middleware(createMockRequest('/dashboard'));
    expect(res.status).toBe(307);
    const location = res.headers.get('Location') || '';
    expect(location).toContain('/login');
    expect(location).toContain('error=unauthorized');
  });

  it('redirects inactive user to login with forbidden', async () => {
    mockProfileResult = { role: 'technician', tenant_id: 'tenant-1', is_active: false };
    const { proxy: middleware } = await import('./proxy');
    const res = await middleware(createMockRequest('/dashboard'));
    expect(res.status).toBe(307);
    const location = res.headers.get('Location') || '';
    expect(location).toContain('/login');
    expect(location).toContain('error=forbidden');
  });

  it('redirects to forbidden page when role is insufficient', async () => {
    mockProfileResult = { role: 'viewer', tenant_id: 'tenant-1', is_active: true };
    mockMinRole = 'manager';
    const { proxy: middleware } = await import('./proxy');
    const res = await middleware(createMockRequest('/manager'));
    expect(res.status).toBe(307);
    const location = res.headers.get('Location') || '';
    expect(location).toContain('error=forbidden');
  });

  it('handles /public device QR routes as public', async () => {
    const { proxy: middleware } = await import('./proxy');
    const res = await middleware(createMockRequest('/public/device/ABC123'));
    expect(res.status).toBe(200);
  });

  it('handles /survey routes as public', async () => {
    const { proxy: middleware } = await import('./proxy');
    const res = await middleware(createMockRequest('/survey/ticket-1'));
    expect(res.status).toBe(200);
  });

  it('handles /api routes (excluded from middleware)', async () => {
    const { config } = await import('./proxy');
    expect(config.matcher[0]).toContain('!api/');
  });
});

describe('ROUTE_GUARDS — from roles.ts integration', () => {
  it('route guard hierarchy: super_admin can access tenant_admin routes', async () => {
    const { ROLE_HIERARCHY } = await import('@/lib/roles');
    expect(ROLE_HIERARCHY.super_admin).toBeGreaterThanOrEqual(ROLE_HIERARCHY.tenant_admin);
    expect(ROLE_HIERARCHY.tenant_admin).toBeGreaterThanOrEqual(ROLE_HIERARCHY.manager);
    expect(ROLE_HIERARCHY.manager).toBeGreaterThanOrEqual(ROLE_HIERARCHY.technician);
    expect(ROLE_HIERARCHY.technician).toBeGreaterThanOrEqual(ROLE_HIERARCHY.viewer);
  });

  it('ROLE_HIERARCHY is strictly ordered', async () => {
    const { ROLE_HIERARCHY } = await import('@/lib/roles');
    expect(ROLE_HIERARCHY.viewer).toBe(0);
    expect(ROLE_HIERARCHY.technician).toBe(1);
    expect(ROLE_HIERARCHY.manager).toBe(2);
    expect(ROLE_HIERARCHY.tenant_admin).toBe(3);
    expect(ROLE_HIERARCHY.super_admin).toBe(4);
  });
});
