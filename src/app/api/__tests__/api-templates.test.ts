// ──────────────────────────────────────────────
// Water Purifier Service ERP — Templates API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = { ok: true, userId: 'user-1', role: 'manager' as const, tenantId: 'tenant-1', error: null as any };

vi.mock('@/lib/supabase/require-role', () => ({ requireRole: vi.fn(() => Promise.resolve(mockAuth)) }));

const mockTemplates = [
  { id: 'tpl-1', name: 'Servis Hatırlatma', content: 'Sayın {{customer_name}}...', variables: 'customer_name,device_brand', tenantId: 'tenant-1', channel: 'SMS', createdAt: new Date(), updatedAt: new Date() },
  { id: 'tpl-2', name: 'Anket Davet', content: 'Değerlendirmeniz için teşekkürler...', variables: '', tenantId: 'tenant-1', channel: 'WHATSAPP', createdAt: new Date(), updatedAt: new Date() },
];

const mockRepo = { findAll: vi.fn(), create: vi.fn(), findById: vi.fn(), update: vi.fn(), delete: vi.fn() };
vi.mock('@/repositories/message-template.repository', () => ({ MessageTemplateRepository: class { constructor() { return mockRepo; } } }));

function createMockNextRequest(url = 'http://localhost:3000/api/templates', body?: any): any {
  return { nextUrl: new URL(url), json: vi.fn().mockResolvedValue(body ?? {}) };
}

describe('GET /api/templates', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns all templates', async () => {
    mockRepo.findAll.mockResolvedValue(mockTemplates);
    const { GET } = await import('../templates/route');
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
  });

  it('returns 401 when not authenticated', async () => {
    const { requireRole } = await import('@/lib/supabase/require-role');
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, userId: null, role: null, tenantId: null, error: { status: 401, code: 'UNAUTHORIZED', message: 'Yetkisiz erişim' } });
    const { GET } = await import('../templates/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 500 on error', async () => {
    mockRepo.findAll.mockRejectedValue(new Error('DB error'));
    const { GET } = await import('../templates/route');
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe('POST /api/templates', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('creates a new template', async () => {
    mockRepo.create.mockResolvedValue(mockTemplates[0]);
    const { POST } = await import('../templates/route');
    const req = createMockNextRequest(undefined, { name: 'Test', content: 'Test içeriği' });
    const res = await POST(req);
    expect(res.status).toBe(201);
  });

  it('returns 400 when name is missing', async () => {
    const { POST } = await import('../templates/route');
    const req = createMockNextRequest(undefined, { content: 'Test' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when content is missing', async () => {
    const { POST } = await import('../templates/route');
    const req = createMockNextRequest(undefined, { name: 'Test' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 500 on repository error', async () => {
    mockRepo.create.mockRejectedValue(new Error('DB error'));
    const { POST } = await import('../templates/route');
    const req = createMockNextRequest(undefined, { name: 'Test', content: 'Test' });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
