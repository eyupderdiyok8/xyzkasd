// ──────────────────────────────────────────────
// Water Purifier Service ERP — Inventory API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = {
  ok: true, userId: 'user-1', role: 'technician' as const, tenantId: 'tenant-1', error: null as any,
};

vi.mock('@/lib/supabase/require-role', () => ({
  requireRole: vi.fn(() => Promise.resolve(mockAuth)),
}));

const mockItems = [
  { id: 'item-1', name: 'Sediment Filtre', sku: 'SED-001', quantity: 50, minStock: 10, unitPrice: 25, tenantId: 'tenant-1', createdAt: new Date() },
  { id: 'item-2', name: 'Karbon Blok', sku: 'CBN-001', quantity: 5, minStock: 10, unitPrice: 35, tenantId: 'tenant-1', createdAt: new Date() },
];

const mockRepository = { findAll: vi.fn(), findById: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(), stockIn: vi.fn(), stockOut: vi.fn(), getTransactions: vi.fn(), getCritical: vi.fn(), findCritical: vi.fn(), countCritical: vi.fn() };

vi.mock('@/repositories/inventory.repository', () => ({
  InventoryRepository: class { constructor() { return mockRepository; } },
}));

function mockReq(urlStr = 'http://localhost:3000/api/inventory', body = {}): any {
  return { url: urlStr, nextUrl: new URL(urlStr), json: vi.fn().mockResolvedValue(body), headers: new Headers() };
}

describe('GET /api/inventory', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all inventory items', async () => {
    mockRepository.findAll.mockResolvedValue(mockItems);
    const { GET } = await import('../inventory/route');
    const res = await GET(mockReq());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it('filters critical stock', async () => {
    mockRepository.findAll.mockResolvedValue([mockItems[1]]);
    const { GET } = await import('../inventory/route');
    await GET(mockReq('http://localhost:3000/api/inventory?critical=true'));
    expect(mockRepository.findAll).toHaveBeenCalledWith(expect.objectContaining({ critical: true }));
  });

  it('returns 401 when unauthenticated', async () => {
    const { requireRole } = await import('@/lib/supabase/require-role');
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, userId: null, role: null, tenantId: null, error: { status: 401, code: 'UNAUTHORIZED', message: '' } });
    const { GET } = await import('../inventory/route');
    const res = await GET(mockReq());
    expect(res.status).toBe(401);
  });

  it('returns 500 on error', async () => {
    mockRepository.findAll.mockRejectedValue(new Error('DB error'));
    const { GET } = await import('../inventory/route');
    const res = await GET(mockReq());
    expect(res.status).toBe(500);
  });
});

describe('POST /api/inventory', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a new inventory item', async () => {
    mockRepository.create.mockResolvedValue(mockItems[0]);
    const { POST } = await import('../inventory/route');
    const req = mockReq(undefined, { name: 'Sediment Filtre', sku: 'SED-001', quantity: 50, minStock: 10, unitPrice: 25 });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.id).toBe('item-1');
  });

  it('returns 400 when name missing', async () => {
    const { POST } = await import('../inventory/route');
    const req = mockReq(undefined, { sku: 'SED-001' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid JSON', async () => {
    const { POST } = await import('../inventory/route');
    const req = { json: vi.fn().mockRejectedValue(new Error('Invalid JSON')) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/inventory/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns a single item', async () => {
    mockRepository.findById.mockResolvedValue(mockItems[0]);
    const { GET } = await import('../inventory/[id]/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'item-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe('item-1');
  });

  it('returns 404 when not found', async () => {
    mockRepository.findById.mockRejectedValue(new Error('NOT_FOUND'));
    const { GET } = await import('../inventory/[id]/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/inventory/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates an inventory item', async () => {
    mockRepository.update.mockResolvedValue({ ...mockItems[0], name: 'Premium Sediment' });
    const { PUT } = await import('../inventory/[id]/route');
    const req = { json: vi.fn().mockResolvedValue({ name: 'Premium Sediment' }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: 'item-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe('Premium Sediment');
  });

  it('returns 400 on invalid JSON', async () => {
    const { PUT } = await import('../inventory/[id]/route');
    const req = { json: vi.fn().mockRejectedValue(new Error('Invalid JSON')) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: 'item-1' }) });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/inventory/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('removes an inventory item', async () => {
    mockRepository.remove.mockResolvedValue(undefined);
    const { DELETE } = await import('../inventory/[id]/route');
    const res = await DELETE(null as any, { params: Promise.resolve({ id: 'item-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
  });

  it('requires manager role', async () => {
    const { requireRole } = await import('@/lib/supabase/require-role');
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, userId: null, role: null, tenantId: null, error: { status: 403, code: 'FORBIDDEN', message: '' } });
    const { DELETE } = await import('../inventory/[id]/route');
    const res = await DELETE(null as any, { params: Promise.resolve({ id: 'item-1' }) });
    expect(res.status).toBe(403);
  });
});

describe('POST /api/inventory/[id]/stock-in & stock-out', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('stock-in adds quantity', async () => {
    mockRepository.stockIn.mockResolvedValue({ ...mockItems[0], quantity: 60 });
    const { POST } = await import('../inventory/[id]/stock-in/route');
    const req = { json: vi.fn().mockResolvedValue({ quantity: 10 }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: 'item-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mockRepository.stockIn).toHaveBeenCalledWith('item-1', expect.objectContaining({
      type: 'IN',
      quantity: 10,
    }));
  });

  it('stock-in returns 400 when quantity missing', async () => {
    const { POST } = await import('../inventory/[id]/stock-in/route');
    const req = { json: vi.fn().mockResolvedValue({}) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: 'item-1' }) });
    expect(res.status).toBe(400);
  });

  it('stock-out removes quantity', async () => {
    mockRepository.stockOut.mockResolvedValue({ ...mockItems[0], quantity: 40 });
    const { POST } = await import('../inventory/[id]/stock-out/route');
    const req = { json: vi.fn().mockResolvedValue({ quantity: 10 }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: 'item-1' }) });
    expect(res.status).toBe(200);
    expect(mockRepository.stockOut).toHaveBeenCalledWith('item-1', expect.objectContaining({
      type: 'OUT',
      quantity: 10,
    }));
  });

  it('stock-out returns 400 when quantity missing', async () => {
    const { POST } = await import('../inventory/[id]/stock-out/route');
    const req = { json: vi.fn().mockResolvedValue({}) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: 'item-1' }) });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/inventory/critical', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns critical stock items', async () => {
    mockRepository.findCritical.mockResolvedValue([mockItems[1]]);
    mockRepository.countCritical.mockResolvedValue(1);
    const { GET } = await import('../inventory/critical/route');
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
  });
});
