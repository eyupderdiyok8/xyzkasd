// ──────────────────────────────────────────────
// Water Purifier Service ERP — Public Routes API Tests
// Multi-Tenant SaaS
//
// Covers:
//   GET  /api/public/qr/[code]        — public device info by QR
//   POST /api/public/service-request  — public service request
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock prisma for both routes ───────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    device: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    serviceTicket: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Mock AuditService for service-request
vi.mock('@/lib/audit.service', () => ({
  AuditService: { logCreate: vi.fn() },
}));

function mockReq(body: Record<string, unknown> = {}): any {
  return { json: vi.fn().mockResolvedValue(body) };
}

// ─── QR Public Page ────────────────────────────

describe('GET /api/public/qr/:code', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns device info by QR code', async () => {
    const { prisma } = await import('@/lib/prisma');
    const mockDevice = {
      id: 'dev-1', serialNo: 'SN-001', brand: 'AquaPure', model: 'AP-5000',
      status: 'ACTIVE', warrantyStart: new Date('2024-01-01'), warrantyEnd: new Date('2027-01-01'),
      installDate: new Date('2024-01-15'),
      tenant: { name: 'Test Firma', logo: null, phone: '+905551234567', email: 'info@test.com' },
      serviceTickets: [
        { id: 'tkt-1', ticketNo: 'SRV-001', status: 'COMPLETED', issueDesc: 'Bakım', resolution: 'Filtre değişimi', createdAt: new Date('2025-06-01'), completedAt: new Date('2025-06-01'), technician: { name: 'Mehmet' } },
      ],
      _count: { serviceTickets: 1 },
    };
    (prisma.device.findUnique as any).mockResolvedValue(mockDevice);

    const { GET } = await import('../public/qr/[code]/route');
    const res = await GET(null as any, { params: { code: 'qr-abc-123' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.serialNo).toBe('SN-001');
    expect(body.data.tenant.name).toBe('Test Firma');
    expect(body.data.serviceTickets).toHaveLength(1);
    expect(body.data._count.serviceTickets).toBe(1);
  });

  it('returns 404 for unknown QR code', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockResolvedValue(null);

    const { GET } = await import('../public/qr/[code]/route');
    const res = await GET(null as any, { params: { code: 'invalid' } });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 500 on database error', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockRejectedValue(new Error('DB error'));

    const { GET } = await import('../public/qr/[code]/route');
    const res = await GET(null as any, { params: { code: 'qr-abc' } });

    expect(res.status).toBe(500);
  });
});

// ─── Public Service Request ────────────────────

describe('POST /api/public/service-request', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a service ticket from public request', async () => {
    const { prisma } = await import('@/lib/prisma');

    (prisma.device.findUnique as any).mockResolvedValue({
      id: 'dev-1', tenantId: 'tenant-1', customerId: 'customer-1',
    });
    (prisma.serviceTicket.findUnique as any).mockResolvedValue(null);
    (prisma.serviceTicket.create as any).mockResolvedValue({
      id: 'tkt-new', ticketNo: 'SRV-250630-ABC1', status: 'PENDING',
    });

    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ deviceId: 'dev-1', issueDesc: 'Su basıncı düşük, filtre değişimi gerekli' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.ticketNo).toBe('SRV-250630-ABC1');
    expect(body.data.status).toBe('PENDING');
    expect(body.data.message).toContain('başarıyla');
  });

  it('returns 400 when deviceId missing', async () => {
    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ issueDesc: 'Su basıncı düşük' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when issueDesc missing', async () => {
    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ deviceId: 'dev-1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when issueDesc is too short (< 10 chars)', async () => {
    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ deviceId: 'dev-1', issueDesc: 'Kısa' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid JSON', async () => {
    const { POST } = await import('../public/service-request/route');
    const req = { json: vi.fn().mockRejectedValue(new Error('Invalid JSON')) };
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 404 when device not found or has no customer', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockResolvedValue(null);

    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ deviceId: 'nonexistent', issueDesc: 'Su basıncı düşük, lütfen bakım yapın' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 500 on internal error', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockRejectedValue(new Error('DB error'));

    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ deviceId: 'dev-1', issueDesc: 'Su basıncı düşük, lütfen bakım yapın' });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
