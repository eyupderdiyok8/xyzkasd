// ──────────────────────────────────────────────
// Water Purifier Service ERP — Survey API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = { ok: true, userId: 'user-1', role: 'technician' as const, tenantId: 'tenant-1', error: null as any };
vi.mock('@/lib/supabase/require-role', () => ({ requireRole: vi.fn(() => Promise.resolve(mockAuth)) }));

const mockSurveyRepo = { sendSurvey: vi.fn(), getTenant: vi.fn().mockResolvedValue({ name: 'Test Firma', phone: '+905551111111' }), respond: vi.fn(), findByTicket: vi.fn(), findById: vi.fn(), findAll: vi.fn(), getStats: vi.fn() };
const mockTicketRepo = { findById: vi.fn() };

vi.mock('@/repositories/survey.repository', () => ({ SurveyRepository: class { constructor() { return mockSurveyRepo; } } }));
vi.mock('@/repositories/service-ticket.repository', () => ({ ServiceTicketRepository: class { constructor() { return mockTicketRepo; } } }));
vi.mock('@/lib/whatsapp/waha-manager', () => ({ getWahaManager: vi.fn(() => ({ sendMessage: vi.fn().mockResolvedValue({ success: true, messageId: 'wa-msg-1' }) })) }));
vi.mock('@/lib/whatsapp/notify', () => ({ buildSurveyInvitationText: vi.fn().mockReturnValue('Anket davet metni'), buildHighScoreThanksText: vi.fn().mockReturnValue('Teşekkür'), buildLowScoreNotificationText: vi.fn().mockReturnValue('Düşük puan') }));
vi.mock('@/lib/automation', () => {
  const mockEngine = { fireTrigger: vi.fn().mockResolvedValue(undefined) };
  return { AutomationEngine: vi.fn(() => mockEngine) };
});

function mockReq(urlStr = 'http://localhost:3000/api/survey/send', body = {}): any {
  return { url: urlStr, nextUrl: new URL(urlStr), json: vi.fn().mockResolvedValue(body), headers: new Headers() };
}

describe('POST /api/survey/send', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('sends a survey invitation', async () => {
    mockTicketRepo.findById.mockResolvedValue({ customer: { name: 'Ahmet', phone: '+905551234567' } });
    mockSurveyRepo.sendSurvey.mockResolvedValue({ id: 'survey-1' });
    const { POST } = await import('../survey/send/route');
    const req = mockReq(undefined, { ticketId: 'ticket-1' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.surveyUrl).toContain('/survey/ticket-1');
  });
  it('returns 400 when ticketId missing', async () => {
    const { POST } = await import('../survey/send/route');
    const req = mockReq(undefined, {});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
  it('returns 404 when not found', async () => {
    mockTicketRepo.findById.mockRejectedValue(new Error('NOT_FOUND'));
    const { POST } = await import('../survey/send/route');
    const req = mockReq(undefined, { ticketId: 'x' });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
  it('returns 400 when customer has no phone', async () => {
    mockTicketRepo.findById.mockResolvedValue({ customer: { name: 'Ahmet', phone: null } });
    const { POST } = await import('../survey/send/route');
    const req = mockReq(undefined, { ticketId: 'ticket-1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/survey/respond', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('records a survey response', async () => {
    mockSurveyRepo.respond.mockResolvedValue({ survey: { id: 'survey-1', score: 5, couponCode: null }, action: 'STANDARD' });
    mockTicketRepo.findById.mockResolvedValue({ tenantId: 'tenant-1', customer: { name: 'Ahmet', phone: '+905551234567' }, ticketNo: 'SRV-001', customerId: 'cust-1', deviceId: 'dev-1', device: { model: 'AP-5000' }, technicianId: 'tech-1', technician: { name: 'Mehmet' } });
    const { POST } = await import('../survey/respond/route');
    const req = mockReq('http://localhost:3000/api/survey/respond', { ticketId: 'ticket-1', score: 5 });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
  it('returns 400 when score missing', async () => {
    const { POST } = await import('../survey/respond/route');
    const req = mockReq('http://localhost:3000/api/survey/respond', { ticketId: 'ticket-1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('GET /api/survey/report', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns survey stats', async () => {
    mockSurveyRepo.getStats.mockResolvedValue({ totalSurveys: 10, averageScore: 4.2 });
    const { GET } = await import('../survey/report/route');
    const res = await GET(mockReq('http://localhost:3000/api/survey/report'));
    expect(res.status).toBe(200);
  });
});
