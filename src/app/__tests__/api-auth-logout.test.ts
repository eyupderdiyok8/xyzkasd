// ──────────────────────────────────────────────
// Water Purifier Service ERP — Auth Logout Route Tests
// Multi-Tenant SaaS
//
// Covers: GET /auth/logout (Supabase sign out + redirect)
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSignOut = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { signOut: mockSignOut },
  })),
}));

describe('GET /auth/logout', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('signs out and redirects to login page', async () => {
    const { GET } = await import('../auth/logout/route');
    const req = { nextUrl: new URL('https://example.com/auth/logout') } as any;
    const res = await GET(req);

    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(res.status).toBe(307); // redirect
    const location = res.headers.get('Location');
    expect(location).toContain('/login');
  });

  it('calls signOut on the supabase client', async () => {
    const { GET } = await import('../auth/logout/route');
    const req = { nextUrl: new URL('https://example.com/auth/logout') } as any;
    await GET(req);

    expect(mockSignOut).toHaveBeenCalled();
  });
});
