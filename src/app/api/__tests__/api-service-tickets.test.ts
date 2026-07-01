// ──────────────────────────────────────────────
// Water Purifier Service ERP — Service Tickets API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// ─── Mock requireRole ─────────────────────────

const mockAuth = {
  ok: true,
  userId: 'user-1',
  role: 'technician' as const,
  tenantId: 'tenant-1',
  error: null as any,
};

vi.mock('@/lib/supabase/require-role', () => ({
  requireRole: vi.fn(() => Promise.resolve(mockAuth)),
}));

vi.mock('@/lib/supabase/require-feature', () => ({
  requireFeature: vi.fn(() => Promise.resolve({ ...mockAuth, plan: 'PROFESSIONAL' })),
}));

// ─── Mock Repository ──────────────────────────

const mockTickets = [
  {
    id: 'ticket-1',
    ticketNo: 'SRV-001',
    tenantId: 'tenant-1',
    customerId: 'customer-1',
    deviceId: 'device-1',
    technicianId: 'user-1',
    status: 'PENDING',
    issueDesc: 'Su basıncı düşük',
    createdAt: new Date('2025-01-15'),
    scheduledAt: null,
    completedAt: null,
    customer: { id: 'customer-1', name: 'Ahmet Yılmaz', phone: '+905551234567' },
    device: { id: 'device-1', brand: 'AquaPure', model: 'AP-5000', serialNo: 'SN-001' },
    technician: { id: 'user-1', name: 'Mehmet Usta' },
  },
  {
    id: 'ticket-2',
    ticketNo: 'SRV-002',
    tenantId: 'tenant-1',
    customerId: 'customer-2',
    deviceId: 'device-2',
    technicianId: 'user-1',
    status: 'COMPLETED',
    issueDesc: 'Filtre değişimi',
    createdAt: new Date('2025-01-14'),
    scheduledAt: null,
    completedAt: new Date('2025-01-16'),
    customer: { id: 'customer-2', name: 'Ayşe Demir', phone: '+905559876543' },
    device: { id: 'device-2', brand: 'PureTech', model: 'PT-200', serialNo: 'SN-002' },
    technician: { id: 'user-1', name: 'Mehmet Usta' },
  },
];

const mockSingleTicket = {
  ...mockTickets[0]!,
  tdsBefore: 250,
  tdsAfter: 45,
  pressureBefore: 3.5,
  pressureAfter: 4.2,
  leakCheck: false,
  workDone: 'Basınç ayarı yapıldı',
  filterChanges: [],
  customerNote: null,
};

const mockRepository = {
  findAll: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  completeService: vi.fn(),
  getTenant: vi.fn(),
  updatePdfStoragePath: vi.fn(),
};

vi.mock('@/repositories/service-ticket.repository', () => ({
  ServiceTicketRepository: class { constructor() { return mockRepository; } },
}));

vi.mock('@/repositories/survey.repository', () => ({
  SurveyRepository: vi.fn(() => ({
    sendSurvey: vi.fn(),
    getTenant: vi.fn().mockResolvedValue({ name: 'Test Firma' }),
  })),
}));

// ─── Mock heavy dependencies ──────────────────

vi.mock('@/lib/automation', () => ({
  AutomationEngine: vi.fn(() => ({
    fireTrigger: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@/lib/storage/service-report', () => ({
  generateServiceReport: vi.fn().mockResolvedValue(Buffer.from('fake-pdf')),
  saveReportToStorage: vi.fn().mockResolvedValue({
    publicUrl: 'https://storage.example.com/report.pdf',
    storagePath: 'tenants/tenant-1/reports/report.pdf',
  }),
}));

vi.mock('@/lib/whatsapp/waha-manager', () => ({
  getWahaManager: vi.fn(() => ({
    sendMessage: vi.fn().mockResolvedValue({ success: true, messageId: 'wa-msg-1' }),
  })),
}));

vi.mock('@/lib/whatsapp/notify', () => ({
  buildSurveyInvitationText: vi.fn().mockReturnValue('Anket davet metni'),
}));

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    json: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as Request;
}

function createMockNextRequest(url = 'http://localhost:3000/api/service-tickets', overrides: Partial<NextRequest> = {}): NextRequest {
  return {
    nextUrl: new URL(url),
    json: vi.fn().mockResolvedValue({}),
    headers: new Headers(),
    ...overrides,
  } as unknown as NextRequest;
}

// ─── Tests ────────────────────────────────────

describe('GET /api/service-tickets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns all service tickets for the tenant', async () => {
    mockRepository.findAll.mockResolvedValue(mockTickets);
    const { GET } = await import('../service-tickets/route');

    const req = createMockNextRequest('http://localhost:3000/api/service-tickets');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0]!.ticketNo).toBe('SRV-001');
    expect(mockRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined }),
    );
  });

  it('filters by status when provided', async () => {
    mockRepository.findAll.mockResolvedValue([mockTickets[0]]);
    const { GET } = await import('../service-tickets/route');

    const req = createMockNextRequest('http://localhost:3000/api/service-tickets?status=PENDING');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(mockRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'PENDING' }),
    );
  });

  it('searches when search param is provided', async () => {
    mockRepository.findAll.mockResolvedValue([mockTickets[0]]);
    const { GET } = await import('../service-tickets/route');

    const req = createMockNextRequest('http://localhost:3000/api/service-tickets?search=basınç');
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockRepository.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'basınç' }),
    );
  });

  it('returns 401 when unauthenticated', async () => {
    const { requireRole } = await import('@/lib/supabase/require-role');
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false, userId: null, role: null, tenantId: null,
      error: { status: 401, code: 'UNAUTHORIZED', message: 'Giriş yapmalısınız' },
    });

    const { GET } = await import('../service-tickets/route');
    const req = createMockNextRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 500 when repository throws', async () => {
    mockRepository.findAll.mockRejectedValue(new Error('DB error'));
    const { GET } = await import('../service-tickets/route');

    const req = createMockNextRequest();
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error.code).toBe('INTERNAL_ERROR');
  });
});

