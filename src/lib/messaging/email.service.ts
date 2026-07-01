// ──────────────────────────────────────────────
// EmailService — SMTP / HTTP Email API
// ──────────────────────────────────────────────
// Environment variables:
//   EMAIL_PROVIDER_URL  — API endpoint (default: https://api.resend.com/emails)
//   EMAIL_API_KEY       — API anahtarı
//   EMAIL_FROM          — Gönderici adresi (default: noreply@watererp.com)
// ──────────────────────────────────────────────

import { BaseMessagingService } from './base-messaging.service';
import type {
  Attachment,
  MessageChannel,
  MessagePayload,
  SendMessageResult,
  TemplateMessage,
} from './types';

export interface EmailServiceConfig {
  apiUrl?: string;
  apiKey?: string;
  from?: string;
  fromName?: string;
}

export class EmailService extends BaseMessagingService {
  readonly channel: MessageChannel = 'EMAIL';

  private apiUrl: string;
  private apiKey: string;
  private from: string;
  private fromName: string;

  constructor(config: EmailServiceConfig = {}) {
    super();
    this.apiUrl = config.apiUrl ?? process.env.EMAIL_PROVIDER_URL ?? 'https://api.resend.com/emails';
    this.apiKey = config.apiKey ?? process.env.EMAIL_API_KEY ?? '';
    this.from = config.from ?? process.env.EMAIL_FROM ?? 'noreply@watererp.com';
    this.fromName = config.fromName ?? process.env.EMAIL_FROM_NAME ?? 'Water Purifier ERP';
  }

  async sendMessage(payload: MessagePayload): Promise<SendMessageResult> {
    try {
      const body: Record<string, unknown> = {
        from: `${this.fromName} <${this.from}>`,
        to: payload.to,
        subject: payload.subject ?? 'Bildirim',
        text: payload.content,
      };

      if (payload.attachments && payload.attachments.length > 0) {
        body.attachments = await Promise.all(
          payload.attachments.map((a) => this.prepareAttachment(a)),
        );
      }

      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `E-posta hatası (${res.status}): ${text}` };
      }

      const data = (await res.json()) as { id?: string };
      return { success: true, messageId: data.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'E-posta gönderim hatası',
      };
    }
  }

  async sendTemplate(payload: TemplateMessage): Promise<SendMessageResult> {
    try {
      const body = {
        from: `${this.fromName} <${this.from}>`,
        to: payload.to,
        subject: payload.templateName,
        template: {
          name: payload.templateName,
          data: payload.variables,
        },
      };

      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        // Fallback: template desteklenmiyorsa düz metin gönder
        const content = Object.entries(payload.variables).reduce(
          (acc, [key, value]) => acc.replace(`{{${key}}}`, value),
          payload.templateName,
        );
        return this.sendMessage({ to: payload.to, subject: payload.templateName, content });
      }

      const data = (await res.json()) as { id?: string };
      return { success: true, messageId: data.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'E-posta şablon gönderim hatası',
      };
    }
  }

  // ── Private helpers ──────────────────────────

  private async prepareAttachment(
    attachment: Attachment,
  ): Promise<{ filename: string; content: string; encoding: string; contentType: string }> {
    const base64 =
      attachment.content instanceof Buffer
        ? attachment.content.toString('base64')
        : Buffer.from(attachment.content).toString('base64');
    return {
      filename: attachment.filename,
      content: base64,
      encoding: 'base64',
      contentType: attachment.mimeType,
    };
  }
}
