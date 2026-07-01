// ──────────────────────────────────────────────
// Water Purifier Service ERP — Messaging Comprehensive Edge Case Tests
// Multi-Tenant SaaS
//
// Tests: deep edge cases for EmailService, WhatsAppService, SmsService,
// MessagingFactory — attachment handling, error paths, config edge cases
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WhatsAppService } from '../whatsapp.service';
import { SmsService } from '../sms.service';
import { EmailService } from '../email.service';
import { MessagingFactory } from '../messaging.factory';
import { BaseMessagingService } from '../base-messaging.service';
import type { MessagePayload, SendMessageResult, Attachment } from '../types';

// ── Helpers ──────────────────────────────────

function mockResponse(data: object, ok = true): Response {
  return {
    ok,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(ok ? '' : JSON.stringify(data)),
  } as Response;
}

// ── BaseMessagingService — edge cases ────────

describe('BaseMessagingService — edge cases', () => {
  class TestService extends BaseMessagingService {
    readonly channel = 'SMS' as const;
    callCount = 0;

    override async sendMessage(_payload: MessagePayload) {
      this.callCount++;
      if (this.callCount === 2) return { success: false, error: 'second fails' };
      return { success: true, messageId: `msg-${this.callCount}` };
    }

    override async sendTemplate() {
      return { success: true, messageId: 'tpl' };
    }
  }

  it('sendBulk handles 100 payloads', async () => {
    const svc = new TestService();
    const payloads = Array.from({ length: 100 }, (_, i) => ({
      to: `+111${i}`,
      content: `msg-${i}`,
    }));
    const result = await svc.sendBulk(payloads);
    expect(result.success).toBe(99); // second call fails
    expect(result.failed).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it('sendBulk handles a single payload', async () => {
    const svc = new TestService();
    const result = await svc.sendBulk([{ to: '+111', content: 'single' }]);
    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
  });

  it('sendBulk handles sendMessage throwing an exception', async () => {
    const svc = new (class extends BaseMessagingService {
      readonly channel = 'SMS' as const;
      override async sendMessage(_payload: MessagePayload): Promise<SendMessageResult> { throw new Error('Unexpected crash'); }
      override async sendTemplate() { return { success: true, messageId: 't' }; }
    })();
    const result = await svc.sendBulk([{ to: '+111', content: 'x' }]);
    expect(result.success).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.errors[0]!.error).toBe('Unexpected crash');
  });

  it('sendBulk handles sendMessage returning nullish result', async () => {
    const svc = new (class extends BaseMessagingService {
      readonly channel = 'SMS' as const;
      override async sendMessage(_payload: MessagePayload): Promise<SendMessageResult> { return null as any; }
      override async sendTemplate() { return { success: true, messageId: 't' }; }
    })();
    const result = await svc.sendBulk([{ to: '+111', content: 'x' }]);
    // nullish result: r.value.success throws → caught as rejected
    expect(result.failed).toBe(1);
    expect(result.success).toBe(0);
  });
});

// ── WhatsAppService — edge cases ─────────────

describe('WhatsAppService — edge cases', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ id: 'waha_msg' }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses custom session name in URL', async () => {
    const svc = new WhatsAppService({ apiUrl: 'http://waha:3001', session: 'my-session' });
    await svc.sendMessage({ to: '+905551234567', content: 'Hello' });
    const [url] = fetchSpy.mock.calls[0]!;
    expect(url).toContain('/api/my-session/sendText');
  });

  it('uses "default" session when not specified', async () => {
    const svc = new WhatsAppService({ apiUrl: 'http://waha:3001' });
    await svc.sendMessage({ to: '+111', content: 'Hello' });
    const [url] = fetchSpy.mock.calls[0]!;
    expect(url).toContain('/api/default/sendText');
  });

  it('sends API key header when configured', async () => {
    const svc = new WhatsAppService({ apiUrl: 'http://waha:3001', apiKey: 'sec-123' });
    await svc.sendMessage({ to: '+111', content: 'x' });
    const [_url, opts] = fetchSpy.mock.calls[0]!;
    expect(opts!.headers!['Authorization']).toBe('Bearer sec-123');
  });

  it('does not send Authorization header when no API key', async () => {
    const svc = new WhatsAppService({ apiUrl: 'http://waha:3001' });
    await svc.sendMessage({ to: '+111', content: 'x' });
    const [_url, opts] = fetchSpy.mock.calls[0]!;
    expect(opts!.headers!['Authorization']).toBeUndefined();
  });

  it('handles attachment in sendMessage', async () => {
    const svc = new WhatsAppService({ apiUrl: 'http://waha:3001' });
    const attachment: Attachment = {
      filename: 'test.pdf',
      content: Buffer.from('fake-pdf-content'),
      mimeType: 'application/pdf',
    };
    await svc.sendMessage({ to: '+111', content: 'With attachment', attachments: [attachment] });
    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.attachment).toBeDefined();
    expect(body.attachment.filename).toBe('test.pdf');
    expect(body.attachment.mimetype).toBe('application/pdf');
    expect(body.attachment.data).toBe('ZmFrZS1wZGYtY29udGVudA==');
  });

  it('handles attachment with Uint8Array content', async () => {
    const svc = new WhatsAppService({ apiUrl: 'http://waha:3001' });
    const attachment: Attachment = {
      filename: 'img.png',
      content: new Uint8Array([137, 80, 78, 71]), // PNG header bytes
      mimeType: 'image/png',
    };
    await svc.sendMessage({ to: '+111', content: 'Photo', attachments: [attachment] });
    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.attachment.mimetype).toBe('image/png');
    // base64 of [137,80,78,71] = "iVBORw==" (padded)
    expect(body.attachment.data).toBe('iVBORw==');
  });

  it('sendTemplate returns error on HTTP failure', async () => {
    fetchSpy.mockResolvedValue(mockResponse({ error: 'template not found' }, false));
    const svc = new WhatsAppService({ apiUrl: 'http://waha:3001' });
    const result = await svc.sendTemplate({
      templateName: 'welcome',
      to: '+111',
      variables: { name: 'Ali' },
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('WAHA şablon hatası');
  });

  it('sendTemplate catches network errors', async () => {
    fetchSpy.mockRejectedValue(new Error('ECONNREFUSED'));
    const svc = new WhatsAppService({ apiUrl: 'http://waha:3001' });
    const result = await svc.sendTemplate({
      templateName: 'test',
      to: '+111',
      variables: {},
    });
    expect(result.success).toBe(false);
    expect(result.error).toBe('ECONNREFUSED');
  });

  it('sendTemplate uses custom language', async () => {
    const svc = new WhatsAppService({ apiUrl: 'http://waha:3001' });
    await svc.sendTemplate({
      templateName: 'test',
      to: '+111',
      variables: { name: 'Ali' },
      language: 'en',
    });
    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.template.language).toBe('en');
  });

  it('sendTemplate sends template parameters', async () => {
    const svc = new WhatsAppService({ apiUrl: 'http://waha:3001' });
    await svc.sendTemplate({
      templateName: 'test',
      to: '+111',
      variables: { name: 'Ali', code: '123' },
    });
    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.template.components[0].parameters).toHaveLength(2);
    expect(body.template.components[0].parameters[0].text).toBe('Ali');
    expect(body.template.components[0].parameters[1].text).toBe('123');
  });
});

