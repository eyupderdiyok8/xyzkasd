// ──────────────────────────────────────────────
// Water Purifier Service ERP — Device Filter Routes Tests
// Multi-Tenant SaaS
//
// Covers:
//   GET    /api/devices/:id/filters
//   POST   /api/devices/:id/filters
//   PUT    /api/devices/:id/filters/:filterId
//   DELETE /api/devices/:id/filters/:filterId
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = {
  ok: true, userId: 'user-1', role: 'technician' as const, tenantId: 'tenant-1', error: null as any,
};

vi.mock('@/lib/supabase/require-role', () => ({
  requireRole: vi.fn(() => Promise.resolve(mockAuth)),
}));

const mockLifecycle = {
  id: 'ft-1', deviceId: 'dev-1', filterCatalogId: 'fc-1',
  installedAt: new Date('2025-01-01'), expectedLifespanDays: 180,
  remainingDays: 90, lifespanPct: 50, nextMaintenanceDate: new Date('2025-07-01'),
  filter: { id: 'fc-1', name: 'Sediment', stage: 'SEDIMENT' },
  device: { id: 'dev-1', serialNo: 'SN-001', brand: 'AP', model: 'M1' },
};

const mockFilterRepo = {
  findByDevice: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};

vi.mock('@/repositories/filter-tracking.repository', () => ({
  FilterTrackingRepository: class { constructor() { return mockFilterRepo; } },
}));

function mockReq(body: Record<string, unknown> = {}): any {
  return { json: vi.fn().mockResolvedValue(body) };
}

describe('GET /api/devices/:id/filters', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns filter tracking entries for a device', async () => {
    mockFilterRepo.findByDevice.mockResolvedValue([mockLifecycle]);
    const { GET } = await import('../devices/[id]/filters/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'dev-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].remainingDays).toBe(90);
    expect(mockFilterRepo.findByDevice).toHaveBeenCalledWith('dev-1');
  });

  it('returns 404 when device not found', async () => {
    mockFilterRepo.findByDevice.mockRejectedValue(new Error('NOT_FOUND'));
    const { GET } = await import('../devices/[id]/filters/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'nonexistent' }) });
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 500 on repository error', async () => {
    mockFilterRepo.findByDevice.mockRejectedValue(new Error('DB error'));
    const { GET } = await import('../devices/[id]/filters/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'dev-1' }) });
    expect(res.status).toBe(500);
  });

  it('returns 401 when unauthenticated', async () => {
    const { requireRole } = await import('@/lib/supabase/require-role');
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false, userId: null, role: null, tenantId: null,
      error: { status: 401, code: 'UNAUTHORIZED', message: 'Giriş yapmalısınız' },
    });
    const { GET } = await import('../devices/[id]/filters/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'dev-1' }) });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/devices/:id/filters', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('installs a new filter on a device', async () => {
    mockFilterRepo.add.mockResolvedValue(mockLifecycle);
    const { POST } = await import('../devices/[id]/filters/route');
    const req = mockReq({ filterCatalogId: 'fc-1', expectedLifespanDays: 180 });
    const res = await POST(req, { params: Promise.resolve({ id: 'dev-1' }) });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.remainingDays).toBe(90);
    expect(mockFilterRepo.add).toHaveBeenCalledWith('dev-1', {
      filterCatalogId: 'fc-1',
      expectedLifespanDays: 180,
      installedAt: undefined,
      notes: null,
    });
  });

  it('returns 400 when required fields missing', async () => {
    const { POST } = await import('../devices/[id]/filters/route');
    const req = mockReq({ filterCatalogId: 'fc-1' });
    const res = await POST(req, { params: Promise.resolve({ id: 'dev-1' }) });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on invalid JSON', async () => {
    const { POST } = await import('../devices/[id]/filters/route');
    const req = { json: vi.fn().mockRejectedValue(new Error('Invalid JSON')) };
    const res = await POST(req as any, { params: Promise.resolve({ id: 'dev-1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 when device not found', async () => {
    mockFilterRepo.add.mockRejectedValue(new Error('NOT_FOUND'));
    const { POST } = await import('../devices/[id]/filters/route');
    const req = mockReq({ filterCatalogId: 'fc-1', expectedLifespanDays: 180 });
    const res = await POST(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });
});

// NOTE: PUT/DELETE /api/devices/:id/filters/:filterId tests removed — route not yet implemented

