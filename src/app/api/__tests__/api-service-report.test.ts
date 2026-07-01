// ──────────────────────────────────────────────
// Water Purifier Service ERP — Service Report API Tests
// Multi-Tenant SaaS
//
// Covers: POST /api/service-tickets/:id/report
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = {
  ok: true, userId: 'user-1', role: 'technician' as const, tenantId: 'tenant-1', error: null as any,
};

vi.mock('@/lib/supabase/require-role', () => ({
  requireRole: vi.fn(() => Promise.resolve(mockAuth)),
}));

// Profile returned by getRepo
const mockProfile = {
  id: 'user-1', tenant_id: 'tenant-1', role: 'technician', is_active: true,
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
        })),
      })),
    })),
  })),
}));

const mockCompletedTicket = {
  id: 'ticket-1', ticketNo: 'SRV-001', status: 'COMPLETED',
  tenantId: 'tenant-1',
  issueDesc: 'Su basıncı düşük',
  workDone: 'Filtre değişimi yapıldı',
  customerNote: 'Müşteri memnun',
  tdsBefore: 450, tdsAfter: 120,
  pressureBefore: 3, pressureAfter: 5,
  leakCheck: false, leakNotes: null,
  resolution: 'Filtreler değiştirildi',
  signatureDataUrl: 'data:image/png;base64,iVBORw0KGgo=',
  signatureName: 'Ahmet Yılmaz',
  completedAt: new Date('2025-06-29'),
  customer: { id: 'cust-1', name: 'Ahmet Yılmaz', phone: '+905551234567', address: 'Kadıköy', city: 'İstanbul', district: 'Kadıköy' },
  device: { id: 'dev-1', brand: 'AquaPure', model: 'AP-5000', serialNo: 'SN-001' },
  technician: { id: 'tech-1', name: 'Mehmet Usta' },
  filterChanges: [
    { id: 'fc-1', quantity: 1, filter: { id: 'flt-1', name: 'Sediment 5µ', stage: 'SEDIMENT' } },
  ],
};

const mockPendingTicket = {
  ...mockCompletedTicket, id: 'ticket-2', ticketNo: 'SRV-002', status: 'PENDING',
  completedAt: null,
};

const mockTenant = { id: 'tenant-1', name: 'Test Firma', phone: '+905551234567', email: 'info@test.com', address: 'İstanbul' };

const mockRepo = {
  findById: vi.fn(),
  getTenant: vi.fn(),
  updatePdfStoragePath: vi.fn(),
};

vi.mock('@/repositories/service-ticket.repository', () => ({
  ServiceTicketRepository: class { constructor() { return mockRepo; } },
}));

vi.mock('@/lib/storage/service-report', () => ({
  generateServiceReport: vi.fn().mockResolvedValue(Buffer.from('fake-pdf-buffer')),
  saveReportToStorage: vi.fn().mockResolvedValue({
    publicUrl: 'https://storage.example.com/reports/SRV-001.pdf',
    storagePath: 'tenant-1/service-reports/SRV-001.pdf',
  }),
}));

describe('POST /api/service-tickets/:id/report', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('generates PDF report for a completed ticket', async () => {
    mockRepo.findById.mockResolvedValue(mockCompletedTicket);
    mockRepo.getTenant.mockResolvedValue(mockTenant);

    const { POST } = await import('../service-tickets/[id]/report/route');
    const res = await POST(null as any, { params: Promise.resolve({ id: 'ticket-1' }) });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.publicUrl).toContain('storage.example.com');
    expect(body.data.storagePath).toBe('tenant-1/service-reports/SRV-001.pdf');
    expect(mockRepo.updatePdfStoragePath).toHaveBeenCalledWith('ticket-1', 'tenant-1/service-reports/SRV-001.pdf');
  });

  it('returns 400 when ticket is not COMPLETED', async () => {
    mockRepo.findById.mockResolvedValue(mockPendingTicket);

    const { POST } = await import('../service-tickets/[id]/report/route');
    const res = await POST(null as any, { params: Promise.resolve({ id: 'ticket-2' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('tamamlanmış');
  });

  it('returns 500 when ticket not found (route catches all as 500)', async () => {
    mockRepo.findById.mockRejectedValue(new Error('NOT_FOUND'));

    const { POST } = await import('../service-tickets/[id]/report/route');
    const res = await POST(null as any, { params: Promise.resolve({ id: 'nonexistent' }) });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });

  it('returns 500 on PDF generation failure', async () => {
    mockRepo.findById.mockResolvedValue(mockCompletedTicket);
    mockRepo.getTenant.mockResolvedValue(mockTenant);

    const { generateServiceReport } = await import('@/lib/storage/service-report');
    vi.mocked(generateServiceReport).mockRejectedValueOnce(new Error('PDF generation failed'));

    const { POST } = await import('../service-tickets/[id]/report/route');
    const res = await POST(null as any, { params: Promise.resolve({ id: 'ticket-1' }) });

    expect(res.status).toBe(500);
  });

  it('returns 500 on storage save failure', async () => {
    mockRepo.findById.mockResolvedValue(mockCompletedTicket);
    mockRepo.getTenant.mockResolvedValue(mockTenant);

    const { saveReportToStorage } = await import('@/lib/storage/service-report');
    vi.mocked(saveReportToStorage).mockRejectedValueOnce(new Error('Storage error'));

    const { POST } = await import('../service-tickets/[id]/report/route');
    const res = await POST(null as any, { params: Promise.resolve({ id: 'ticket-1' }) });

    expect(res.status).toBe(500);
  });

  it('returns 401 when unauthenticated', async () => {
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');
    vi.mocked(createServerSupabaseClient).mockReturnValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'No session' } }) },
      from: vi.fn(),
    } as any);

    const { POST } = await import('../service-tickets/[id]/report/route');
    const res = await POST(null as any, { params: Promise.resolve({ id: 'ticket-1' }) });

    expect(res.status).toBe(401);
  });
});