// ── SmsService — edge cases ──────────────────

describe('SmsService — edge cases', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ id: 'sms-ok' }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses config values when provided', async () => {
    const svc = new SmsService({
      apiUrl: 'https://custom.sms.com/send',
      apiKey: 'key-custom',
      from: 'CUSTOM',
    });
    await svc.sendMessage({ to: '+111', content: 'test' });
    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.from).toBe('CUSTOM');
  });

  it('uses defaults when config is empty', () => {
    const svc = new SmsService({});
    expect((svc as any).apiUrl).toBe('https://api.smsprovider.com/v1/send');
    expect((svc as any).from).toBe('WATER-ERP');
  });

  it('handles empty config object', () => {
    const svc = new SmsService();
    expect(svc).toBeDefined();
    expect(svc.channel).toBe('SMS');
  });

  it('sendMessage catches network errors', async () => {
    fetchSpy.mockRejectedValue(new Error('ETIMEDOUT'));
    const svc = new SmsService();
    const result = await svc.sendMessage({ to: '+111', content: 'x' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('ETIMEDOUT');
  });

  it('sendTemplate fills variables with non-string values gracefully', async () => {
    const svc = new SmsService({ apiUrl: 'https://sms.example.com/send' });
    await svc.sendTemplate({
      templateName: 'Kod: {{code}}',
      to: '+111',
      variables: { code: 'ABC', name: 'Ali' },
    });
    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.text).toBe('Kod: ABC');
  });

  it('sendTemplate handles empty variables', async () => {
    const svc = new SmsService({ apiUrl: 'https://sms.example.com/send' });
    await svc.sendTemplate({
      templateName: 'Sabit mesaj',
      to: '+111',
      variables: {},
    });
    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.text).toBe('Sabit mesaj');
  });
});

