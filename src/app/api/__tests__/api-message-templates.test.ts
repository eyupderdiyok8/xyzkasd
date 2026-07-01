// ──────────────────────────────────────────────
// Water Purifier Service ERP — Message Templates API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = {
  ok: true, userId: 'user-1', role: 'viewer' as const, tenantId: 'tenant-1', error: null, plan: 'PROFESSIONAL',
};

vi.mock('@/lib/supabase/require-feature', () => ({
  requireFeature: vi.fn(() => Promise.resolve(mockAuth)),
}));
vi.mock('@/lib/supabase/require-role', () => ({
  requireRole: vi.fn(() => Promise.resolve(mockAuth)),
}));

const mockTemplates = [
  { id: 'tpl-1', name: 'Bakım Hatırlatma', content: 'Sayın {{customer_name}}, bakım zamanı.', variables: '["customer_name"]', isActive: true, tenantId: 'tenant-1', createdAt: new Date(), channel: null },
  { id: 'tpl-2', name: 'Anket Davet', content: 'Sayın {{customer_name}}, değerlendirin: {{survey_url}}', variables: '["customer_name","survey_url"]', isActive: true, tenantId: 'tenant-1', createdAt: new Date(), channel: 'WHATSAPP' },
];

const mockRepository = { findAll: vi.fn(), findById: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
vi.mock('@/repositories/message-template.repository', () => ({ MessageTemplateRepository: class { constructor() { return mockRepository; } } }));

vi.mock('../message-templates/utils', () => ({
  validateAndExtractVariables: vi.fn((content: string) => {
    const used = content.match(/\{\{(\w+)\}\}/g)?.map((v: string) => v.slice(2, -2)) ?? [];
    const known = ['customer_name', 'device_model', 'next_service_date', 'company_name', 'phone', 'technician', 'discount_code', 'survey_url'];
    return { usedVars: used, unknownVars: used.filter((v: string) => !known.includes(v)) };
  }),
}));

function mockReq(urlStr = 'http://localhost:3000/api/message-templates', body = {}): any {
  return { url: urlStr, nextUrl: new URL(urlStr), json: vi.fn().mockResolvedValue(body), headers: new Headers() };
}

describe('GET /api/message-templates', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns all templates', async () => {
    mockRepository.findAll.mockResolvedValue(mockTemplates);
    const { GET } = await import('../message-templates/route');
    const res = await GET(mockReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
  });
  it('returns 403 when feature not available', async () => {
    const { requireFeature } = await import('@/lib/supabase/require-feature');
    vi.mocked(requireFeature).mockResolvedValueOnce({ ok: false, userId: null, role: null, tenantId: null, error: { status: 403, code: 'FORBIDDEN', message: '' }, plan: 'STARTER' });
    const { GET } = await import('../message-templates/route');
    const res = await GET(mockReq());
    expect(res.status).toBe(403);
  });
});

describe('POST /api/message-templates', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('creates a template', async () => {
    mockRepository.create.mockResolvedValue(mockTemplates[0]);
    const { POST } = await import('../message-templates/route');
    const req = mockReq(undefined, { name: 'Test', content: 'Sayın {{customer_name}}, bakım zamanı.' });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });
  it('returns 400 when name missing', async () => {
    const { POST } = await import('../message-templates/route');
    const req = mockReq(undefined, { content: 'Test' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
  it('returns 400 when content missing', async () => {
    const { POST } = await import('../message-templates/route');
    const req = mockReq(undefined, { name: 'Test' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
  it('returns 400 for unknown variables', async () => {
    const { POST } = await import('../message-templates/route');
    const req = mockReq(undefined, { name: 'Test', content: 'Merhaba {{unknown_var}}' });
    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error.details.unknownVars).toContain('unknown_var');
  });
});

describe('GET /api/templates', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns all templates (alt route)', async () => {
    mockRepository.findAll.mockResolvedValue(mockTemplates);
    const { GET } = await import('../templates/route');
    const res = await GET();
    expect(res.status).toBe(200);
  });
});
