// ──────────────────────────────────────────────
// WAHA Session Manager — tenant-level WhatsApp
// ──────────────────────────────────────────────
// Manages WAHA (WhatsApp HTTP API) sessions per tenant.
// Handles: QR code generation, session lifecycle,
// status monitoring, auto-reconnect, messaging.
//
// Environment variables:
//   WAHA_API_URL     (default: http://localhost:3001)
//   WAHA_API_KEY     (optional)
// ──────────────────────────────────────────────

import { prisma } from '@/lib/prisma';

/** WAHA session status as returned by the API. */
export interface WahaSessionStatus {
  /** "STARTING" | "SCAN_QR_CODE" | "WORKING" | "FAILED" | "STOPPED" */
  status: string;
  qrCode?: {
    raw: string;
    /** Base64 PNG of the QR code image. */
    image: string;
  };
  error?: string;
  config?: Record<string, unknown>;
}

export interface WahaHealthCheck {
  status: string;
  version?: string;
  uptime?: number;
}

export type WhatsAppConnectionStatus =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR'
  | 'SCANNING'
  | 'STARTING';

/**
 * Tenant-specific WAHA session manager.
 * Each tenant gets a dedicated WAHA session name (e.g. "tenant_<cuid>").
 */
export class WahaSessionManager {
  private apiUrl: string;
  private apiKey: string | undefined;

  constructor() {
    this.apiUrl = process.env.WAHA_API_URL ?? 'http://localhost:3001';
    this.apiKey = process.env.WAHA_API_KEY;
  }

  // ─── Session Lifecycle ──────────────────────