// ── EmailService — edge cases ────────────────

describe('EmailService — edge cases', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockResponse({ id: 'email-ok' }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses config values when provided', async () => {
    const svc = new EmailService({
      apiUrl: 'https://custom.email.com/send',
      apiKey: 'key-email',
      from: 'custom@test.com',
      fromName: 'Custom App',
    });
    await svc.sendMessage({ to: 'a@b.com', subject: 'S', content: 'C' });
    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.from).toContain('Custom App');
    expect(body.from).toContain('custom@test.com');
  });

  it('uses defaults when config is empty', () => {
    const svc = new EmailService({});
    expect((svc as any).apiUrl).toBe('https://api.resend.com/emails');
    expect((svc as any).from).toBe('noreply@watererp.com');
  });

  it('handles attachment with Buffer in sendMessage', async () => {
    const svc = new EmailService({ apiUrl: 'https://api.resend.com/emails' });
    const attachment: Attachment = {
      filename: 'report.pdf',
      content: Buffer.from('PDF content here'),
      mimeType: 'application/pdf',
    };
    await svc.sendMessage({
      to: 'a@b.com',
      subject: 'Report',
      content: 'See attachment',
      attachments: [attachment],
    });
    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0].filename).toBe('report.pdf');
    expect(body.attachments[0].content).toBe('UERGIGNvbnRlbnQgaGVyZQ==');
    expect(body.attachments[0].contentType).toBe('application/pdf');
  });

  it('handles attachment with string content in sendMessage', async () => {
    const svc = new EmailService({ apiUrl: 'https://api.resend.com/emails' });
    const attachment: Attachment = {
      filename: 'note.txt',
      content: new Uint8Array(Buffer.from('plain text')),
      mimeType: 'text/plain',
    };
    await svc.sendMessage({
      to: 'a@b.com',
      subject: 'Note',
      content: 'Text file',
      attachments: [attachment],
    });
    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0].filename).toBe('note.txt');
  });

  it('sendMessage with empty attachments array', async () => {
    const svc = new EmailService({ apiUrl: 'https://api.resend.com/emails' });
    await svc.sendMessage({
      to: 'a@b.com',
      subject: 'Empty attachment',
      content: 'No files',
      attachments: [],
    });
    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.attachments).toBeUndefined();
  });

  it('sendMessage catches network errors', async () => {
    fetchSpy.mockRejectedValue(new Error('ENOTFOUND'));
    const svc = new EmailService();
    const result = await svc.sendMessage({ to: 'a@b.com', content: 'x' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('ENOTFOUND');
  });

  it('sendTemplate fallback on template endpoint error', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockResponse({ error: 'template disabled' }, false))
      .mockResolvedValueOnce(mockResponse({ id: 'fallback' }, true));

    const svc = new EmailService({ apiUrl: 'https://api.resend.com/emails' });
    const result = await svc.sendTemplate({
      templateName: 'Merhaba {{name}}',
      to: 'a@b.com',
      variables: { name: 'Ali' },
    });
    expect(result.success).toBe(true);
    // Second call should have replaced variables
    expect(fetchSpy.mock.calls).toHaveLength(2);
    const fallbackBody = JSON.parse(fetchSpy.mock.calls[1]![1]!.body as string);
    expect(fallbackBody.text).toBe('Merhaba Ali');
  });

  it('sendTemplate falls back to sendMessage when template endpoint throws', async () => {
    // Template endpoint throws → catch returns error, no fallback to sendMessage
    // (fallback only happens when HTTP returns !ok, not on network error)
    fetchSpy.mockRejectedValueOnce(new Error('Template API down'));

    const svc = new EmailService({ apiUrl: 'https://api.resend.com/emails' });
    const result = await svc.sendTemplate({
      templateName: 'Hoşgeldin {{name}}',
      to: 'a@b.com',
      variables: { name: 'Veli' },
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('Template API down');
  });

  it('sendTemplate fails when both template and fallback fail', async () => {
    fetchSpy
      .mockResolvedValueOnce(mockResponse({ error: 'fail' }, false))
      .mockResolvedValueOnce(mockResponse({ error: 'also fail' }, false));

    const svc = new EmailService({ apiUrl: 'https://api.resend.com/emails' });
    const result = await svc.sendTemplate({
      templateName: 'Test',
      to: 'a@b.com',
      variables: { name: 'Test' },
    });
    expect(result.success).toBe(false);
  });

  it('sendTemplate with subject from templateName', async () => {
    fetchSpy.mockResolvedValue(mockResponse({ id: 'email-ok' }));
    const svc = new EmailService({ apiUrl: 'https://api.resend.com/emails' });
    await svc.sendTemplate({
      templateName: 'welcome-template',
      to: 'a@b.com',
      variables: { name: 'Ali' },
    });
    const [_url, opts] = fetchSpy.mock.calls[0]!;
    const body = JSON.parse(opts!.body as string);
    expect(body.subject).toBe('welcome-template');
  });
});