describe('POST /api/service-tickets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new service ticket', async () => {
    const newTicket = { ...mockTickets[0], id: 'ticket-new' };
    mockRepository.create.mockResolvedValue(newTicket);
    const { POST } = await import('../service-tickets/route');

    const req = createMockRequest({
      json: vi.fn().mockResolvedValue({
        customerId: 'customer-1',
        deviceId: 'device-1',
        issueDesc: 'Su kaçağı var',
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.id).toBe('ticket-new');
    expect(mockRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'customer-1',
        deviceId: 'device-1',
        issueDesc: 'Su kaçağı var',
      }),
    );
  });

  it('returns 400 when required fields missing', async () => {
    const { POST } = await import('../service-tickets/route');

    const req = createMockRequest({
      json: vi.fn().mockResolvedValue({ customerId: 'customer-1' }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 on invalid JSON', async () => {
    const { POST } = await import('../service-tickets/route');

    const req = createMockRequest({
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('requires manager role', async () => {
    const { requireRole } = await import('@/lib/supabase/require-role');
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false, userId: null, role: null, tenantId: null,
      error: { status: 403, code: 'FORBIDDEN', message: 'Yetkiniz yok' },
    });

    const { POST } = await import('../service-tickets/route');
    const req = createMockRequest();
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });
});

describe('GET /api/service-tickets/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a single ticket by id', async () => {
    mockRepository.findById.mockResolvedValue(mockSingleTicket);
    const { GET } = await import('../service-tickets/[id]/route');

    const res = await GET(null as any, { params: Promise.resolve({ id: 'ticket-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.id).toBe('ticket-1');
    expect(body.data.issueDesc).toBe('Su basıncı düşük');
  });

  it('returns 404 when ticket not found', async () => {
    mockRepository.findById.mockRejectedValue(new Error('NOT_FOUND'));
    const { GET } = await import('../service-tickets/[id]/route');

    const res = await GET(null as any, { params: Promise.resolve({ id: 'nonexistent' }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 401 when unauthenticated', async () => {
    const { requireRole } = await import('@/lib/supabase/require-role');
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false, userId: null, role: null, tenantId: null,
      error: { status: 401, code: 'UNAUTHORIZED', message: 'Giriş yapmalısınız' },
    });

    const { GET } = await import('../service-tickets/[id]/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'ticket-1' }) });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('PUT /api/service-tickets/[id] (complete service)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository.findById.mockResolvedValue(mockSingleTicket);
    mockRepository.completeService.mockResolvedValue({ ...mockSingleTicket, status: 'COMPLETED' });
  });

  it('completes a service with measurements', async () => {
    const { PUT } = await import('../service-tickets/[id]/route');

    const req = createMockRequest({
      json: vi.fn().mockResolvedValue({
        tdsBefore: 250,
        tdsAfter: 45,
        pressureBefore: 3.5,
        pressureAfter: 4.2,
        leakCheck: false,
        workDone: 'Filtre değişimi yapıldı',
        filterChanges: [{ filterId: 'filter-1', quantity: 1 }],
      }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: 'ticket-1' }) });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.status).toBe('COMPLETED');
    expect(mockRepository.completeService).toHaveBeenCalledWith(
      'ticket-1',
      expect.objectContaining({
        tdsBefore: 250,
        tdsAfter: 45,
        leakCheck: false,
        filterChanges: [{ filterId: 'filter-1', quantity: 1 }],
      }),
    );
  });

  it('returns 400 on invalid JSON', async () => {
    const { PUT } = await import('../service-tickets/[id]/route');

    const req = createMockRequest({
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: 'ticket-1' }) });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when ticket not found', async () => {
    mockRepository.completeService.mockRejectedValue(new Error('NOT_FOUND'));
    const { PUT } = await import('../service-tickets/[id]/route');

    const req = createMockRequest({
      json: vi.fn().mockResolvedValue({ workDone: 'Bakım yapıldı' }),
    });
    const res = await PUT(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });
});
