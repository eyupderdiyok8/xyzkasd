// ──────────────────────────────────────────────
// Water Purifier Service ERP — Middleware Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mutable mock state ───────────────────────

let mockUserResult: { id: string } | null = { id: 'user-1' };
let mockUserError: Error | null = null;
let mockProfileResult: { role: string; tenant_id: string | null; is_active: boolean } | null = { role: 'technician', tenant_id: 'tenant-1', is_active: true };
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

// Mock NextResponse
let redirectUrl: string | null = null;
vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn((opts?: any) => ({ status: 200, ...opts })),
    redirect: vi.fn((url: string) => {
      redirectUrl = url;
      return { status: 307, headers: new Map() };
    }),
  },
}));

function createMockRequest(pathname: string): any {
  const url = new URL(`http://localhost:3000${pathname}`);
  // Make searchParams settable via a wrapper
  const cloneUrl = () => {
    const c = new URL(url.href);
    return c;
  };
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

describe('Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mutable state
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

  it('allows public routes without auth', async () => {
    const { middleware } = await import('./middleware');
    const req = createMockRequest('/login');
    const res = await middleware(req);
    expect(res).toBeDefined();
    expect(res.status).toBe(200);
  });

  it('allows /register route', async () => {
    const { middleware } = await import('./middleware');
    const res = await middleware(createMockRequest('/register'));
    expect(res.status).toBe(200);
  });

  it('allows /auth/callback route', async () => {
    const { middleware } = await import('./middleware');
    const res = await middleware(createMockRequest('/auth/callback'));
    expect(res.status).toBe(200);
  });

  it('redirects to login when user is null', async () => {
    mockUserResult = null;
    const { middleware } = await import('./middleware');
    const res = await middleware(createMockRequest('/dashboard'));
    expect(res.status).toBe(307);
  });

  it('redirects to login when session error occurs', async () => {
    mockUserError = new Error('No session');
    const { middleware } = await import('./middleware');
    const res = await middleware(createMockRequest('/dashboard'));
    expect(res.status).toBe(307);
  });

  it('redirects to login when profile not found', async () => {
    mockProfileResult = null;
    const { middleware } = await import('./middleware');
    const res = await middleware(createMockRequest('/dashboard'));
    expect(res.status).toBe(307);
  });

  it('redirects to login when profile is inactive', async () => {
    mockProfileResult = { role: 'technician', tenant_id: 'tenant-1', is_active: false };
    const { middleware } = await import('./middleware');
    const res = await middleware(createMockRequest('/dashboard'));
    expect(res.status).toBe(307);
  });

  it('allows access when role meets minimum requirement', async () => {
    mockMinRole = 'viewer';
    const { middleware } = await import('./middleware');
    const res = await middleware(createMockRequest('/dashboard'));
    expect(res.status).toBe(200);
  });

  it('redirects to forbidden when role is insufficient', async () => {
    mockMinRole = 'tenant_admin';
    const { middleware } = await import('./middleware');
    const res = await middleware(createMockRequest('/admin'));
    expect(res.status).toBe(307);
  });

  it('allows super_admin with null tenant to access', async () => {
    mockProfileResult = { role: 'super_admin', tenant_id: null, is_active: true };
    mockMinRole = 'tenant_admin';
    const { middleware } = await import('./middleware');
    const res = await middleware(createMockRequest('/admin'));
    expect(res.status).toBe(200);
  });

  it('blocks Professional-only feature for STARTER plan', async () => {
    mockMinRole = 'viewer';
    mockRequiredFeature = 'whatsapp';
    mockHasFeatureResult = false;
    mockTenantResult = { plan: 'STARTER' };
    const { middleware } = await import('./middleware');
    const res = await middleware(createMockRequest('/admin/whatsapp'));
    expect(res.status).toBe(307);
  });

  it('allows Professional-only feature for PROFESSIONAL plan', async () => {
    mockMinRole = 'viewer';
    mockRequiredFeature = 'whatsapp';
    mockHasFeatureResult = true;
    const { middleware } = await import('./middleware');
    const res = await middleware(createMockRequest('/admin/whatsapp'));
    expect(res.status).toBe(200);
  });

  it('skips feature check when no feature is required', async () => {
    mockRequiredFeature = null;
    const { middleware } = await import('./middleware');
    const res = await middleware(createMockRequest('/dashboard'));
    expect(res.status).toBe(200);
  });
});
