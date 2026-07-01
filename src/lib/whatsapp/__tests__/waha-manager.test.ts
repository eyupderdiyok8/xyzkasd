// ──────────────────────────────────────────────
// Water Purifier Service ERP — WAHA Manager Tests
// Multi-Tenant SaaS
//
// Tests: getOrCreateSession, reconnect, disconnect,
// sendMessage, healthCheck, handleWebhookEvent,
// autoReconnectAll, status mapping.
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WahaSessionManager } from '../waha-manager';

// ─── Mock Prisma ──────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  whatsAppSession: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

// ─── Helpers ──────────────────────────────────

function mockResponse(data: unknown, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(ok ? '' : JSON.stringify(data)),
    status: ok ? 200 : 400,
  } as Response;
}

function makeSession(overrides: Record<string, any> = {}) {
  return {
    id: 'sess-1',
    tenantId: 'tenant-1',
    sessionName: 'tenant_tenant-1',
    status: 'DISCONNECTED',
    qrCode: null,
    autoReconnect: true,
    maxRetries: 5,
    retryCount: 0,
    phoneNumber: null,
    phoneNumberIntl: null,
    errorMessage: null,
    lastConnectedAt: null,
    lastDisconnectedAt: null,
    lastErrorAt: null,
    lastRetryAt: null,
    webhookSecret: 'secret-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────

describe('WahaSessionManager', () => {
  let manager: WahaSessionManager;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
    manager = new WahaSessionManager();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── mapWahaStatus (private, access via prototype) ──

  describe('mapWahaStatus', () => {
    const mapStatus = (WahaSessionManager.prototype as any).mapWahaStatus.bind(manager);

    it('maps WORKING to CONNECTED', () => {
      expect(mapStatus('WORKING')).toBe('CONNECTED');
    });

    it('maps SCAN_QR_CODE to SCANNING', () => {
      expect(mapStatus('SCAN_QR_CODE')).toBe('SCANNING');
    });

    it('maps STARTING to STARTING', () => {
      expect(mapStatus('STARTING')).toBe('STARTING');
    });

    it('maps FAILED to ERROR', () => {
      expect(mapStatus('FAILED')).toBe('ERROR');
    });

    it('maps STOPPED to DISCONNECTED', () => {
      expect(mapStatus('STOPPED')).toBe('DISCONNECTED');
    });

    it('maps unknown status to DISCONNECTED', () => {
      expect(mapStatus('UNKNOWN_STATUS')).toBe('DISCONNECTED');
    });
  });

  // ─── normalizePhone (private) ────────────────

  describe('normalizePhone', () => {
    const normalize = (WahaSessionManager.prototype as any).normalizePhone.bind(manager);

    it('adds @c.us suffix to Turkish number', () => {
      expect(normalize('905551234567')).toBe('905551234567@c.us');
    });

    it('strips + prefix and adds @c.us', () => {
      expect(normalize('+905551234567')).toBe('905551234567@c.us');
    });

    it('keeps @c.us if already present', () => {
      expect(normalize('905551234567@c.us')).toBe('905551234567@c.us');
    });

    it('strips @g.us since regex removes non-digit chars first', () => {
      expect(normalize('123456@g.us')).toBe('123456@c.us');
    });

    it('cleans non-digit characters except +', () => {
      expect(normalize('+90 (555) 123-45-67')).toBe('905551234567@c.us');
    });
  });

  // ─── tenantSessionName (private) ────────────

  describe('tenantSessionName', () => {
    const tenantSessionName = (WahaSessionManager.prototype as any).tenantSessionName.bind(manager);

    it('prefixes tenant ID with tenant_', () => {
      expect(tenantSessionName('tenant-abc')).toBe('tenant_tenant-abc');
    });

    it('strips special characters keeping alphanumeric parts', () => {
      expect(tenantSessionName('tenant@#$%')).toBe('tenant_tenant');
    });
  });

  // ─── healthCheck ─────────────────────────────

  describe('healthCheck', () => {
    it('returns health status when WAHA is reachable', async () => {
      fetchSpy.mockResolvedValue(
        mockResponse({ status: 'OK', version: '2.5.0', uptime: 3600 }),
      );

      const result = await manager.healthCheck();
      expect(result).toEqual({ status: 'OK', version: '2.5.0', uptime: 3600 });
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.any(Object),
      );
    });

    it('returns null on non-ok response', async () => {
      fetchSpy.mockResolvedValue(mockResponse({}, false));

      const result = await manager.healthCheck();
      expect(result).toBeNull();
    });

    it('returns null on network error', async () => {
      fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await manager.healthCheck();
      expect(result).toBeNull();
    });
  });

  // ─── getOrCreateSession ──────────────────────

  describe('getOrCreateSession', () => {
    it('creates a new session when none exists', async () => {
      // No existing WAHA session — will try to start
      fetchSpy.mockResolvedValue(
        mockResponse({ status: 'SCAN_QR_CODE', qrCode: { raw: 'qr-data', image: 'base64...' } }),
      );
      mockPrisma.whatsAppSession.upsert.mockResolvedValue(makeSession());

      const result = await manager.getOrCreateSession('tenant-1');

      expect(result.status).toBe('SCANNING');
      expect(result.qrData).toBe('qr-data');
      expect(mockPrisma.whatsAppSession.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
      );
    });

    it('returns existing session from WAHA when already running', async () => {
      // Session exists in both DB and WAHA
      fetchSpy.mockResolvedValue(
        mockResponse({ status: 'WORKING' }),
      );
      mockPrisma.whatsAppSession.upsert.mockResolvedValue(makeSession({ status: 'CONNECTED' }));
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(makeSession());

      const result = await manager.getOrCreateSession('tenant-1');

      expect(result.status).toBe('CONNECTED');
      expect(result.qrData).toBeUndefined();
    });

    it('handles WAHA start failure gracefully', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ error: 'Session limit reached' }, false));
      mockPrisma.whatsAppSession.upsert.mockResolvedValue(makeSession());

      const result = await manager.getOrCreateSession('tenant-1');

      expect(result.status).toBe('ERROR');
      expect(mockPrisma.whatsAppSession.update).toHaveBeenCalled();
    });

    it('handles network error during start', async () => {
      fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));
      mockPrisma.whatsAppSession.upsert.mockResolvedValue(makeSession());

      const result = await manager.getOrCreateSession('tenant-1');

      expect(result.status).toBe('ERROR');
    });
  });

  // ─── getStatus ───────────────────────────────

  describe('getStatus', () => {
    it('returns DISCONNECTED when no session record exists', async () => {
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(null);

      const result = await manager.getStatus('tenant-1');

      expect(result.status).toBe('DISCONNECTED');
      expect(result.autoReconnect).toBe(true);
    });

    it('returns live status from WAHA when session exists', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ status: 'WORKING' }));
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(
        makeSession({ status: 'CONNECTED' }),
      );

      const result = await manager.getStatus('tenant-1');

      expect(result.status).toBe('CONNECTED');
    });

    it('updates DB when status changed', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ status: 'WORKING' }));
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(
        makeSession({ status: 'SCANNING' }), // different from WAHA status
      );

      await manager.getStatus('tenant-1');

      expect(mockPrisma.whatsAppSession.update).toHaveBeenCalled();
    });
  });

  // ─── sendMessage ─────────────────────────────

  describe('sendMessage', () => {
    it('sends a text message via connected session', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ id: 'waha-msg-1' }));
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(
        makeSession({ status: 'CONNECTED' }),
      );

      const result = await manager.sendMessage('tenant-1', '+905551234567', 'Merhaba');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('waha-msg-1');
    });

    it('returns error when session is not connected', async () => {
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(
        makeSession({ status: 'DISCONNECTED' }),
      );

      const result = await manager.sendMessage('tenant-1', '+905551234567', 'Merhaba');

      expect(result.success).toBe(false);
      expect(result.error).toContain('WhatsApp bağlı değil');
    });

    it('returns error when no session exists', async () => {
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(null);

      const result = await manager.sendMessage('tenant-1', '+905551234567', 'Merhaba');

      expect(result.success).toBe(false);
      expect(result.error).toContain('WhatsApp bağlı değil');
    });

    it('handles WAHA send failure', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ error: 'rate limited' }, false));
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(
        makeSession({ status: 'CONNECTED' }),
      );

      const result = await manager.sendMessage('tenant-1', '+905551234567', 'Merhaba');

      expect(result.success).toBe(false);
      expect(result.error).toContain('WAHA gönderim hatası');
    });

    it('handles network error during send', async () => {
      fetchSpy.mockRejectedValue(new Error('ECONNRESET'));
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(
        makeSession({ status: 'CONNECTED' }),
      );

      const result = await manager.sendMessage('tenant-1', '+905551234567', 'Merhaba');

      expect(result.success).toBe(false);
      expect(result.error).toBe('ECONNRESET');
    });

    it('normalizes phone number to chatId in WAHA request', async () => {
      fetchSpy.mockResolvedValue(mockResponse({ id: 'msg-1' }));
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(
        makeSession({ status: 'CONNECTED' }),
      );

      await manager.sendMessage('tenant-1', '+905551234567', 'Test');

      const [, options] = fetchSpy.mock.calls[0]!;
      const body = JSON.parse(options!.body as string);
      expect(body.chatId).toBe('905551234567@c.us');
    });
  });

  // ─── getQrImage ──────────────────────────────

  describe('getQrImage', () => {
    it('returns QR image from WAHA', async () => {
      fetchSpy.mockResolvedValue(
        mockResponse({ status: 'SCAN_QR_CODE', qrCode: { raw: '...', image: 'base64img' } }),
      );

      const result = await manager.getQrImage('tenant-1');

      expect(result.qrImage).toBe('base64img');
    });

    it('returns error on WAHA failure', async () => {
      fetchSpy.mockResolvedValue(mockResponse({}, false));

      const result = await manager.getQrImage('tenant-1');

      expect(result.qrImage).toBeUndefined();
      expect(result.error).toContain('QR alınamadı');
    });

    it('returns raw error message on network error', async () => {
      fetchSpy.mockRejectedValue(new Error('Timeout'));

      const result = await manager.getQrImage('tenant-1');

      expect(result.error).toBe('Timeout');
    });
  });

  // ─── reconnect ───────────────────────────────

  describe('reconnect', () => {
    it('creates a new session when none exists', async () => {
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(null);
      fetchSpy.mockResolvedValue(mockResponse({ status: 'SCAN_QR_CODE', qrCode: { raw: 'qr-new' } }));
      mockPrisma.whatsAppSession.upsert.mockResolvedValue(makeSession());

      const result = await manager.reconnect('tenant-1');

      expect(result.success).toBe(true);
      expect(result.qrData).toBe('qr-new');
    });

    it('logs out existing session then restarts', async () => {
      // First call: logout (DELETE)
      // Second call: start (POST)
      fetchSpy
        .mockResolvedValueOnce(mockResponse({})) // logout
        .mockResolvedValueOnce(mockResponse({ status: 'SCAN_QR_CODE', qrCode: { raw: 'qr-new' } })); // start
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(makeSession({ status: 'ERROR' }));

      const result = await manager.reconnect('tenant-1');

      expect(result.success).toBe(true);
      expect(result.qrData).toBe('qr-new');

      // First call should be DELETE to /logout
      expect(fetchSpy.mock.calls[0][1]?.method).toBe('DELETE');
      // Second call should be POST to /start
      expect(fetchSpy.mock.calls[1][0]).toContain('/start');
    });

    it('handles restart failure', async () => {
      fetchSpy
        .mockResolvedValueOnce(mockResponse({}))
        .mockResolvedValueOnce(mockResponse({ error: 'failed' }, false));
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(makeSession({ status: 'ERROR' }));

      const result = await manager.reconnect('tenant-1');

      expect(result.success).toBe(false);
    });
  });

  // ─── disconnect ──────────────────────────────

  describe('disconnect', () => {
    it('logs out WAHA session and updates DB', async () => {
      fetchSpy.mockResolvedValue(mockResponse({}));
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(makeSession({ status: 'CONNECTED' }));

      const result = await manager.disconnect('tenant-1');

      expect(result.success).toBe(true);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/logout'),
        expect.objectContaining({ method: 'DELETE' }),
      );
      expect(mockPrisma.whatsAppSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DISCONNECTED', qrCode: null, autoReconnect: false }),
        }),
      );
    });

    it('returns success when no session exists', async () => {
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(null);

      const result = await manager.disconnect('tenant-1');

      expect(result.success).toBe(true);
    });

    it('handles logout network error gracefully', async () => {
      fetchSpy.mockRejectedValue(new Error('Timeout'));
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(makeSession({ status: 'CONNECTED' }));

      const result = await manager.disconnect('tenant-1');

      expect(result.success).toBe(true);
    });
  });

  // ─── handleWebhookEvent ──────────────────────

  describe('handleWebhookEvent', () => {
    it('ignores unknown session', async () => {
      mockPrisma.whatsAppSession.findFirst.mockResolvedValue(null);

      await manager.handleWebhookEvent({
        session: 'unknown_session',
        event: 'session.status',
        payload: { status: 'WORKING' },
      });

      expect(mockPrisma.whatsAppSession.update).not.toHaveBeenCalled();
    });

    it('updates status to CONNECTED on WORKING event', async () => {
      mockPrisma.whatsAppSession.findFirst.mockResolvedValue(
        makeSession({ status: 'STARTING' }),
      );

      await manager.handleWebhookEvent({
        session: 'tenant_tenant-1',
        event: 'session.status',
        payload: { status: 'WORKING', phoneNumber: '905551234567' },
      });

      expect(mockPrisma.whatsAppSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sess-1' },
          data: expect.objectContaining({
            status: 'CONNECTED',
            phoneNumber: '905551234567',
            errorMessage: null,
            retryCount: 0,
          }),
        }),
      );
    });

    it('updates status to ERROR on FAILED event', async () => {
      mockPrisma.whatsAppSession.findFirst.mockResolvedValue(
        makeSession({ status: 'WORKING', retryCount: 0 }),
      );

      await manager.handleWebhookEvent({
        session: 'tenant_tenant-1',
        event: 'session.status',
        payload: { status: 'FAILED', error: 'Connection lost' },
      });

      expect(mockPrisma.whatsAppSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ERROR',
            errorMessage: 'Connection lost',
            retryCount: 1, // incremented
          }),
        }),
      );
    });

    it('updates QR code when payload contains qr', async () => {
      mockPrisma.whatsAppSession.findFirst.mockResolvedValue(makeSession());

      await manager.handleWebhookEvent({
        session: 'tenant_tenant-1',
        event: 'session.status',
        payload: { status: 'SCAN_QR_CODE', qr: 'new-qr-data' },
      });

      expect(mockPrisma.whatsAppSession.update).toHaveBeenCalled();
      const updateCall = mockPrisma.whatsAppSession.update.mock.calls[0]!;
      expect(updateCall[0].data?.qrCode).toBe('new-qr-data');
    });

    it('ignores message.ack events without DB update', async () => {
      mockPrisma.whatsAppSession.findFirst.mockResolvedValue(makeSession());

      await manager.handleWebhookEvent({
        session: 'tenant_tenant-1',
        event: 'message.ack',
        payload: { id: 'msg-1' },
      });

      expect(mockPrisma.whatsAppSession.update).not.toHaveBeenCalled();
    });

    it('handles DISCONNECTED status update', async () => {
      mockPrisma.whatsAppSession.findFirst.mockResolvedValue(
        makeSession({ status: 'CONNECTED', qrCode: 'old-qr' }),
      );

      await manager.handleWebhookEvent({
        session: 'tenant_tenant-1',
        event: 'session.status',
        payload: { status: 'STOPPED' },
      });

      expect(mockPrisma.whatsAppSession.update).toHaveBeenCalled();
      const updateCall = mockPrisma.whatsAppSession.update.mock.calls[0]!;
      expect(updateCall[0].data?.status).toBe('DISCONNECTED');
      expect(updateCall[0].data?.qrCode).toBeNull();
      expect(updateCall[0].data?.lastDisconnectedAt).toBeInstanceOf(Date);
    });
  });

  // ─── autoReconnectAll ────────────────────────

  describe('autoReconnectAll', () => {
    it('reconnects stale sessions within retry limit', async () => {
      mockPrisma.whatsAppSession.findMany.mockResolvedValue([
        makeSession({ tenantId: 'tenant-1', status: 'DISCONNECTED', retryCount: 1 }),
        makeSession({ tenantId: 'tenant-2', status: 'ERROR', retryCount: 2 }),
      ]);

      // Both reconnect calls: logout then start
      fetchSpy
        .mockResolvedValueOnce(mockResponse({})) // tenant-1 logout
        .mockResolvedValueOnce(mockResponse({ status: 'WORKING' })) // tenant-1 start
        .mockResolvedValueOnce(mockResponse({})) // tenant-2 logout
        .mockResolvedValueOnce(mockResponse({ status: 'WORKING' })); // tenant-2 start

      // findUnique for reconnect: get session for tenant-1, tenant-2
      mockPrisma.whatsAppSession.findUnique
        .mockResolvedValueOnce(makeSession({ tenantId: 'tenant-1' }))
        .mockResolvedValueOnce(makeSession({ tenantId: 'tenant-2' }));

      const result = await manager.autoReconnectAll();

      expect(result.checked).toBe(2);
      expect(result.reconnected).toBe(2);
      expect(result.errors).toHaveLength(0);
    });

    it('skips sessions that exceeded max retries', async () => {
      mockPrisma.whatsAppSession.findMany.mockResolvedValue([
        makeSession({ tenantId: 'tenant-1', status: 'ERROR', retryCount: 5, maxRetries: 5 }),
      ]);

      const result = await manager.autoReconnectAll();

      expect(result.checked).toBe(1);
      expect(result.reconnected).toBe(0);
    });

    it('collects errors from failed reconnections', async () => {
      mockPrisma.whatsAppSession.findMany.mockResolvedValue([
        makeSession({ tenantId: 'tenant-1', status: 'DISCONNECTED' }),
      ]);

      fetchSpy.mockRejectedValue(new Error('Network error'));
      mockPrisma.whatsAppSession.findUnique.mockResolvedValue(makeSession());

      const result = await manager.autoReconnectAll();

      expect(result.checked).toBe(1);
      expect(result.reconnected).toBe(0);
      expect(result.errors).toHaveLength(1);
    });
  });
});
