// ──────────────────────────────────────────────
// MessagingFactory — Servis örneklerini oluşturur
// ──────────────────────────────────────────────
// Yeni bir kanal eklemek için:
//   1. Interface'i implemente eden yeni bir class yaz
//   2. Bu factory'e yeni case'i ekle
//   3. Kullanmaya başla — mevcut kod değişmez
// ──────────────────────────────────────────────

import type { MessagingService } from './interfaces';
import type { MessageChannel } from './types';
import { EmailService, type EmailServiceConfig } from './email.service';
import { SmsService, type SmsServiceConfig } from './sms.service';
import {
  WhatsAppService,
  type WhatsAppServiceConfig,
} from './whatsapp.service';

/** Kanala özel konfigürasyon. */
export type ChannelConfig =
  | { channel: 'WHATSAPP'; config?: WhatsAppServiceConfig }
  | { channel: 'SMS'; config?: SmsServiceConfig }
  | { channel: 'EMAIL'; config?: EmailServiceConfig };

/** Kayıtlı servis örneklerini tutan registry. */
const registry = new Map<MessageChannel, MessagingService>();

/**
 * İstenen kanal için bir MessagingService örneği döndürür.
 * Instance'lar singleton olarak registry'de tutulur.
 *
 * @example
 * ```ts
 * const whatsapp = MessagingFactory.create({ channel: 'WHATSAPP' });
 * const result = await whatsapp.sendMessage({ to: '...', content: '...' });
 * ```
 */
export class MessagingFactory {
  static create(channelConfig: ChannelConfig): MessagingService {
    const { channel } = channelConfig;

    const existing = registry.get(channel);
    if (existing) return existing;

    let service: MessagingService;

    switch (channel) {
      case 'WHATSAPP': {
        const cfg = channelConfig as { channel: 'WHATSAPP'; config?: WhatsAppServiceConfig };
        service = new WhatsAppService(cfg.config);
        break;
      }
      case 'SMS': {
        const cfg = channelConfig as { channel: 'SMS'; config?: SmsServiceConfig };
        service = new SmsService(cfg.config);
        break;
      }
      case 'EMAIL': {
        const cfg = channelConfig as { channel: 'EMAIL'; config?: EmailServiceConfig };
        service = new EmailService(cfg.config);
        break;
      }
      default: {
        const _exhaustive: never = channel;
        throw new Error(`Desteklenmeyen mesaj kanalı: ${_exhaustive}`);
      }
    }

    registry.set(channel, service);
    return service;
  }

  /**
   * Tüm kayıtlı servisleri döndürür.
   * İlk çağrıda tüm kanalları başlatır.
   */
  static getAll(): MessagingService[] {
    return [
      MessagingFactory.create({ channel: 'WHATSAPP' }),
      MessagingFactory.create({ channel: 'SMS' }),
      MessagingFactory.create({ channel: 'EMAIL' }),
    ];
  }

  /** Registry'yi temizler (test ortamları için). */
  static reset(): void {
    registry.clear();
  }
}
