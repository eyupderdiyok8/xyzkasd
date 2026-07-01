// ──────────────────────────────────────────────
// Water Purifier Service ERP — WhatsApp API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = { ok: true, userId: 'user-1', role: 'tenant_admin' as const, tenantId: 'tenant-1', error: null, plan: 'PROFESSIONAL' };
vi.mock('@/lib/supabase/require-feature', () => ({ requireFeature: vi.fn(() => Promise.resolve(mockAuth)) }));

const mockManager = { sendMessage: vi.fn(), getOrCreateSession: vi.fn().mockResolvedValue({ status: 'SCANNING', qrData: 'qr-raw', session: {} }), getStatus: vi.fn().mockResolvedValue({ status: 'DISCONNECTED', autoReconnect: true }), getQrImage: vi.fn(), disconnect: vi.fn().mockResolvedValue({ success: true }), reconnect: vi.fn().mockResolvedValue({ success: true, status: 'CONNECTED' }), healthCheck: vi.fn().mockResolvedValue({ status: 'ok' }), autoReconnectAll: vi.fn(), handleWebhookEvent: vi.fn() };
vi.mock('@/lib/whatsapp/waha-manager', () => ({ getWahaManager: vi.fn(() => mockManager) }));

function mockReq(url = 'http://localhost:3000/api/whatsapp', body = {}): any {
  return { nextUrl: new URL(url), json: vi.fn().mockResolvedValue(body), headers: new Headers() };
}

describe('WhatsApp API', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('POST /api/whatsapp/send', () => {
    it('sends a message', async () => {
      mockManager.sendMessage.mockResolvedValue({ success: true, messageId: 'wa-msg-1' });
      const { POST } = await import('../whatsapp/send/route');
      const res = await POST(mockReq(undefined, { to: '+905551234567', text: 'Test' }));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
    it('returns 400 when phone missing', async () => {
      const { POST } = await import('../whatsapp/send/route');
      const res = await POST(mockReq(undefined, { text: 'Test' }));
      expect(res.status).toBe(400);
    });
    it('returns 400 when text missing', async () => {
      const { POST } = await import('../whatsapp/send/route');
      const res = await POST(mockReq(undefined, { to: '+905551234567' }));
      expect(res.status).toBe(400);
    });
    it('returns 400 when send fails', async () => {
      mockManager.sendMessage.mockResolvedValue({ success: false, error: 'WhatsApp bağlı değil' });
      const { POST } = await import('../whatsapp/send/route');
      const res = await POST(mockReq(undefined, { to: '+905551234567', text: 'Test' }));
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/whatsapp/status', () => {
    it('returns status', async () => {
      mockManager.getStatus.mockResolvedValue({ status: 'DISCONNECTED', autoReconnect: true });
      const { GET } = await import('../whatsapp/status/route');
      const res = await GET();
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/whatsapp/qr', () => {
    it('returns QR code', async () => {
      mockManager.getOrCreateSession.mockResolvedValue({ status: 'SCANNING', qrData: 'qr-raw', session: {} });
      const { GET } = await import('../whatsapp/qr/route');
      const res = await GET();
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/whatsapp/disconnect', () => {
    it('disconnects', async () => {
      mockManager.disconnect.mockResolvedValue({ success: true });
      const { POST } = await import('../whatsapp/disconnect/route');
      const res = await POST();
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/whatsapp/reconnect', () => {
    it('reconnects', async () => {
      mockManager.reconnect.mockResolvedValue({ success: true, status: 'CONNECTED' });
      const { POST } = await import('../whatsapp/reconnect/route');
      const res = await POST();
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/whatsapp/webhook', () => {
    it('handles webhook events', async () => {
      mockManager.handleWebhookEvent.mockResolvedValue(undefined);
      const { POST } = await import('../whatsapp/webhook/route');
      const req = mockReq(undefined, { session: 'tenant_abc', event: 'session.status', payload: { status: 'WORKING' } });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
    it('handles message events gracefully', async () => {
      const { POST } = await import('../whatsapp/webhook/route');
      const req = mockReq(undefined, { session: 'tenant_abc', event: 'message.received' });
      const res = await POST(req);
      expect(res.status).toBe(200);
    });
  });
});
