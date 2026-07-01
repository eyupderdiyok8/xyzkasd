// ──────────────────────────────────────────────
// Water Purifier Service ERP — BaseMessagingService
// Multi-Tenant SaaS
//
// Tüm mesajlaşma servisleri bu base class'ı extend
// eder. sendBulk ortak implementasyonu burada
// bir kez yazılır, her kanal aynı mantığı kullanır.
//
// Yeni bir kanal eklemek için:
//   1. BaseMessagingService extend eden class yaz
//   2. sendMessage ve sendTemplate implement et
//   3. Factory'e yeni case ekle — hazır.
// ──────────────────────────────────────────────

import type { MessagingService } from './interfaces';
import type {
  BulkMessageResult,
  MessageChannel,
  MessagePayload,
  SendMessageResult,
  TemplateMessage,
} from './types';

/**
 * Tüm messaging servisleri için ortak base class.
 *
 * sendBulk tüm kanallar için aynı mantıkla çalıştığından
 * burada bir kez implemente edilmiştir. Alt sınıflar
 * sadece sendMessage ve sendTemplate sağlar.
 */
export abstract class BaseMessagingService implements MessagingService {
  /** Kanala özgü tanımlayıcı — her alt sınıf set eder. */
  abstract readonly channel: MessageChannel;

  /** Doğrudan metin mesajı gönderir (kanala özgü). */
  abstract sendMessage(payload: MessagePayload): Promise<SendMessageResult>;

  /** Provider şablonu gönderir (kanala özgü). */
  abstract sendTemplate(payload: TemplateMessage): Promise<SendMessageResult>;

  /**
   * Aynı içeriği birden çok alıcıya paralel gönderir.
   * Kısmi başarı durumunda başarısız olanlar errors içinde döner.
   *
   * Tüm kanallar için aynı mantık geçerlidir.
   */
  async sendBulk(payloads: MessagePayload[]): Promise<BulkMessageResult> {
    const results = await Promise.allSettled(
      payloads.map((p) => this.sendMessage(p)),
    );

    let success = 0;
    const errors: { recipient: string; error: string }[] = [];

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled' && r.value?.success) {
        success++;
      } else {
        const errMsg =
          r.status === 'rejected'
            ? r.reason?.message ?? 'Bilinmeyen hata'
            : r.value?.error ?? 'Bilinmeyen hata';
        errors.push({ recipient: payloads[i].to, error: errMsg });
      }
    }

    return { success, failed: errors.length, errors };
  }
}
