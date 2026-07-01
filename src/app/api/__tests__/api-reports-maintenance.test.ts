// ──────────────────────────────────────────────
// Water Purifier Service ERP — Reports & Maintenance API Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = { ok: true, userId: 'user-1', role: 'viewer' as const, tenantId: 'tenant-1', error: null as any };
vi.mock('@/lib/supabase/require-role', () => ({ requireRole: vi.fn(() => Promise.resolve(mockAuth)) }));

const mockReportRepo = { getDashboardStats: vi.fn(), getTechnicianPerformance: vi.fn(), getMostChangedFilters: vi.fn(), getMonthlyMaintenanceForecast: vi.fn(), getSatisfactionSummary: vi.fn() };
vi.mock('@/repositories/report.repository', () => ({ ReportRepository: class { constructor() { return mockReportRepo; } } }));

const mockMaintRepo = { getDashboardMaintenanceCards: vi.fn(), getDashboardReminders: vi.fn() };
vi.mock('@/repositories/maintenance.repository', () => ({ MaintenanceRepository: class { constructor() { return mockMaintRepo; } } }));

const mockTicketQueueRepo = { getOverdueQueue: vi.fn() };
vi.mock('@/repositories/service-ticket.repository', () => ({ ServiceTicketRepository: class { constructor() { return mockTicketQueueRepo; } } }));

function mockReq(url = 'http://localhost:3000/api/reports'): any {
  return { nextUrl: new URL(url), headers: new Headers() };
}

describe('GET /api/reports', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns dashboard stats by default', async () => {
    mockReportRepo.getDashboardStats.mockResolvedValue({ todayServiceCount: 5 });
    const { GET } = await import('../reports/route');
    const res = await GET(mockReq());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.todayServiceCount).toBe(5);
  });
  it('returns technician performance', async () => {
    mockReportRepo.getTechnicianPerformance.mockResolvedValue([{ name: 'Mehmet', completedCount: 10 }]);
    const { GET } = await import('../reports/route');
    const res = await GET(mockReq('http://localhost:3000/api/reports?type=technician'));
    expect(res.status).toBe(200);
  });
  it('returns most changed filters', async () => {
    mockReportRepo.getMostChangedFilters.mockResolvedValue([{ name: 'Sediment', count: 20 }]);
    const { GET } = await import('../reports/route');
    const res = await GET(mockReq('http://localhost:3000/api/reports?type=filters&limit=5'));
    expect(res.status).toBe(200);
    expect(mockReportRepo.getMostChangedFilters).toHaveBeenCalledWith(5);
  });
  it('returns maintenance forecast', async () => {
    mockReportRepo.getMonthlyMaintenanceForecast.mockResolvedValue([{ month: '2025-01', count: 3 }]);
    const { GET } = await import('../reports/route');
    const res = await GET(mockReq('http://localhost:3000/api/reports?type=forecast'));
    expect(res.status).toBe(200);
  });
  it('returns satisfaction summary', async () => {
    mockReportRepo.getSatisfactionSummary.mockResolvedValue({ averageScore: 4.5 });
    const { GET } = await import('../reports/route');
    const res = await GET(mockReq('http://localhost:3000/api/reports?type=satisfaction'));
    expect(res.status).toBe(200);
  });
  it('returns 400 for invalid type', async () => {
    const { GET } = await import('../reports/route');
    const res = await GET(mockReq('http://localhost:3000/api/reports?type=invalid'));
    expect(res.status).toBe(400);
  });
  it('returns 401 when unauthenticated', async () => {
    const { requireRole } = await import('@/lib/supabase/require-role');
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, userId: null, role: null, tenantId: null, error: { status: 401, code: 'UNAUTHORIZED', message: '' } });
    const { GET } = await import('../reports/route');
    const res = await GET(mockReq());
    expect(res.status).toBe(401);
  });
});

describe('GET /api/maintenance/reminders', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns reminder dashboard data', async () => {
    mockMaintRepo.getDashboardMaintenanceCards.mockResolvedValue({ upcoming15Count: 5, upcoming7Count: 2, overdueCount: 1, upcoming15: [], upcoming7: [], overdue: [] });
    mockMaintRepo.getDashboardReminders.mockResolvedValue([]);
    const { GET } = await import('../maintenance/reminders/route');
    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.upcoming15Count).toBe(5);
  });
  it('handles error gracefully', async () => {
    mockMaintRepo.getDashboardMaintenanceCards.mockRejectedValue(new Error('DB error'));
    const { GET } = await import('../maintenance/reminders/route');
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

describe('GET /api/maintenance/overdue-queue', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  it('returns overdue queue', async () => {
    mockTicketQueueRepo.getOverdueQueue.mockResolvedValue([{ id: 'ticket-1', daysOverdue: 5 }]);
    const { GET } = await import('../maintenance/overdue-queue/route');
    const res = await GET();
    expect(res.status).toBe(200);
  });
});
