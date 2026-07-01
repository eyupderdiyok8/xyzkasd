// ──────────────────────────────────────────────
// Water Purifier Service ERP — Automation API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = {
  ok: true, userId: 'user-1', role: 'manager' as const, tenantId: 'tenant-1', error: null, plan: 'PROFESSIONAL',
};

vi.mock('@/lib/supabase/require-feature', () => ({
  requireFeature: vi.fn(() => Promise.resolve(mockAuth)),
}));

const mockRules = [
  { id: 'rule-1', name: 'Servis Tamamlanınca Mesaj', trigger: 'service.completed', isActive: true, priority: 10, cooldownMin: 0, tenantId: 'tenant-1', conditions: [], actions: [{ type: 'sendMessage', params: {} }], createdAt: new Date() },
  { id: 'rule-2', name: 'Düşük Puan Bildirimi', trigger: 'survey.low_score', isActive: true, priority: 5, cooldownMin: 1440, tenantId: 'tenant-1', conditions: [], actions: [{ type: 'notifyTechnician', params: {} }], createdAt: new Date() },
];

const mockRepository = { findAll: vi.fn(), findById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), toggleActive: vi.fn() };
const mockLogRepo = { findAll: vi.fn() };

// Constructors that return the shared mock objects
function createMockRepo() { return mockRepository; }
function createMockLogRepo() { return mockLogRepo; }

// Note: vi.mock is hoisted, but the factory callback is lazy (runs on first import).
// createMockRepo/createMockLogRepo are function-hoisted, so they exist.
vi.mock('@/repositories/automation-rule.repository', () => ({
  AutomationRuleRepository: createMockRepo,
}));
vi.mock('@/repositories/automation-log.repository', () => ({
  AutomationLogRepository: createMockLogRepo,
}));

function mockReq(urlStr = 'http://localhost:3000/api/automation/rules', body = {}): any {
  return {
    url: urlStr,
    nextUrl: new URL(urlStr),
    json: vi.fn().mockResolvedValue(body),
    headers: new Headers(),
  };
}

describe('GET /api/automation/rules', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns automation rules', async () => {
    mockRepository.findAll.mockResolvedValue(mockRules);
    const { GET } = await import('../automation/rules/route');
    const res = await GET(mockReq());
    // On error, log the body for debugging
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      console.error('ERROR BODY:', JSON.stringify(errBody));
    }
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
  });
  it('returns 403 when feature not available', async () => {
    const { requireFeature } = await import('@/lib/supabase/require-feature');
    vi.mocked(requireFeature).mockResolvedValueOnce({ ok: false, userId: null, role: null, tenantId: null, error: { status: 403, code: 'FORBIDDEN', message: '' }, plan: 'STARTER' });
    const { GET } = await import('../automation/rules/route');
    const res = await GET(mockReq());
    expect(res.status).toBe(403);
  });
});

describe('POST /api/automation/rules', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('creates a new automation rule', async () => {
    mockRepository.create.mockResolvedValue(mockRules[0]);
    const { POST } = await import('../automation/rules/route');
    const req = mockReq(undefined, { name: 'Test', trigger: 'service.completed', actions: [{ type: 'sendMessage', params: {} }] });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
  it('returns 400 when name missing', async () => {
    const { POST } = await import('../automation/rules/route');
    const req = mockReq(undefined, { trigger: 'service.completed', actions: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
  it('returns 400 when trigger missing', async () => {
    const { POST } = await import('../automation/rules/route');
    const req = mockReq(undefined, { name: 'Test', actions: [{ type: 'sendMessage' }] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
  it('returns 400 when actions empty', async () => {
    const { POST } = await import('../automation/rules/route');
    const req = mockReq(undefined, { name: 'Test', trigger: 'service.completed', actions: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
  it('returns 400 for invalid action type', async () => {
    const { POST } = await import('../automation/rules/route');
    const req = mockReq(undefined, { name: 'Test', trigger: 'service.completed', actions: [{ type: 'INVALID' }] });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe('Toggle & Delete', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('toggles rule active state', async () => {
    mockRepository.toggleActive.mockResolvedValue({ ...mockRules[0], isActive: false });
    const { PATCH } = await import('../automation/rules/[id]/toggle/route');
    const req = mockReq('http://localhost:3000/api/automation/rules/rule-1/toggle', { isActive: false });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'rule-1' }) });
    expect(res.status).toBe(200);
  });
  it('returns 404 when toggle fails', async () => {
    mockRepository.toggleActive.mockRejectedValue(new Error('NOT_FOUND'));
    const { PATCH } = await import('../automation/rules/[id]/toggle/route');
    const req = mockReq('http://localhost:3000/api/automation/rules/nonexistent/toggle', { isActive: true });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });
  it('deletes a rule', async () => {
    mockRepository.delete.mockResolvedValue(undefined);
    const { DELETE } = await import('../automation/rules/[id]/route');
    const res = await DELETE(null as any, { params: Promise.resolve({ id: 'rule-1' }) });
    expect(res.status).toBe(200);
  });
});

describe('GET /api/automation/logs', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns automation logs', async () => {
    mockLogRepo.findAll.mockResolvedValue([{ id: 'log-1', ruleId: 'rule-1', trigger: 'service.completed', status: 'SUCCESS', createdAt: new Date() }]);
    const { GET } = await import('../automation/logs/route');
    const req = mockReq('http://localhost:3000/api/automation/logs');
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
