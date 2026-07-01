// ──────────────────────────────────────────────
// Water Purifier Service ERP — Automation Trigger API Tests
// Multi-Tenant SaaS
//
// Covers: POST /api/automation/trigger
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = {
  ok: true, userId: 'user-1', role: 'manager' as const, tenantId: 'tenant-1', plan: 'PROFESSIONAL', error: null as any,
};

vi.mock('@/lib/supabase/require-feature', () => ({
  requireFeature: vi.fn(() => Promise.resolve(mockAuth)),
}));

const mockEngine = {
  fireTrigger: vi.fn(),
};

vi.mock('@/lib/automation', () => ({
  AutomationEngine: class { constructor() { return mockEngine; } },
}));

function mockReq(body: Record<string, unknown> = {}): any {
  return { json: vi.fn().mockResolvedValue(body) };
}

describe('POST /api/automation/trigger', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('fires a valid trigger through the automation engine', async () => {
    mockEngine.fireTrigger.mockResolvedValue({
      matched: 1, executed: 1, succeeded: 1, results: [{ actionType: 'send_message', success: true }],
    });

    const { POST } = await import('../automation/trigger/route');

    // Use NextRequest-compatible mock
    const req: any = {
      json: vi.fn().mockResolvedValue({
        trigger: 'service.completed',
        entityType: 'service_ticket',
        entityId: 'ticket-1',
        data: { ticketNo: 'SRV-001' },
      }),
      headers: new Headers(),
      nextUrl: new URL('http://localhost:3000/api/automation/trigger'),
    };

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.matched).toBe(1);
    expect(mockEngine.fireTrigger).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: 'service.completed',
        entityType: 'service_ticket',
        entityId: 'ticket-1',
      }),
    );
  });

  it('returns 400 when trigger field is missing', async () => {
    const { POST } = await import('../automation/trigger/route');
    const req: any = {
      json: vi.fn().mockResolvedValue({ entityType: 'service_ticket', entityId: 'ticket-1' }),
      headers: new Headers(),
      nextUrl: new URL('http://localhost:3000/api/automation/trigger'),
    };
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when entityType is missing', async () => {
    const { POST } = await import('../automation/trigger/route');
    const req: any = {
      json: vi.fn().mockResolvedValue({ trigger: 'service.completed', entityId: 'ticket-1' }),
      headers: new Headers(),
      nextUrl: new URL('http://localhost:3000/api/automation/trigger'),
    };
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when entityId is missing', async () => {
    const { POST } = await import('../automation/trigger/route');
    const req: any = {
      json: vi.fn().mockResolvedValue({ trigger: 'service.completed', entityType: 'service_ticket' }),
      headers: new Headers(),
      nextUrl: new URL('http://localhost:3000/api/automation/trigger'),
    };
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid trigger value', async () => {
    const { POST } = await import('../automation/trigger/route');
    const req: any = {
      json: vi.fn().mockResolvedValue({ trigger: 'invalid.trigger', entityType: 'test', entityId: '123' }),
      headers: new Headers(),
      nextUrl: new URL('http://localhost:3000/api/automation/trigger'),
    };
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('Geçersiz tetikleyici');
  });

  it('accepts all valid trigger types', async () => {
    mockEngine.fireTrigger.mockResolvedValue({ matched: 0, executed: 0, succeeded: 0, results: [] });

    const triggers = [
      'service.completed', 'service.assigned', 'maintenance.due',
      'device.registered', 'customer.created', 'filter.change.due',
      'survey.response', 'ticket.status.changed',
    ];

    for (const trigger of triggers) {
      const { POST } = await import('../automation/trigger/route');
      const req: any = {
        json: vi.fn().mockResolvedValue({ trigger, entityType: 'test', entityId: '123', data: {} }),
        headers: new Headers(),
        nextUrl: new URL('http://localhost:3000/api/automation/trigger'),
      };
      const res = await POST(req);
      expect(res.status).toBe(200);
      vi.clearAllMocks();
    }
  });

  it('returns 500 when engine throws', async () => {
    mockEngine.fireTrigger.mockRejectedValue(new Error('Engine error'));

    const { POST } = await import('../automation/trigger/route');
    const req: any = {
      json: vi.fn().mockResolvedValue({
        trigger: 'service.completed', entityType: 'service_ticket', entityId: 'ticket-1', data: {},
      }),
      headers: new Headers(),
      nextUrl: new URL('http://localhost:3000/api/automation/trigger'),
    };
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('returns 401 when not authenticated', async () => {
    const { requireFeature } = await import('@/lib/supabase/require-feature');
    vi.mocked(requireFeature).mockResolvedValueOnce({
      ok: false, userId: null, role: null, tenantId: null, plan: null,
      error: { status: 401, code: 'UNAUTHORIZED', message: '' },
    });

    const { POST } = await import('../automation/trigger/route');
    const req: any = {
      json: vi.fn().mockResolvedValue({}),
      headers: new Headers(),
      nextUrl: new URL('http://localhost:3000/api/automation/trigger'),
    };
    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});
