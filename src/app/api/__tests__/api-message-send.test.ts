// ──────────────────────────────────────────────
// Water Purifier Service ERP — Message Templates (Send/Render) & Public Routes API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = { ok: true, userId: 'user-1', role: 'technician' as const, tenantId: 'tenant-1', error: null as any };
vi.mock('@/lib/supabase/require-role', () => ({ requireRole: vi.fn(() => Promise.resolve(mockAuth)) }));
vi.mock('@/lib/supabase/require-feature', () => ({ requireFeature: vi.fn(() => Promise.resolve({ ...mockAuth, plan: 'PROFESSIONAL' })) }));

// Mock supabase server to prevent cookies() calls
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) }) )})),
    })),
  })),
}));

const mockRepo = { findById: vi.fn(), findAll: vi.fn(), create: vi.fn() };
vi.mock('@/repositories/message-template.repository', () => ({ MessageTemplateRepository: class { constructor() { return mockRepo; } } }));
vi.mock('@/lib/whatsapp/waha-manager', () => ({ getWahaManager: vi.fn(() => ({ sendMessage: vi.fn().mockResolvedValue({ success: true, messageId: 'wa-msg' }) })) }));
vi.mock('@/lib/messaging/template-engine', () => ({ renderTemplate: vi.fn((c: string, v: Record<string, string>) => c.replace(/\{\{(\w+)\}\}/g, (_, k: string) => v[k] ?? '')) }));
vi.mock('@/lib/messaging/whatsapp.service', () => ({ WhatsAppService: class { constructor() {} send = vi.fn().mockResolvedValue({ success: true }) } }));

function mockReq(urlStr = 'http://localhost:3000/api/message-templates/send', body = {}): any {
  return { url: urlStr, nextUrl: new URL(urlStr), json: vi.fn().mockResolvedValue(body), headers: new Headers() };
}

describe('POST /api/message-templates/send', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 400 when templateId missing', async () => {
    const { POST } = await import('../message-templates/send/route');
    const req = mockReq(undefined, { to: '+905551234567' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when to missing', async () => {
    const { POST } = await import('../message-templates/send/route');
    const req = mockReq(undefined, { templateId: 'tpl-1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when template not found', async () => {
    mockRepo.findById.mockRejectedValue(new Error('NOT_FOUND'));
    const { POST } = await import('../message-templates/send/route');
    const req = mockReq(undefined, { templateId: 'nonexistent', to: '+905551234567' });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/message-templates/render', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns 400 when templateId missing', async () => {
    const { POST } = await import('../message-templates/render/route');
    const req = mockReq('http://localhost:3000/api/message-templates/render', {});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when template not found', async () => {
    mockRepo.findById.mockRejectedValue(new Error('NOT_FOUND'));
    const { POST } = await import('../message-templates/render/route');
    const req = mockReq('http://localhost:3000/api/message-templates/render', { templateId: 'x', values: { customer_name: 'Ahmet' } });
    const res = await POST(req);
    expect(res.status).toBe(404);
  });
});
