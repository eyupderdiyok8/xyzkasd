// ──────────────────────────────────────────────
// SMSService — Generic SMS Provider
// ──────────────────────────────────────────────
// Environment variables:
//   SMS_PROVIDER_URL  — API endpoint (default: https://api.smsprovider.com/v1/send)
//   SMS_API_KEY       — API anahtarı
//   SMS_FROM          — Gönderici adı / number (default: "WATER-ERP")
// ──────────────────────────────────────────────

import { BaseMessagingService } from './base-messaging.service';
import type {
  MessageChannel,
  MessagePayload,
  SendMessageResult,
  TemplateMessage,
} from './types';

export interface SmsServiceConfig {
  apiUrl?: string;
  apiKey?: string;
  from?: string;
}

export class SmsService extends BaseMessagingService {
  readonly channel: MessageChannel = 'SMS';

  private apiUrl: string;
  private apiKey: string;
  private from: string;

  constructor(config: SmsServiceConfig = {}) {
    super();
    this.apiUrl = config.apiUrl ?? process.env.SMS_PROVIDER_URL ?? 'https://api.smsprovider.com/v1/send';
    this.apiKey = config.apiKey ?? process.env.SMS_API_KEY ?? '';
    this.from = config.from ?? process.env.SMS_FROM ?? 'WATER-ERP';
  }

  async sendMessage(payload: MessagePayload): Promise<SendMessageResult> {
    try {
      const body = {
        to: payload.to,
        from: this.from,
        text: payload.content,
      };

      const res = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `SMS hatası (${res.status}): ${text}` };
      }

      const data = (await res.json()) as { id?: string };
      return { success: true, messageId: data.id };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'SMS gönderim hatası',
      };
    }
  }

  async sendTemplate(payload: TemplateMessage): Promise<SendMessageResult> {
    // SMS provider'larda şablon desteği yaygın değildir,
    // bu nedenle fallback olarak değişkenleri content'e gömüp
    // düz metin olarak gönderiyoruz.
    const content = Object.entries(payload.variables).reduce(
      (acc, [key, value]) => acc.replace(`{{${key}}}`, value),
      payload.templateName, // templateName burada şablon metni olarak kullanılır
    );
    return this.sendMessage({ to: payload.to, content });
  }

}
