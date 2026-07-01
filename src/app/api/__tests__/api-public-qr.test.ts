// ──────────────────────────────────────────────
// Water Purifier Service ERP — Public QR Code API Tests
// Multi-Tenant SaaS
//
// No auth required — public endpoint for device QR lookups
// Covers: GET /api/public/qr/[code]
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    device: { findUnique: vi.fn() },
  },
}));

describe('GET /api/public/qr/[code]', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const mockDevice = {
    id: 'dev-1',
    serialNo: 'SN-001',
    brand: 'AquaPure',
    model: 'AP-5000',
    status: 'ACTIVE',
    warrantyStart: new Date('2025-01-01'),
    warrantyEnd: new Date('2028-01-01'),
    installDate: new Date('2025-01-15'),
    tenant: {
      id: 'tenant-1',
      name: 'Test Firma',
      logo: 'https://example.com/logo.png',
      phone: '+905551234567',
      email: 'info@test.com',
    },
    serviceTickets: [
      {
        id: 'tkt-1',
        ticketNo: 'SRV-001',
        status: 'COMPLETED',
        issueDesc: 'Filtre değişimi',
        resolution: 'Sediment değişti',
        createdAt: new Date('2025-06-01'),
        completedAt: new Date('2025-06-01'),
        technician: { name: 'Mehmet Usta' },
      },
    ],
    _count: { serviceTickets: 1 },
  };

  it('returns device info and service history for a valid QR code', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockResolvedValue(mockDevice);

    const { GET } = await import('../public/qr/[code]/route');
    const res = await GET(null as any, { params: { code: 'qr-abc123' } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('dev-1');
    expect(body.data.brand).toBe('AquaPure');
    expect(body.data.model).toBe('AP-5000');
    expect(body.data.serialNo).toBe('SN-001');
    expect(body.data.tenant.name).toBe('Test Firma');
    expect(body.data.serviceTickets).toHaveLength(1);
    expect(body.data.serviceTickets[0].ticketNo).toBe('SRV-001');
    expect(body.data._count.serviceTickets).toBe(1);
  });

  it('returns 404 for unknown QR code', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockResolvedValue(null);

    const { GET } = await import('../public/qr/[code]/route');
    const res = await GET(null as any, { params: { code: 'nonexistent' } });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns warranty dates as ISO strings', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockResolvedValue(mockDevice);

    const { GET } = await import('../public/qr/[code]/route');
    const res = await GET(null as any, { params: { code: 'qr-abc123' } });
    const body = await res.json();

    expect(body.data.warrantyStart).toBe('2025-01-01T00:00:00.000Z');
    expect(body.data.warrantyEnd).toBe('2028-01-01T00:00:00.000Z');
    expect(body.data.installDate).toBe('2025-01-15T00:00:00.000Z');
  });

  it('returns null warranty fields when not set', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockResolvedValue({
      ...mockDevice,
      warrantyStart: null,
      warrantyEnd: null,
      installDate: null,
    });

    const { GET } = await import('../public/qr/[code]/route');
    const res = await GET(null as any, { params: { code: 'qr-abc' } });
    const body = await res.json();

    expect(body.data.warrantyStart).toBeNull();
    expect(body.data.warrantyEnd).toBeNull();
    expect(body.data.installDate).toBeNull();
  });

  it('includes technician name in ticket history', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockResolvedValue(mockDevice);

    const { GET } = await import('../public/qr/[code]/route');
    const res = await GET(null as any, { params: { code: 'qr-abc' } });
    const body = await res.json();

    expect(body.data.serviceTickets[0].technician).toBe('Mehmet Usta');
  });

  it('returns null technician when not assigned', async () => {
    const { prisma } = await import('@/lib/prisma');
    const deviceNoTech = {
      ...mockDevice,
      serviceTickets: [{
        ...mockDevice.serviceTickets[0],
        technician: null,
      }],
    };
    (prisma.device.findUnique as any).mockResolvedValue(deviceNoTech);

    const { GET } = await import('../public/qr/[code]/route');
    const res = await GET(null as any, { params: { code: 'qr-abc' } });
    const body = await res.json();

    expect(body.data.serviceTickets[0].technician).toBeNull();
  });

  it('returns 500 on database error', async () => {
    const { prisma } = await import('@/lib/prisma');
    (prisma.device.findUnique as any).mockRejectedValue(new Error('DB error'));

    const { GET } = await import('../public/qr/[code]/route');
    const res = await GET(null as any, { params: { code: 'qr-abc' } });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});
