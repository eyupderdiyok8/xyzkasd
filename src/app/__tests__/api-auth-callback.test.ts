// ──────────────────────────────────────────────
// Water Purifier Service ERP — Auth Callback Route Tests
// Multi-Tenant SaaS
//
// Covers: GET /auth/callback (Supabase OAuth callback)
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExchangeCodeForSession = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { exchangeCodeForSession: mockExchangeCodeForSession },
  })),
}));

function mockRequest(url: string): any {
  return {
    url,
    cookies: {
      getAll: vi.fn(() => []),
      set: vi.fn(),
    },
    nextUrl: new URL(url),
  };
}

describe('GET /auth/callback', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('exchanges code for session and redirects to dashboard', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const { GET } = await import('../auth/callback/route');
    const req = mockRequest('https://example.com/auth/callback?code=abc123');
    const res = await GET(req);

    expect(res.status).toBe(307); // redirect
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc123');
    const location = res.headers.get('Location');
    expect(location).toContain('/dashboard');
  });

  it('redirects to custom next path when provided', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const { GET } = await import('../auth/callback/route');
    const req = mockRequest('https://example.com/auth/callback?code=abc123&next=/manager/services');
    const res = await GET(req);

    const location = res.headers.get('Location');
    expect(location).toContain('/manager/services');
  });

  it('redirects to login with error when code is missing', async () => {
    const { GET } = await import('../auth/callback/route');
    const req = mockRequest('https://example.com/auth/callback');
    const res = await GET(req);

    expect(res.status).toBe(307); // redirect
    const location = res.headers.get('Location');
    expect(location).toContain('/login');
    expect(location).toContain('error=unauthorized');
  });

  it('redirects to login with error when code is empty', async () => {
    const { GET } = await import('../auth/callback/route');
    const req = mockRequest('https://example.com/auth/callback?code=');
    const res = await GET(req);

    expect(res.status).toBe(307);
    const location = res.headers.get('Location');
    expect(location).toContain('/login');
  });
});
