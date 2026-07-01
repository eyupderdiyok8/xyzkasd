// ──────────────────────────────────────────────
// Water Purifier Service ERP — Messaging Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseMessagingService } from '../base-messaging.service';
import { WhatsAppService } from '../whatsapp.service';
import { SmsService } from '../sms.service';
import { EmailService } from '../email.service';
import { MessagingFactory } from '../messaging.factory';
import type { MessagePayload } from '../types';

// ── Helpers ──────────────────────────────────

/** Type-safe helper for building a mock Response. */
function mockResponse(data: object, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(ok ? '' : JSON.stringify(data)),
  } as Response;
}

/** Minimal test double that implements sendMessage for BaseMessagingService testing. */
class TestMessagingService extends BaseMessagingService {
  readonly channel = 'SMS' as const;
  private readonly shouldFail: boolean;

  constructor(shouldFail = false) {
    super();
    this.shouldFail = shouldFail;
  }

  override async sendMessage(_payload: MessagePayload) {
    if (this.shouldFail) return { success: false, error: 'simulated failure' };
    return { success: true, messageId: 'test-msg-1' };
  }

  override async sendTemplate() {
    if (this.shouldFail) return { success: false, error: 'simulated failure' };
    return { success: true, messageId: 'test-tpl-1' };
  }
}

// ── BaseMessagingService ─────────────────────

describe('BaseMessagingService', () => {
  it('sendBulk returns success count for all-ok payloads', async () => {
    const svc = new TestMessagingService(false);
    const result = await svc.sendBulk([
      { to: '+111', content: 'a' },
      { to: '+222', content: 'b' },
    ]);
    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('sendBulk correctly counts failures', async () => {
    const svc = new TestMessagingService(true);
    const result = await svc.sendBulk([
      { to: '+111', content: 'a' },
      { to: '+222', content: 'b' },
    ]);
    expect(result.success).toBe(0);
    expect(result.failed).toBe(2);
    expect(result.errors).toHaveLength(2);
    expect(result.errors[0]!.recipient).toBe('+111');
    expect(result.errors[0]!.error).toBe('simulated failure');
  });

  it('sendBulk handles partial failures', async () => {
    const ok = new TestMessagingService(false);
    const fail = new TestMessagingService(true);

    const [r1, r2] = await Promise.all([
      ok.sendBulk([{ to: '+111', content: 'a' }]),
      fail.sendBulk([{ to: '+222', content: 'b' }]),
    ]);

    expect(r1.success).toBe(1);
    expect(r2.failed).toBe(1);
  });

  it('sendBulk returns 0 for empty payloads', async () => {
    const svc = new TestMessagingService(false);
    const result = await svc.sendBulk([]);
    expect(result.success).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
  });
});

// ── WhatsAppService ──────────────────────────

describe('WhatsAppService', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ id: 'waha_msg_abc' }),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sendMessage posts to WAHA /sendText endpoint', async () => {
    const svc = new WhatsAppService({ apiUrl: 'http://waha:3001' });
    const result = await svc.sendMessage({ to: '+905551234567', content: 'Hello' });
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('waha_msg_abc');

    const [url, opts] = fetchSpy.mock.calls[0]!;
    expect(url).toContain('/api/default/sendText');
    const body = JSON.parse(opts!.body as string);
    expect(body.chatId).toBe('905551234567@c.us');
    expect(body.text).toBe('Hello');
  });

  it('sendMessage returns error on HTTP failure', async () => {
    fetchSpy.mockResolvedValue(mockResponse({ error: 'bad request' }, false));

    const svc = new WhatsAppService({ apiUrl: 'http://waha:3001' });
    const result = await svc.sendMessage({ to: '+111', content: 'x' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('WAHA hatası');
  });

  it('sendMessage catches network errors', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));

    const svc = new WhatsAppService({ apiUrl: 'http://waha:3001' });
    const result = await svc.sendMessage({ to: '+111', content: 'x' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('ECONNREFUSED');
  });

  it('sendTemplate posts to WAHA /sendTemplate endpoint', async () => {
    const svc = new WhatsAppService({ apiUrl: 'http://waha:3001' });
    const result = await svc.sendTemplate({
      templateName: 'maintenance_reminder',
      to: '+905551234567',
      variables: { name: 'Ali' },
    });
    expect(result.success).toBe(true);

    const [url, opts] = fetchSpy.mock.calls[0]!;
    expect(url).toContain('/api/default/sendTemplate');
    const body = JSON.parse(opts!.body as string);
    expect(body.template.name).toBe('maintenance_reminder');
    expect(body.template.language).toBe('tr');
  });

  it('normalizes Turkish phone numbers to WAHA chatId', async () => {
    const svc = new WhatsAppService();
    // Access private method via prototype
    const normalize = (WhatsAppService.prototype as any).normalizePhone.bind(svc);
    expect(normalize('905551234567')).toBe('905551234567@c.us');
    expect(normalize('+905551234567')).toBe('905551234567@c.us');
    expect(normalize('5551234567')).toBe('5551234567@c.us');
    expect(normalize('5551234567@c.us')).toBe('5551234567@c.us');
  });
});

// ── SmsService ───────────────────────────────

