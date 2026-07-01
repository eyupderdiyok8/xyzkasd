// ──────────────────────────────────────────────
// Water Purifier Service ERP — Public Service Request API Tests
// Multi-Tenant SaaS
//
// No auth required — public endpoint for device owners
// Covers: POST /api/public/service-request
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    device: { findUnique: vi.fn() },
    serviceTicket: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('@/lib/audit.service', () => ({
  AuditService: { logCreate: vi.fn() },
}));

function mockReq(body: Record<string, unknown> = {}): any {
  return { json: vi.fn().mockResolvedValue(body) };
}

describe('POST /api/public/service-request', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a service ticket for a valid device', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockResolvedValue({
      id: 'dev-1', tenantId: 'tenant-1', customerId: 'cust-1',
    });
    (prisma.serviceTicket.findUnique as any).mockResolvedValue(null);
    (prisma.serviceTicket.create as any).mockResolvedValue({
      id: 'tkt-1', ticketNo: 'SRV-250630-A3F2', status: 'PENDING',
    });

    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ deviceId: 'dev-1', issueDesc: 'Su basıncı çok düşük, filtre değişmeli' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.ticketNo).toMatch(/^SRV-/);
    expect(body.data.status).toBe('PENDING');
    expect(body.data.message).toContain('başarıyla');
  });

  it('returns 400 when deviceId is missing', async () => {
    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ issueDesc: 'Su akıtmıyor' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when issueDesc is missing', async () => {
    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ deviceId: 'dev-1' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when issueDesc is shorter than 10 characters', async () => {
    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ deviceId: 'dev-1', issueDesc: 'Kısa' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on invalid JSON', async () => {
    const { POST } = await import('../public/service-request/route');
    const req = { json: vi.fn().mockRejectedValue(new Error('Invalid JSON')) };
    const res = await POST(req as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when device is not found', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockResolvedValue(null);

    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ deviceId: 'nonexistent', issueDesc: 'Su basıncı düşük, lütfen kontrol edin' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 when device has no customer', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockResolvedValue({
      id: 'dev-1', tenantId: 'tenant-1', customerId: null,
    });

    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ deviceId: 'dev-1', issueDesc: 'Su basıncı düşük, lütfen kontrol edin' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('handles ticket number collision by retrying', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockResolvedValue({
      id: 'dev-1', tenantId: 'tenant-1', customerId: 'cust-1',
    });
    // First call returns existing (collision), second returns null (ok)
    (prisma.serviceTicket.findUnique as any)
      .mockResolvedValueOnce({ ticketNo: 'SRV-250630-ABCD' })
      .mockResolvedValue(null);
    (prisma.serviceTicket.create as any).mockResolvedValue({
      id: 'tkt-2', ticketNo: 'SRV-250630-EFGH', status: 'PENDING',
    });

    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ deviceId: 'dev-1', issueDesc: 'Su basıncı düşük, lütfen kontrol edin' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.ticketNo).toBe('SRV-250630-EFGH');
  });

  it('returns 500 when unable to generate unique ticket number after retries', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockResolvedValue({
      id: 'dev-1', tenantId: 'tenant-1', customerId: 'cust-1',
    });
    // Always returns existing (infinite collision)
    (prisma.serviceTicket.findUnique as any).mockResolvedValue({ ticketNo: 'collision' });

    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ deviceId: 'dev-1', issueDesc: 'Su basıncı düşük, lütfen kontrol edin' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 on database error', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockRejectedValue(new Error('DB connection error'));

    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ deviceId: 'dev-1', issueDesc: 'Su basıncı düşük, lütfen kontrol edin' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('logs audit on successful ticket creation', async () => {
    const { prisma } = await import('@/lib/prisma');
    const { AuditService } = await import('@/lib/audit.service');
    (prisma.device.findUnique as any).mockResolvedValue({
      id: 'dev-1', tenantId: 'tenant-1', customerId: 'cust-1',
    });
    (prisma.serviceTicket.findUnique as any).mockResolvedValue(null);
    (prisma.serviceTicket.create as any).mockResolvedValue({
      id: 'tkt-3', ticketNo: 'SRV-250630-XYZ1', status: 'PENDING',
    });

    const { POST } = await import('../public/service-request/route');
    const req = mockReq({ deviceId: 'dev-1', issueDesc: 'Su basıncı düşük, lütfen kontrol edin' });
    await POST(req);

    expect(AuditService.logCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        entity: 'service_ticket',
        entityId: 'tkt-3',
      }),
    );
  });
});
