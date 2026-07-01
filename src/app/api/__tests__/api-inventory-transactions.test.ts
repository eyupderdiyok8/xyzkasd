// ──────────────────────────────────────────────
// Water Purifier Service ERP — Inventory Transactions API Tests
// Multi-Tenant SaaS
//
// Covers: GET /api/inventory/:id/transactions
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = {
  ok: true, userId: 'user-1', role: 'technician' as const, tenantId: 'tenant-1', error: null as any,
};

vi.mock('@/lib/supabase/require-role', () => ({
  requireRole: vi.fn(() => Promise.resolve(mockAuth)),
}));

const mockTransactions = [
  { id: 'tx-1', itemId: 'item-1', type: 'IN', quantity: 50, referenceType: 'PURCHASE', notes: 'Satın alma', createdAt: new Date('2025-01-10') },
  { id: 'tx-2', itemId: 'item-1', type: 'OUT', quantity: 2, referenceType: 'SERVICE', referenceId: 'ticket-1', notes: 'Servis', createdAt: new Date('2025-01-15') },
];

const mockRepo = {
  getTransactions: vi.fn(),
};

vi.mock('@/repositories/inventory.repository', () => ({
  InventoryRepository: class { constructor() { return mockRepo; } },
}));

describe('GET /api/inventory/:id/transactions', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns stock movement history for an item', async () => {
    mockRepo.getTransactions.mockResolvedValue(mockTransactions);
    const { GET } = await import('../inventory/[id]/transactions/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'item-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].type).toBe('IN');
    expect(body.data[1].type).toBe('OUT');
    expect(mockRepo.getTransactions).toHaveBeenCalledWith('item-1');
  });

  it('returns empty array for item with no transactions', async () => {
    mockRepo.getTransactions.mockResolvedValue([]);
    const { GET } = await import('../inventory/[id]/transactions/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'item-new' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
  });

  it('returns 404 when item not found', async () => {
    mockRepo.getTransactions.mockRejectedValue(new Error('NOT_FOUND'));
    const { GET } = await import('../inventory/[id]/transactions/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'nonexistent' }) });
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('returns 500 on repository error', async () => {
    mockRepo.getTransactions.mockRejectedValue(new Error('DB error'));
    const { GET } = await import('../inventory/[id]/transactions/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'item-1' }) });
    expect(res.status).toBe(500);
  });

  it('returns 401 when unauthenticated', async () => {
    const { requireRole } = await import('@/lib/supabase/require-role');
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false, userId: null, role: null, tenantId: null,
      error: { status: 401, code: 'UNAUTHORIZED', message: '' },
    });
    const { GET } = await import('../inventory/[id]/transactions/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'item-1' }) });
    expect(res.status).toBe(401);
  });
});
