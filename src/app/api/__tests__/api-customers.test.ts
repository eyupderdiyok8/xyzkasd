// ──────────────────────────────────────────────
// Water Purifier Service ERP — Customers API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = {
  ok: true, userId: 'user-1', role: 'viewer' as const, tenantId: 'tenant-1', error: null as any,
};

vi.mock('@/lib/supabase/require-role', () => ({
  requireRole: vi.fn(() => Promise.resolve(mockAuth)),
}));

const mockCustomers = [
  { id: 'cust-1', name: 'Ahmet Yılmaz', email: 'ahmet@test.com', tenantId: 'tenant-1', isActive: true, tags: null, notes: null, createdAt: new Date('2025-01-01'), phones: [{ id: 'ph-1', phone: '+905551234567', isPrimary: true }], addresses: [], deviceCount: 1, ticketCount: 2 },
  { id: 'cust-2', name: 'Ayşe Demir', email: null, tenantId: 'tenant-1', isActive: true, tags: null, notes: null, createdAt: new Date('2025-01-02'), phones: [], addresses: [], deviceCount: 0, ticketCount: 1 },
];

const mockRepository = {
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/repositories/customer.repository', () => ({
  CustomerRepository: class { constructor() { return mockRepository; } },
}));

function createMockNextRequest(urlStr = 'http://localhost:3000/api/customers'): Request {
  return { url: urlStr, nextUrl: new URL(urlStr), json: vi.fn().mockResolvedValue({}), headers: new Headers() } as any;
}

describe('GET /api/customers', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all customers for the tenant', async () => {
    mockRepository.findAll.mockResolvedValue(mockCustomers);
    const { GET } = await import('../customers/route');
    const res = await GET(createMockNextRequest() as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]!.name).toBe('Ahmet Yılmaz');
  });

  it('supports search parameter', async () => {
    mockRepository.findAll.mockResolvedValue([mockCustomers[0]]);
    const { GET } = await import('../customers/route');
    const res = await GET(createMockNextRequest('http://localhost:3000/api/customers?search=Ahmet') as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(mockRepository.findAll).toHaveBeenCalledWith('Ahmet', false);
  });

  it('returns 401 when unauthenticated', async () => {
    const { requireRole } = await import('@/lib/supabase/require-role');
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, userId: null, role: null, tenantId: null, error: { status: 401, code: 'UNAUTHORIZED', message: '' } });
    const { GET } = await import('../customers/route');
    const res = await GET(createMockNextRequest() as any);
    expect(res.status).toBe(401);
  });

  it('returns 500 on repository error', async () => {
    mockRepository.findAll.mockRejectedValue(new Error('DB error'));
    const { GET } = await import('../customers/route');
    const res = await GET(createMockNextRequest() as any);
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('POST /api/customers', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a customer with minimum fields', async () => {
    mockRepository.create.mockResolvedValue(mockCustomers[0]);
    const { POST } = await import('../customers/route');
    const req = { json: vi.fn().mockResolvedValue({ name: 'Ahmet Yılmaz' }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.id).toBe('cust-1');
  });

  it('returns 400 when name is missing', async () => {
    const { POST } = await import('../customers/route');
    const req = { json: vi.fn().mockResolvedValue({ name: '' }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates customer with phones and addresses', async () => {
    mockRepository.create.mockResolvedValue(mockCustomers[0]);
    const { POST } = await import('../customers/route');
    const req = { json: vi.fn().mockResolvedValue({ name: 'Ahmet', phones: [{ phone: '+905551234567' }] }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({ phones: [{ phone: '+905551234567' }] }));
  });

  it('trims whitespace from name', async () => {
    mockRepository.create.mockResolvedValue(mockCustomers[0]);
    const { POST } = await import('../customers/route');
    const req = { json: vi.fn().mockResolvedValue({ name: '  Ahmet  ' }) } as any;
    await POST(req);
    expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ahmet' }));
  });
});

describe('GET /api/customers/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns a customer by id', async () => {
    mockRepository.findById.mockResolvedValue(mockCustomers[0]);
    const { GET } = await import('../customers/[id]/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'cust-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe('cust-1');
  });

  it('returns 404 when not found', async () => {
    mockRepository.findById.mockRejectedValue(new Error('NOT_FOUND'));
    const { GET } = await import('../customers/[id]/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });

  it('returns 401 when unauthenticated', async () => {
    const { requireRole } = await import('@/lib/supabase/require-role');
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, userId: null, role: null, tenantId: null, error: { status: 401, code: 'UNAUTHORIZED', message: '' } });
    const { GET } = await import('../customers/[id]/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'cust-1' }) });
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/customers/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates a customer', async () => {
    mockRepository.update.mockResolvedValue({ ...mockCustomers[0], name: 'Ahmet Güncel' });
    const { PUT } = await import('../customers/[id]/route');
    const req = { json: vi.fn().mockResolvedValue({ name: 'Ahmet Güncel' }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: 'cust-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.name).toBe('Ahmet Güncel');
  });

  it('returns 404 when updating nonexistent', async () => {
    mockRepository.update.mockRejectedValue(new Error('NOT_FOUND'));
    const { PUT } = await import('../customers/[id]/route');
    const req = { json: vi.fn().mockResolvedValue({ name: 'Test' }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/customers/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('soft-deletes a customer', async () => {
    mockRepository.delete.mockResolvedValue(undefined);
    const { DELETE } = await import('../customers/[id]/route');
    const res = await DELETE(null as any, { params: Promise.resolve({ id: 'cust-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.deleted).toBe(true);
  });

  it('returns 404 when deleting nonexistent', async () => {
    mockRepository.delete.mockRejectedValue(new Error('NOT_FOUND'));
    const { DELETE } = await import('../customers/[id]/route');
    const res = await DELETE(null as any, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });
});
