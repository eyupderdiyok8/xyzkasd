// ──────────────────────────────────────────────
// Water Purifier Service ERP — IP Utility Tests
// Multi-Tenant SaaS
//
// Tests: getClientIp helper with various proxy headers.
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { getClientIp } from '../ip';

// Helper: create a minimal mock NextRequest with headers
function mockRequest(headers: Record<string, string>): any {
  return {
    headers: {
      get: (key: string) => headers[key] ?? null,
    },
  };
}

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = mockRequest({ 'x-forwarded-for': '203.0.113.42' });
    expect(getClientIp(req)).toBe('203.0.113.42');
  });

  it('takes the first IP from comma-separated x-forwarded-for', () => {
    const req = mockRequest({ 'x-forwarded-for': '203.0.113.42, 10.0.0.1, 192.168.1.1' });
    expect(getClientIp(req)).toBe('203.0.113.42');
  });

  it('extracts IP from x-real-ip header', () => {
    const req = mockRequest({
      'x-real-ip': '198.51.100.7',
      'x-forwarded-for': '', // empty → should not match
    });
    expect(getClientIp(req)).toBe('198.51.100.7');
  });

  it('extracts IP from cf-connecting-ip header', () => {
    const req = mockRequest({
      'cf-connecting-ip': '192.0.2.99',
    });
    expect(getClientIp(req)).toBe('192.0.2.99');
  });

  it('prefers x-forwarded-for over other headers', () => {
    const req = mockRequest({
      'x-forwarded-for': '203.0.113.1',
      'x-real-ip': '198.51.100.1',
      'cf-connecting-ip': '192.0.2.1',
    });
    expect(getClientIp(req)).toBe('203.0.113.1');
  });

  it('returns null when no IP headers are present', () => {
    const req = mockRequest({});
    expect(getClientIp(req)).toBeNull();
  });

  it('trims whitespace from IP values', () => {
    const req = mockRequest({ 'x-forwarded-for': '  203.0.113.42  ' });
    expect(getClientIp(req)).toBe('203.0.113.42');
  });

  it('handles IPv6 addresses', () => {
    const req = mockRequest({ 'x-forwarded-for': '2001:db8::1' });
    expect(getClientIp(req)).toBe('2001:db8::1');
  });
});
