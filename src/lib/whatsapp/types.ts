// ──────────────────────────────────────────────
// Water Purifier Service ERP — WAHA WhatsApp Types
// Multi-Tenant SaaS
// ──────────────────────────────────────────────
// WAHA (WhatsApp HTTP API) ile ilgili TypeScript tipleri.
// https://waha.devlike.sh/  —  WAHA API dökümantasyonu
// ──────────────────────────────────────────────

/** WAHA session durumları */
export type WahaSessionStatus =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR';

/** Session durum bilgisi (WAHA /api/{session}/status yanıtı) */
export interface WahaStatusResponse {
  status: 'STARTING' | 'SCAN_QR_CODE' | 'WORKING' | 'FAILED' | 'TIMEOUT';
  config?: Record<string, unknown>;
}

/** QR kod yanıtı (WAHA /api/{session}/qr yanıtı) */
export interface WahaQrResponse {
  data: string; // base64 QR image
  mimetype: string;
}

/** WAHA webhook event payload'ları */
export interface WahaWebhookPayload {
  event: string;
  session: string;
  payload?: {
    status?: string;
    qr?: string;
    phoneNumber?: string;
    error?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** Session oluşturma isteği (WAHA /api/{session}/start) */
export interface WahaStartSessionRequest {
  webhook?: string;
  webhookSecret?: string;
  /** WAHA 2025.1+ için gerekli 'nowebhook' veya webhook URL */
  startQr?: boolean;
}

/** Session başlatma sonucu */
export interface WahaStartSessionResponse {
  qrCode?: string;
  status: string;
}

/** Veritabanında saklanan WhatsAppSession metadata JSON şeması */
export interface WhatsAppSessionMetadata {
  wahaApiUrl?: string;
  deviceInfo?: string;
  lastKnownIp?: string;
  browserInfo?: string;
  platform?: string;
}

/** Tenant WhatsApp bağlantı durumu (API yanıtı) */
export interface WhatsAppConnectionStatus {
  connected: boolean;
  status: WahaSessionStatus;
  phoneNumber: string | null;
  qrCode: string | null;
  lastConnectedAt: string | null;
  autoReconnect: boolean;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
}

/** WhatsApp mesaj gönderme isteği (tenant bazlı) */
export interface SendMessageRequest {
  tenantId: string;
  to: string;
  content: string;
  attachments?: Array<{
    filename: string;
    data: string; // base64
    mimetype: string;
  }>;
}
