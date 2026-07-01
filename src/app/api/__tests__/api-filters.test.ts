// ──────────────────────────────────────────────
// Water Purifier Service ERP — Filters API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = { ok: true, userId: 'user-1', role: 'technician' as const, tenantId: 'tenant-1', error: null as any };

vi.mock('@/lib/supabase/require-role', () => ({ requireRole: vi.fn(() => Promise.resolve(mockAuth)) }));

const mockCatalogs = [
  { id: 'fc-1', name: 'Sediment Filtre', stage: 'SEDIMENT', expectedLifespanDays: 180 },
  { id: 'fc-2', name: 'Karbon Blok', stage: 'CARBON_BLOCK', expectedLifespanDays: 180 },
];
const mockTracking = [
  { id: 'ft-1', deviceId: 'dev-1', filterCatalogId: 'fc-1', installedAt: new Date(), expectedLifespanDays: 180, filter: mockCatalogs[0], device: { id: 'dev-1', serialNo: 'SN-001', brand: 'AP', model: 'M1', customer: { name: 'Ahmet' } } },
];
const mockFilterRepo = { findAllCatalogs: vi.fn(), findByDevice: vi.fn(), findAll: vi.fn() };

vi.mock('@/repositories/filter-tracking.repository', () => ({ FilterTrackingRepository: class { constructor() { return mockFilterRepo; } } }));

const mockTicketRepo = { getFilterCatalogs: vi.fn(), findAll: vi.fn() };
vi.mock('@/repositories/service-ticket.repository', () => ({ ServiceTicketRepository: class { constructor() { return mockTicketRepo; } } }));

function createMockNextRequest(url = 'http://localhost:3000/api/filters'): any {
  return { nextUrl: new URL(url), headers: new Headers() };
}

describe('GET /api/filters', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns filter catalogs by default', async () => {
    mockTicketRepo.getFilterCatalogs.mockResolvedValue(mockCatalogs);
    const { GET } = await import('../filters/route');
    const res = await GET(createMockNextRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it('returns filter tracking when tracking=true', async () => {
    mockFilterRepo.findAll.mockResolvedValue(mockTracking);
    const { GET } = await import('../filters/route');
    const res = await GET(createMockNextRequest('http://localhost:3000/api/filters?tracking=true'));
    expect(res.status).toBe(200);
  });

  it('supports showDeleted param for manager+ roles', async () => {
    mockTicketRepo.getFilterCatalogs.mockResolvedValue(mockCatalogs);
    const { GET } = await import('../filters/route');
    const res = await GET(createMockNextRequest('http://localhost:3000/api/filters?showDeleted=true'));
    expect(res.status).toBe(200);
  });

  it('returns 500 on repository error', async () => {
    mockTicketRepo.getFilterCatalogs.mockRejectedValue(new Error('DB error'));
    const { GET } = await import('../filters/route');
    const res = await GET(createMockNextRequest());
    expect(res.status).toBe(500);
  });
});
