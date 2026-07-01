// ──────────────────────────────────────────────
// Water Purifier Service ERP — Devices API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = {
  ok: true, userId: 'user-1', role: 'technician' as const, tenantId: 'tenant-1', error: null as any,
};

vi.mock('@/lib/supabase/require-role', () => ({
  requireRole: vi.fn(() => Promise.resolve(mockAuth)),
}));

const mockDevices = [
  { id: 'dev-1', serialNo: 'SN-001', brand: 'AquaPure', model: 'AP-5000', tenantId: 'tenant-1', customerId: 'cust-1', status: 'ACTIVE', qrCode: 'QR-ABC', warrantyStart: null, warrantyEnd: null, installDate: null, notes: null, createdAt: new Date(), customer: { id: 'cust-1', name: 'Ahmet' } },
  { id: 'dev-2', serialNo: 'SN-002', brand: 'PureTech', model: 'PT-200', tenantId: 'tenant-1', customerId: 'cust-2', status: 'ACTIVE', qrCode: 'QR-DEF', warrantyStart: null, warrantyEnd: null, installDate: null, notes: null, createdAt: new Date(), customer: { id: 'cust-2', name: 'Ayşe' } },
];

const mockRepository = { findAll: vi.fn(), findById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), findByQrCode: vi.fn(), addPhoto: vi.fn(), deletePhoto: vi.fn(), addTdsReading: vi.fn() };

vi.mock('@/repositories/device.repository', () => ({
  DeviceRepository: class { constructor() { return mockRepository; } },
}));

function createMockNextRequest(url = 'http://localhost:3000/api/devices'): any {
  return { nextUrl: new URL(url), json: vi.fn().mockResolvedValue({}), headers: new Headers() };
}

describe('GET /api/devices', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all devices for the tenant', async () => {
    mockRepository.findAll.mockResolvedValue(mockDevices);
    const { GET } = await import('../devices/route');
    const res = await GET(createMockNextRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]!.serialNo).toBe('SN-001');
  });

  it('supports search parameter', async () => {
    mockRepository.findAll.mockResolvedValue([mockDevices[0]]);
    const { GET } = await import('../devices/route');
    const res = await GET(createMockNextRequest('http://localhost:3000/api/devices?search=SN-001'));
    expect(res.status).toBe(200);
    expect(mockRepository.findAll).toHaveBeenCalledWith({ search: 'SN-001', status: undefined, showDeleted: false });
  });

  it('filters by status', async () => {
    mockRepository.findAll.mockResolvedValue([mockDevices[0]]);
    const { GET } = await import('../devices/route');
    await GET(createMockNextRequest('http://localhost:3000/api/devices?status=ACTIVE'));
    expect(mockRepository.findAll).toHaveBeenCalledWith({ search: undefined, status: 'ACTIVE', showDeleted: false });
  });

  it('returns 401 when unauthenticated', async () => {
    const { requireRole } = await import('@/lib/supabase/require-role');
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, userId: null, role: null, tenantId: null, error: { status: 401, code: 'UNAUTHORIZED', message: '' } });
    const { GET } = await import('../devices/route');
    const res = await GET(createMockNextRequest());
    expect(res.status).toBe(401);
  });
});

describe('POST /api/devices', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a device with required fields', async () => {
    mockRepository.create.mockResolvedValue(mockDevices[0]);
    const { POST } = await import('../devices/route');
    const req = { json: vi.fn().mockResolvedValue({ serialNo: 'SN-001', brand: 'AquaPure', model: 'AP-5000' }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.id).toBe('dev-1');
  });

  it('returns 400 when serialNo missing', async () => {
    const { POST } = await import('../devices/route');
    const req = { json: vi.fn().mockResolvedValue({ brand: 'Test', model: 'M1' }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on invalid JSON', async () => {
    const { POST } = await import('../devices/route');
    const req = { json: vi.fn().mockRejectedValue(new Error('Invalid JSON')) } as any;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/devices/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns a device by id', async () => {
    mockRepository.findById.mockResolvedValue(mockDevices[0]);
    const { GET } = await import('../devices/[id]/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'dev-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe('dev-1');
  });

  it('returns 404 when not found', async () => {
    mockRepository.findById.mockRejectedValue(new Error('NOT_FOUND'));
    const { GET } = await import('../devices/[id]/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });

  it('returns 404 on repository error (route catches all as NOT_FOUND)', async () => {
    mockRepository.findById.mockRejectedValue(new Error('DB crash'));
    const { GET } = await import('../devices/[id]/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'dev-1' }) });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/devices/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates a device', async () => {
    mockRepository.update.mockResolvedValue({ ...mockDevices[0], notes: 'Güncellendi' });
    const { PUT } = await import('../devices/[id]/route');
    const req = { json: vi.fn().mockResolvedValue({ notes: 'Güncellendi' }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: 'dev-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.notes).toBe('Güncellendi');
  });

  it('returns 404 when not found', async () => {
    mockRepository.update.mockRejectedValue(new Error('NOT_FOUND'));
    const { PUT } = await import('../devices/[id]/route');
    const req = { json: vi.fn().mockResolvedValue({ notes: 'Test' }) } as any;
    const res = await PUT(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/devices/[id]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('soft-deletes a device', async () => {
    mockRepository.delete.mockResolvedValue(undefined);
    const { DELETE } = await import('../devices/[id]/route');
    const res = await DELETE(null as any, { params: Promise.resolve({ id: 'dev-1' }) });
    expect(res.status).toBe(200);
  });

  it('returns 404 when not found', async () => {
    mockRepository.delete.mockRejectedValue(new Error('NOT_FOUND'));
    const { DELETE } = await import('../devices/[id]/route');
    const res = await DELETE(null as any, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/devices/qr', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('finds device by QR code', async () => {
    mockRepository.findByQrCode.mockResolvedValue(mockDevices[0]);
    const { GET } = await import('../devices/qr/route');
    const req = createMockNextRequest('http://localhost:3000/api/devices/qr?code=QR-ABC');
    const res = await GET(req);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.id).toBe('dev-1');
  });

  it('returns 404 for unknown QR code', async () => {
    mockRepository.findByQrCode.mockResolvedValue(null);
    const { GET } = await import('../devices/qr/route');
    const req = createMockNextRequest('http://localhost:3000/api/devices/qr?code=UNKNOWN');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/devices/[id]/tds', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('adds a TDS reading', async () => {
    mockRepository.addTdsReading.mockResolvedValue({ id: 'tds-1', deviceId: 'dev-1', tdsValue: 120, createdAt: new Date() });
    const { POST } = await import('../devices/[id]/tds/route');
    const req = { json: vi.fn().mockResolvedValue({ tdsValue: 120 }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: 'dev-1' }) });
    const body = await res.json();
    expect(res.status).toBe(201);
  });

  it('returns 400 when tdsValue missing', async () => {
    const { POST } = await import('../devices/[id]/tds/route');
    const req = { json: vi.fn().mockResolvedValue({}) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: 'dev-1' }) });
    expect(res.status).toBe(400);
  });
});