describe('SmsService', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ id: 'sms_msg_abc' }),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sendMessage posts SMS payload', async () => {
    const svc = new SmsService({ apiUrl: 'https://sms.example.com/send', from: 'TEST' });
    const result = await svc.sendMessage({ to: '+905551234567', content: 'Hello' });
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('sms_msg_abc');

    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.to).toBe('+905551234567');
    expect(body.from).toBe('TEST');
    expect(body.text).toBe('Hello');
  });

  it('sendMessage returns error on HTTP failure', async () => {
    fetchSpy.mockResolvedValue(mockResponse({ error: 'credits exhausted' }, false));

    const svc = new SmsService();
    const result = await svc.sendMessage({ to: '+111', content: 'x' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('SMS hatası');
  });

  it('sendTemplate falls back to variable substitution', async () => {
    const svc = new SmsService({ apiUrl: 'https://sms.example.com/send', from: 'TEST' });
    await svc.sendTemplate({
      templateName: 'Sayın {{name}}, bakım zamanı',
      to: '+905551234567',
      variables: { name: 'Ali' },
    });

    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.text).toBe('Sayın Ali, bakım zamanı');
  });
});

// ── EmailService ─────────────────────────────

describe('EmailService', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ id: 'email_msg_abc' }),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sendMessage posts email payload', async () => {
    const svc = new EmailService({
      apiUrl: 'https://api.resend.com/emails',
      from: 'noreply@watererp.com',
      fromName: 'Water ERP',
    });
    const result = await svc.sendMessage({
      to: 'ali@example.com',
      subject: 'Test',
      content: 'Hello Ali',
    });
    expect(result.success).toBe(true);

    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.from).toContain('Water ERP');
    expect(body.from).toContain('noreply@watererp.com');
    expect(body.to).toBe('ali@example.com');
    expect(body.subject).toBe('Test');
    expect(body.text).toBe('Hello Ali');
  });

  it('sendMessage returns error on HTTP failure', async () => {
    fetchSpy.mockResolvedValue(mockResponse({ error: 'invalid sender' }, false));

    const svc = new EmailService();
    const result = await svc.sendMessage({ to: 'a@b.com', content: 'x' });
    expect(result.success).toBe(false);
    expect(result.error).toContain('E-posta hatası');
  });

  it('sendTemplate uses template endpoint', async () => {
    const svc = new EmailService({
      apiUrl: 'https://api.resend.com/emails',
      from: 'noreply@watererp.com',
    });
    const result = await svc.sendTemplate({
      templateName: 'welcome',
      to: 'ali@example.com',
      variables: { name: 'Ali' },
    });
    expect(result.success).toBe(true);

    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.template.name).toBe('welcome');
    expect(body.template.data).toEqual({ name: 'Ali' });
  });

  it('sendTemplate falls back to plain text when template endpoint fails', async () => {
    // First call (template) fails → second call (plain text) succeeds
    fetchSpy
      .mockResolvedValueOnce(mockResponse({ error: 'template not found' }, false))
      .mockResolvedValueOnce(mockResponse({ id: 'fallback_msg' }, true));

    const svc = new EmailService({
      apiUrl: 'https://api.resend.com/emails',
      from: 'noreply@watererp.com',
    });
    const result = await svc.sendTemplate({
      templateName: 'Sayın {{name}}, hoş geldiniz',
      to: 'ali@example.com',
      variables: { name: 'Ali' },
    });
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('fallback_msg');

    // Second call should have the substituted text
    expect(fetchSpy.mock.calls).toHaveLength(2);
    const fallbackBody = JSON.parse(fetchSpy.mock.calls[1]![1]!.body as string);
    expect(fallbackBody.text).toBe('Sayın Ali, hoş geldiniz');
  });
});

// ── MessagingFactory ─────────────────────────

describe('MessagingFactory', () => {
  afterEach(() => {
    MessagingFactory.reset();
  });

  it('create returns a WhatsAppService for WHATSAPP channel', () => {
    const svc = MessagingFactory.create({ channel: 'WHATSAPP' });
    expect(svc).toBeInstanceOf(WhatsAppService);
    expect(svc.channel).toBe('WHATSAPP');
  });

  it('create returns a SmsService for SMS channel', () => {
    const svc = MessagingFactory.create({ channel: 'SMS' });
    expect(svc).toBeInstanceOf(SmsService);
    expect(svc.channel).toBe('SMS');
  });

  it('create returns an EmailService for EMAIL channel', () => {
    const svc = MessagingFactory.create({ channel: 'EMAIL' });
    expect(svc).toBeInstanceOf(EmailService);
    expect(svc.channel).toBe('EMAIL');
  });

  it('create returns the same instance for repeated calls (singleton)', () => {
    const a = MessagingFactory.create({ channel: 'WHATSAPP' });
    const b = MessagingFactory.create({ channel: 'WHATSAPP' });
    expect(a).toBe(b);
  });

  it('getAll returns all three services', () => {
    const all = MessagingFactory.getAll();
    expect(all).toHaveLength(3);
    expect(all.map((s) => s.channel).sort()).toEqual(['EMAIL', 'SMS', 'WHATSAPP']);
  });

  it('reset clears the registry', () => {
    const a = MessagingFactory.create({ channel: 'WHATSAPP' });
    MessagingFactory.reset();
    const b = MessagingFactory.create({ channel: 'WHATSAPP' });
    expect(a).not.toBe(b);
  });

  it('create accepts optional per-channel config', () => {
    const svc = MessagingFactory.create({
      channel: 'WHATSAPP',
      config: { apiUrl: 'http://custom:3001' },
    }) as WhatsAppService;
    expect(svc).toBeInstanceOf(WhatsAppService);
  });
});
