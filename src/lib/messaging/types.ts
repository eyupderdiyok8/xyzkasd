// ──────────────────────────────────────────────
// Water Purifier Service ERP — Messaging Types
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

/** Supported messaging channels — matches MaintenanceReminder.channel values. */
export type MessageChannel = 'WHATSAPP' | 'SMS' | 'EMAIL';

/** Single message payload. */
export interface MessagePayload {
  /** Recipient: phone number (for WhatsApp/SMS) or email address (for Email). */
  to: string;
  /** Plain-text message body. */
  content: string;
  /** Optional subject line (used for Email). */
  subject?: string;
  /** Optional file attachments. */
  attachments?: Attachment[];
}

/** Template-based message (e.g. WhatsApp template, email template). */
export interface TemplateMessage {
  /** Template identifier registered with the provider. */
  templateName: string;
  /** Recipient. */
  to: string;
  /** Template variable substitution map. */
  variables: Record<string, string>;
  /** Language/locale override (default: tenant default). */
  language?: string;
}

/** Result of a single sendMessage / sendTemplate call. */
export interface SendMessageResult {
  success: boolean;
  /** Provider-side message ID (if available). */
  messageId?: string;
  /** Human-readable error description. */
  error?: string;
}

/** Aggregated result of a sendBulk call. */
export interface BulkMessageResult {
  success: number;
  failed: number;
  errors: { recipient: string; error: string }[];
}

/** File attachment. */
export interface Attachment {
  filename: string;
  content: Buffer | Uint8Array;
  mimeType: string;
}