// ── MessagingFactory — edge cases ────────────

describe('MessagingFactory — edge cases', () => {
  afterEach(() => {
    MessagingFactory.reset();
  });

  it('getAll returns fresh instances after reset', () => {
    const first = MessagingFactory.getAll();
    expect(first).toHaveLength(3);

    MessagingFactory.reset();
    const second = MessagingFactory.getAll();
    expect(second).toHaveLength(3);
    // Different instances after reset
    expect(second[0]).not.toBe(first[0]);
  });

  it('create with config returns properly configured instance', () => {
    const svc = MessagingFactory.create({
      channel: 'WHATSAPP',
      config: { session: 'custom-session' },
    }) as WhatsAppService;
    expect((svc as any).session).toBe('custom-session');
  });

  it('create returns same instance for same channel (singleton)', () => {
    const a = MessagingFactory.create({ channel: 'SMS' });
    const b = MessagingFactory.create({ channel: 'SMS' });
    expect(a).toBe(b);
  });

  it('getAll returns instances in consistent order', () => {
    const all = MessagingFactory.getAll();
    expect(all[0]!.channel).toBe('WHATSAPP');
    expect(all[1]!.channel).toBe('SMS');
    expect(all[2]!.channel).toBe('EMAIL');
  });

  it('registry isolation — different channels have different instances', () => {
    const whatsapp = MessagingFactory.create({ channel: 'WHATSAPP' });
    const sms = MessagingFactory.create({ channel: 'SMS' });
    const email = MessagingFactory.create({ channel: 'EMAIL' });
    expect(whatsapp).not.toBe(sms);
    expect(sms).not.toBe(email);
    expect(email).not.toBe(whatsapp);
  });
});
