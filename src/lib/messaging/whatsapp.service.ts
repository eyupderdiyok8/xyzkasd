// ──────────────────────────────────────────────
// WhatsAppService — WAHA (WhatsApp HTTP API)
// ──────────────────────────────────────────────
// WAHA (WhatApp HTTP API) Docker container'ına
// REST istekleri göndererek çalışır.
//
// Environment variables:
//   WAHA_API_URL  (default: http://localhost:3001)
//   WAHA_API_KEY  (opsiyonel)
// ──────────────────────────────────────────────

import { BaseMessagingService } from './base-messaging.service';
import type {
  Attachment,
  MessageChannel,
  MessagePayload,
  SendMessageResult,
  TemplateMessage,
} from './types';

export interface WhatsAppServiceConfig {
  apiUrl?: string;
  apiKey?: string;
  /** WAHA session name (default: "default"). */
  session?: string;
}

export class WhatsAppService extends BaseMessagingService {
  readonly channel: MessageChannel = 'WHATSAPP';

  private apiUrl: string;
  private apiKey: string | undefined;
  private session: string;

  constructor(config: WhatsAppServiceConfig = {}) {
    super();
    this.apiUrl = config.apiUrl ?? process.env.WAHA_API_URL ?? 'http://localhost:3001';
    this.apiKey = config.apiKey ?? process.env.WAHA_API_KEY;
    this.session = config.session ?? 'default';
  }

  async sendMessage(payload: MessagePayload): Promise<SendMessageResult> {
    try {
      const body: Record<string, unknown> = {
        chatId: this.normalizePhone(payload.to),
        text: payload.content,
      };

      if (payload.attachments && payload.attachments.length > 0) {
        body.attachment = await this.prepareAttachment(payload.attachments[0]);
      }

      const res = await fetch(`${this.apiUrl}/api/${this.session}/sendText`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `WAHA hatası (${res.status}): ${text}` };
      }

      const data = (await res.json()) as { id?: string };
      return { success: true, messageId: data.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'WhatsApp gönderim hatası',
      };
    }
  }

  async sendTemplate(payload: TemplateMessage): Promise<SendMessageResult> {
    try {
      const body = {
        chatId: this.normalizePhone(payload.to),
        template: {
          name: payload.templateName,
          language: payload.language ?? 'tr',
          components: [
            {
              type: 'body',
              parameters: Object.entries(payload.variables).map(
                ([_key, value]) => ({ type: 'text', text: value }),
              ),
            },
          ],
        },
      };

      const res = await fetch(
        `${this.apiUrl}/api/${this.session}/sendTemplate`,
        {
          method: 'POST',
          headers: this.headers(),
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10_000),
        },
      );

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `WAHA şablon hatası (${res.status}): ${text}` };
      }

      const data = (await res.json()) as { id?: string };
      return { success: true, messageId: data.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'WhatsApp şablon gönderim hatası',
      };
    }
  }

  // ── Private helpers ──────────────────────────

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`;
    return h;
  }

  /** Phone → international WAHA chatId (e.g. 905551234567@c.us). */
  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.endsWith('@c.us') || cleaned.endsWith('@g.us')) return cleaned;
    if (cleaned.startsWith('+')) return `${cleaned.substring(1)}@c.us`;
    return `${cleaned}@c.us`;
  }

  private async prepareAttachment(
    attachment: Attachment,
  ): Promise<{ mimetype: string; data: string; filename: string }> {
    const base64 =
      attachment.content instanceof Buffer
        ? attachment.content.toString('base64')
        : Buffer.from(attachment.content).toString('base64');
    return {
      mimetype: attachment.mimeType,
      data: base64,
      filename: attachment.filename,
    };
  }
}
