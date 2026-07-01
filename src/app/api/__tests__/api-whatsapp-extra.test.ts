// ──────────────────────────────────────────────
// Water Purifier Service ERP — WhatsApp Disconnect & Webhook API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = {
  ok: true, userId: 'user-1', role: 'manager' as const, tenantId: 'tenant-1', error: null, plan: 'PROFESSIONAL',
};
vi.mock('@/lib/supabase/require-feature', () => ({ requireFeature: vi.fn(() => Promise.resolve(mockAuth)) }));

const mockManager = {
  disconnect: vi.fn().mockResolvedValue({ success: true }),
  getStatus: vi.fn().mockResolvedValue({ status: 'DISCONNECTED' }),
  getQR: vi.fn().mockResolvedValue({ qr: 'data:image/png;base64,qrcode' }),
  sendMessage: vi.fn().mockResolvedValue({ success: true, messageId: 'wa-msg' }),
  handleWebhook: vi.fn().mockResolvedValue({ success: true }),
  reconnect: vi.fn().mockResolvedValue({ success: true }),
  reconnectAll: vi.fn().mockResolvedValue({ success: true }),
};
vi.mock('@/lib/whatsapp/waha-manager', () => ({ getWahaManager: vi.fn(() => mockManager) }));

describe('POST /api/whatsapp/disconnect', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('disconnects WhatsApp', async () => {
    const { POST } = await import('../whatsapp/disconnect/route');
    const res = await POST();
    expect(res.status).toBe(200);
  });

  it('returns 500 when manager throws', async () => {
    mockManager.disconnect.mockRejectedValueOnce(new Error('WAHA error'));
    const { POST } = await import('../whatsapp/disconnect/route');
    const res = await POST();
    expect(res.status).toBe(500);
  });
});

describe('POST /api/whatsapp/webhook', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('handles incoming webhook', async () => {
    const { POST } = await import('../whatsapp/webhook/route');
    const req = { json: vi.fn().mockResolvedValue({ event: 'message', session: 'tenant_1' }) } as any;
    const res = await POST(req);
    expect(res.status).toBe(200);
  });
});
