// ──────────────────────────────────────────────
// Water Purifier Service ERP — Coupons API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = {
  ok: true, userId: 'user-1', role: 'manager' as const, tenantId: 'tenant-1', error: null as any,
};

vi.mock('@/lib/supabase/require-role', () => ({
  requireRole: vi.fn(() => Promise.resolve(mockAuth)),
}));

const mockCoupons = [
  { id: 'cpn-1', code: 'INDIRIM20', discountPct: 20, maxUses: 1, currentUses: 0, isActive: true, expiresAt: null, description: null, tenantId: 'tenant-1', createdAt: new Date() },
  { id: 'cpn-2', code: 'KISINDIRIM', discountPct: 15, maxUses: 10, currentUses: 3, isActive: true, expiresAt: new Date('2026-12-31'), description: 'Kış indirimi', tenantId: 'tenant-1', createdAt: new Date() },
];

const mockRepository = { findAll: vi.fn(), findById: vi.fn(), findByCode: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), validate: vi.fn(), use: vi.fn() };

vi.mock('@/repositories/coupon.repository', () => ({
  CouponRepository: class { constructor() { return mockRepository; } },
}));

function mockReq(body = {}): any {
  return { url: 'http://localhost:3000/api/coupons', nextUrl: new URL('http://localhost:3000/api/coupons'), json: vi.fn().mockResolvedValue(body), headers: new Headers() };
}

describe('GET /api/coupons', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns all coupons', async () => {
    mockRepository.findAll.mockResolvedValue(mockCoupons);
    const { GET } = await import('../coupons/route');
    const res = await GET(mockReq());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });
  it('returns 401 when unauthenticated', async () => {
    const { requireRole } = await import('@/lib/supabase/require-role');
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, userId: null, role: null, tenantId: null, error: { status: 401, code: 'UNAUTHORIZED', message: '' } });
    const { GET } = await import('../coupons/route');
    const res = await GET(mockReq());
    expect(res.status).toBe(401);
  });
});

describe('POST /api/coupons', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('creates a coupon', async () => {
    mockRepository.create.mockResolvedValue(mockCoupons[0]);
    const { POST } = await import('../coupons/route');
    const req = mockReq({ code: 'INDIRIM20', discountPct: 20 });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.id).toBe('cpn-1');
  });
  it('returns 400 when code missing', async () => {
    const { POST } = await import('../coupons/route');
    const req = mockReq({ discountPct: 20 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
  it('returns 400 when discountPct invalid', async () => {
    const { POST } = await import('../coupons/route');
    const req = mockReq({ code: 'TEST', discountPct: 0 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
  it('returns 400 when discountPct > 100', async () => {
    const { POST } = await import('../coupons/route');
    const req = mockReq({ code: 'TEST', discountPct: 150 });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
  it('returns 409 on duplicate code', async () => {
    mockRepository.create.mockRejectedValue(new Error('DUPLICATE_CODE'));
    const { POST } = await import('../coupons/route');
    const req = mockReq({ code: 'EXISTING', discountPct: 10 });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
  });
});

describe('POST /api/coupons/validate', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('validates a coupon without consuming', async () => {
    mockRepository.validate.mockResolvedValue(mockCoupons[0]);
    const { POST } = await import('../coupons/validate/route');
    const req = mockReq({ code: 'INDIRIM20', validateOnly: true });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.valid).toBe(true);
  });
  it('validates and consumes a coupon', async () => {
    mockRepository.use.mockResolvedValue({ ...mockCoupons[0], currentUses: 1 });
    const { POST } = await import('../coupons/validate/route');
    const req = mockReq({ code: 'INDIRIM20' });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.used).toBe(true);
  });
  it('returns 400 when code missing', async () => {
    const { POST } = await import('../coupons/validate/route');
    const req = mockReq({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
  it('maps NOT_FOUND to 404', async () => {
    mockRepository.validate.mockRejectedValue(new Error('NOT_FOUND'));
    const { POST } = await import('../coupons/validate/route');
    const req = mockReq({ code: 'UNKNOWN', validateOnly: true });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
  it('maps EXPIRED to 400', async () => {
    mockRepository.use.mockRejectedValue(new Error('EXPIRED'));
    const { POST } = await import('../coupons/validate/route');
    const req = mockReq({ code: 'EXPIRED' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/coupons/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns a coupon by id', async () => {
    mockRepository.findById.mockResolvedValue(mockCoupons[0]);
    const { GET } = await import('../coupons/[id]/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'cpn-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe('cpn-1');
  });
  it('returns 404 when not found', async () => {
    mockRepository.findById.mockRejectedValue(new Error('NOT_FOUND'));
    const { GET } = await import('../coupons/[id]/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/coupons/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('updates a coupon', async () => {
    mockRepository.update.mockResolvedValue({ ...mockCoupons[0], discountPct: 25 });
    const { PUT } = await import('../coupons/[id]/route');
    const req = mockReq({ discountPct: 25 });
    const res = await PUT(req, { params: Promise.resolve({ id: 'cpn-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.discountPct).toBe(25);
  });
});

describe('DELETE /api/coupons/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('soft-deletes a coupon', async () => {
    mockRepository.delete.mockResolvedValue(undefined);
    const { DELETE } = await import('../coupons/[id]/route');
    const res = await DELETE(null as any, { params: Promise.resolve({ id: 'cpn-1' }) });
    expect(res.status).toBe(200);
  });
});
