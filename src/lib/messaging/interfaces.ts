// ──────────────────────────────────────────────
// Water Purifier Service ERP — MessagingService Interface
// Multi-Tenant SaaS
//
// Tüm mesajlaşma kanalları (WhatsApp, SMS, Email) bu
// interface'i implemente eder. Yeni bir kanal eklemek
// için sadece yeni bir class yazmak yeterlidir.
// ──────────────────────────────────────────────

import type {
  BulkMessageResult,
  MessageChannel,
  MessagePayload,
  SendMessageResult,
  TemplateMessage,
} from './types';

/**
 * Ortak mesajlaşma servis interface'i.
 *
 * Her kanal (WhatsApp, SMS, Email) bu interface'i
 * implemente eder. sendMessage doğrudan metin gönderimi,
 * sendTemplate provider tarafındaki şablonları kullanır,
 * sendBulk ise toplu gönderim yapar.
 */
export interface MessagingService {
  /** Kanal tanımlayıcısı: WHATSAPP | SMS | EMAIL */
  readonly channel: MessageChannel;

  /**
   * Doğrudan metin mesajı gönderir.
   * @param payload - Mesaj içeriği ve hedef
   */
  sendMessage(payload: MessagePayload): Promise<SendMessageResult>;

  /**
   * Provider tarafında tanımlı bir şablonu değişkenlerle
   * doldurup gönderir (örn. WhatsApp template, email template).
   * @param payload - Şablon adı, değişkenler ve hedef
   */
  sendTemplate(payload: TemplateMessage): Promise<SendMessageResult>;

  /**
   * Aynı içeriği birden çok alıcıya gönderir.
   * Kısmi başarı durumunda başarısız olanlar
   * BulkMessageResult.errors içinde döner.
   * @param payloads - Mesaj listesi
   */
  sendBulk(payloads: MessagePayload[]): Promise<BulkMessageResult>;
}