  /**
   * Get or create the WAHA session record for a tenant.
   * Returns the session with QR code if in SCANNING state.
   */
  async getOrCreateSession(tenantId: string): Promise<{
    session: Record<string, unknown>;
    qrData?: string;
    status: WhatsAppConnectionStatus;
  }> {
    const wahaSessionName = this.tenantSessionName(tenantId);

    // 1. Upsert local record
    const session = await prisma.whatsAppSession.upsert({
      where: { tenantId },
      update: { sessionName: wahaSessionName },
      create: {
        tenantId,
        sessionName: wahaSessionName,
        autoReconnect: true,
        maxRetries: 5,
        webhookSecret: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
    });

    // 2. Check WAHA engine status
    const wahaStatus = await this.getWahaSessionStatus(tenantId);

    if (!wahaStatus) {
      // Session doesn't exist in WAHA — start it
      return this.startSession(tenantId, session);
    }

    // Map WAHA status to our status
    const mappedStatus = this.mapWahaStatus(wahaStatus.status);

    // Update local DB
    await prisma.whatsAppSession.update({
      where: { id: session.id },
      data: {
        status: mappedStatus,
        qrCode: wahaStatus.qrCode?.raw ?? session.qrCode,
        errorMessage: wahaStatus.error ?? null,
        lastConnectedAt:
          mappedStatus === 'CONNECTED' ? new Date() : session.lastConnectedAt,
        autoReconnect: session.autoReconnect,
      },
    });

    return {
      session: {
        id: session.id,
        tenantId,
        sessionName: session.sessionName,
        autoReconnect: session.autoReconnect,
      },
      qrData: wahaStatus.qrCode?.raw,
      status: mappedStatus,
    };
  }

  /**
   * Start a new WAHA session and return QR code data.
   */
  private async startSession(
    tenantId: string,
    session: { id: string; sessionName: string },
  ): Promise<{
    session: Record<string, unknown>;
    qrData?: string;
    status: WhatsAppConnectionStatus;
  }> {
    const wahaSessionName = this.tenantSessionName(tenantId);

    try {
      const res = await fetch(
        `${this.apiUrl}/api/${encodeURIComponent(wahaSessionName)}/start`,
        {
          method: 'POST',
          headers: this.headers(),
          signal: AbortSignal.timeout(15000),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        await prisma.whatsAppSession.update({
          where: { id: session.id },
          data: {
            status: 'ERROR',
            errorMessage: `WAHA start hatası (${res.status}): ${text}`,
          },
        });
        return {
          session: {
            id: session.id,
            tenantId,
            sessionName: session.sessionName,
            autoReconnect: true,
          },
          status: 'ERROR',
        };
      }

      const data = (await res.json()) as WahaSessionStatus;

      const mappedStatus = this.mapWahaStatus(data.status);

      await prisma.whatsAppSession.update({
        where: { id: session.id },
        data: {
          status: mappedStatus,
          qrCode: data.qrCode?.raw ?? null,
          errorMessage: data.error ?? null,
        },
      });

      return {
        session: {
          id: session.id,
          tenantId,
          sessionName: session.sessionName,
          autoReconnect: true,
        },
        qrData: data.qrCode?.raw,
        status: mappedStatus,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bağlantı hatası';
      await prisma.whatsAppSession.update({
        where: { id: session.id },
        data: { status: 'ERROR', errorMessage: msg },
      });
      return {
        session: {
          id: session.id,
          tenantId,
          sessionName: session.sessionName,
          autoReconnect: true,
        },
        status: 'ERROR',
      };
    }
  }

  // ─── Status ──────────────────────────────────

  /**
   * Get current connection status from WAHA engine.
   */
  async getStatus(tenantId: string): Promise<{
    status: WhatsAppConnectionStatus;
    qrData?: string;
    errorMessage?: string;
    lastConnectedAt?: Date;
    autoReconnect: boolean;
  }> {
    const session = await prisma.whatsAppSession.findUnique({
      where: { tenantId },
    });

    if (!session) {
      return {
        status: 'DISCONNECTED',
        autoReconnect: true,
      };
    }

    // Check live status from WAHA
    const wahaStatus = await this.getWahaSessionStatus(tenantId);

    if (!wahaStatus) {
      // WAHA engine doesn't know about this session
      return {
        status: 'DISCONNECTED',
        qrData: session.qrCode ?? undefined,
        errorMessage: session.errorMessage ?? undefined,
        lastConnectedAt: session.lastConnectedAt ?? undefined,
        autoReconnect: session.autoReconnect,
      };
    }

    const mappedStatus = this.mapWahaStatus(wahaStatus.status);

    // Update DB if status changed
    if (mappedStatus !== session.status) {
      await prisma.whatsAppSession.update({
        where: { id: session.id },
        data: {
          status: mappedStatus,
          qrCode: wahaStatus.qrCode?.raw ?? session.qrCode,
          errorMessage: wahaStatus.error ?? session.errorMessage,
          lastConnectedAt:
            mappedStatus === 'CONNECTED' ? new Date() : session.lastConnectedAt,
        },
      });
    }

    return {
      status: mappedStatus,
      qrData: (mappedStatus === 'SCANNING' || mappedStatus === 'STARTING')
        ? (wahaStatus.qrCode?.raw ?? session.qrCode ?? undefined)
        : undefined,
      errorMessage: wahaStatus.error ?? session.errorMessage ?? undefined,
      lastConnectedAt:
        mappedStatus === 'CONNECTED'
          ? new Date()
          : (session.lastConnectedAt ?? undefined),
      autoReconnect: session.autoReconnect,
    };
  }

  // ─── Reconnect ───────────────────────────────

  /**
   * Attempt to reconnect a disconnected/failed session.
   * Logs out the existing WAHA session first, then restarts.
   */
  async reconnect(tenantId: string): Promise<{
    success: boolean;
    qrData?: string;
    status: WhatsAppConnectionStatus;
    error?: string;
  }> {
    const session = await prisma.whatsAppSession.findUnique({
      where: { tenantId },
    });

    if (!session) {
      // No session exists — create one
      const result = await this.getOrCreateSession(tenantId);
      return {
        success: result.status !== 'ERROR',
        qrData: result.qrData,
        status: result.status,
        error: result.status === 'ERROR' ? 'Session oluşturulamadı' : undefined,
      };
    }

    const wahaSessionName = this.tenantSessionName(tenantId);

    // Logout existing session from WAHA engine
    try {
      await fetch(
        `${this.apiUrl}/api/${encodeURIComponent(wahaSessionName)}/logout`,
        { method: 'DELETE', headers: this.headers(), signal: AbortSignal.timeout(10000) },
      );
    } catch {
      // Ignore logout errors — session may already be dead
    }

    // Update local record
    await prisma.whatsAppSession.update({
      where: { id: session.id },
      data: {
        status: 'DISCONNECTED',
        qrCode: null,
        errorMessage: null,
        autoReconnect: true,
      },
    });

    // Restart
    const startResult = await this.startSession(tenantId, session);
    return {
      success: startResult.status !== 'ERROR',
      qrData: startResult.qrData,
      status: startResult.status,
      error: startResult.status === 'ERROR' ? 'Yeniden başlatılamadı' : undefined,
    };
  }

  // ─── Disconnect ──────────────────────────────

  /**
   * Disconnect and logout the WAHA session permanently.
   */
  async disconnect(tenantId: string): Promise<{ success: boolean }> {
    const session = await prisma.whatsAppSession.findUnique({
      where: { tenantId },
    });

    if (!session) return { success: true };

    const wahaSessionName = this.tenantSessionName(tenantId);

    try {
      await fetch(
        `${this.apiUrl}/api/${encodeURIComponent(wahaSessionName)}/logout`,
        { method: 'DELETE', headers: this.headers(), signal: AbortSignal.timeout(10000) },
      );
    } catch {
      // Ignore
    }

    await prisma.whatsAppSession.update({
      where: { id: session.id },
      data: {
        status: 'DISCONNECTED',
        qrCode: null,
        autoReconnect: false,
      },
    });

    return { success: true };
  }

  // ─── Send Message ────────────────────────────

  /**
   * Send a text message using the tenant's WhatsApp session.
   */
  async sendMessage(
    tenantId: string,
    to: string,
    text: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const session = await prisma.whatsAppSession.findUnique({
      where: { tenantId },
    });

    if (!session || session.status !== 'CONNECTED') {
      return {
        success: false,
        error: 'WhatsApp bağlı değil. Lütfen önce QR kod ile bağlanın.',
      };
    }

    const wahaSessionName = this.tenantSessionName(tenantId);
    const chatId = this.normalizePhone(to);

    try {
      const res = await fetch(
        `${this.apiUrl}/api/${encodeURIComponent(wahaSessionName)}/sendText`,
        {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify({ chatId, text }),
          signal: AbortSignal.timeout(10000),
        },
      );

      if (!res.ok) {
        const errText = await res.text();
        return {
          success: false,
          error: `WAHA gönderim hatası (${res.status}): ${errText}`,
        };
      }

      const data = (await res.json()) as { id?: string; messageId?: string };
      return { success: true, messageId: data.id ?? data.messageId };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'WhatsApp mesaj gönderme hatası',
      };
    }
  }

  // ─── QR Code Image ───────────────────────────

  /**
   * Fetch QR code as base64 PNG from WAHA engine.
   */
  async getQrImage(tenantId: string): Promise<{ qrImage?: string; error?: string }> {
    const wahaSessionName = this.tenantSessionName(tenantId);

    try {
      const res = await fetch(
        `${this.apiUrl}/api/${encodeURIComponent(wahaSessionName)}/start`,
        {
          method: 'POST',
          headers: this.headers(),
          signal: AbortSignal.timeout(10000),
        },
      );

      if (!res.ok) {
        return { error: `QR alınamadı (${res.status})` };
      }

      const data = (await res.json()) as WahaSessionStatus;
      return { qrImage: data.qrCode?.image };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'QR kodu alınamadı',
      };
    }
  }

  // ─── Health / Ping ───────────────────────────

  /**
   * Check if the WAHA engine is reachable.
   */
  async healthCheck(): Promise<WahaHealthCheck | null> {
    try {
      const res = await fetch(`${this.apiUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      return (await res.json()) as WahaHealthCheck;
    } catch {
      return null;
    }
  }

  // ─── Webhook Handler ─────────────────────────

  /**
   * Handle WAHA webhook events.
   * Called by POST /api/whatsapp/webhook when WAHA sends status/callback events.
   *
   * Known WAHA events:
   *   session.status    → SCAN_QR_CODE, WORKING, FAILED
   *   message.received  → incoming message
   *   message.ack       → delivery receipt
   */
  async handleWebhookEvent(event: {
    session: string;
    event: string;
    payload?: Record<string, unknown>;
  }): Promise<void> {
    // Find session by WAHA session name
    const dbSession = await prisma.whatsAppSession.findFirst({
      where: { sessionName: event.session },
    });

    if (!dbSession) return; // Unknown session — ignore

    const payload = event.payload ?? {};

    switch (event.event) {
      case 'session.status': {
        const wahaStatus = (payload.status as string) ?? '';
        const mappedStatus = this.mapWahaStatus(wahaStatus);

        const updateData: Record<string, unknown> = {
          status: mappedStatus,
        };

        if (mappedStatus === 'CONNECTED') {
          updateData.lastConnectedAt = new Date();
          updateData.lastDisconnectedAt = null;
          updateData.errorMessage = null;
          updateData.retryCount = 0;
          updateData.phoneNumber = (payload.phoneNumber as string) ?? dbSession.phoneNumber;
          updateData.phoneNumberIntl = (payload.phoneNumber as string) ?? dbSession.phoneNumberIntl;
        } else if (mappedStatus === 'ERROR') {
          updateData.lastErrorAt = new Date();
          updateData.errorMessage = (payload.error as string) ?? 'WAHA session hatası';
          updateData.lastDisconnectedAt = new Date();

          // Increment retry count
          const newRetryCount = dbSession.retryCount + 1;
          updateData.retryCount = newRetryCount;
          updateData.lastRetryAt = new Date();

          // Auto-reconnect if enabled and under max retries
          if (dbSession.autoReconnect && newRetryCount <= dbSession.maxRetries) {
            // Trigger reconnection asynchronously
            this.reconnect(dbSession.tenantId).catch(() => {});
          }
        } else if (mappedStatus === 'DISCONNECTED') {
          updateData.lastDisconnectedAt = new Date();
          updateData.qrCode = null;
        }

        // QR code update
        if (payload.qr) {
          updateData.qrCode = payload.qr as string;
        }

        await prisma.whatsAppSession.update({
          where: { id: dbSession.id },
          data: updateData as any,
        });
        break;
      }

      case 'message.ack':
      case 'message.received':
      default:
        // Log for future use, no DB update needed
        break;
    }
  }

  // ─── Auto-Reconnect All ──────────────────────

  /**
   * Check all disconnected/failed sessions and attempt reconnection.
   * Called by a cron job periodically.
   *
   * Returns the number of sessions reconnected.
   */
  async autoReconnectAll(): Promise<{ checked: number; reconnected: number; errors: string[] }> {
    const errors: string[] = [];
    let reconnected = 0;

    const staleSessions = await prisma.whatsAppSession.findMany({
      where: {
        autoReconnect: true,
        status: { in: ['DISCONNECTED', 'ERROR'] },
      },
    });

    const pendingSessions = staleSessions.filter(s => s.retryCount < s.maxRetries);

    for (const session of pendingSessions) {
      try {
        const result = await this.reconnect(session.tenantId);
        if (result.success) {
          reconnected++;
        } else {
          errors.push(`Tenant ${session.tenantId}: ${result.error}`);
        }
      } catch (err) {
        errors.push(`Tenant ${session.tenantId}: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
      }
    }

    return { checked: staleSessions.length, reconnected, errors };
  }

  // ─── Private ─────────────────────────────────

  private tenantSessionName(tenantId: string): string {
    return `tenant_${tenantId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`;
    return h;
  }

  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.endsWith('@c.us') || cleaned.endsWith('@g.us')) return cleaned;
    if (cleaned.startsWith('+')) return `${cleaned.substring(1)}@c.us`;
    return `${cleaned}@c.us`;
  }

  /**
   * Fetch session status from WAHA engine.
   */
  private async getWahaSessionStatus(
    tenantId: string,
  ): Promise<WahaSessionStatus | null> {
    const wahaSessionName = this.tenantSessionName(tenantId);

    try {
      const res = await fetch(
        `${this.apiUrl}/api/${encodeURIComponent(wahaSessionName)}/status`,
        { headers: this.headers(), signal: AbortSignal.timeout(10000) },
      );

      if (res.status === 404) return null; // Session doesn't exist in WAHA
      if (!res.ok) return null;

      return (await res.json()) as WahaSessionStatus;
    } catch {
      return null;
    }
  }

  /**
   * Map WAHA engine status to our internal status.
   */
  private mapWahaStatus(wahaStatus: string): WhatsAppConnectionStatus {
    switch (wahaStatus) {
      case 'WORKING':
        return 'CONNECTED';
      case 'SCAN_QR_CODE':
        return 'SCANNING';
      case 'STARTING':
        return 'STARTING';
      case 'FAILED':
        return 'ERROR';
      case 'STOPPED':
        return 'DISCONNECTED';
      default:
        return 'DISCONNECTED';
    }
  }
}

// Singleton instance (reused across API routes)
let _instance: WahaSessionManager | null = null;

export function getWahaManager(): WahaSessionManager {
  if (!_instance) _instance = new WahaSessionManager();
  return _instance;
}
