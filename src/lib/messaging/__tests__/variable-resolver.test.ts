// ──────────────────────────────────────────────
// Water Purifier Service ERP — Variable Resolver Tests
// Multi-Tenant SaaS
//
// Tests: resolveVariables — DB-backed message template variable fill
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock Prisma ───────────────────────────────

const mockPrisma = {
  tenant: { findUnique: vi.fn() },
  customer: { findUnique: vi.fn() },
  device: { findUnique: vi.fn() },
  serviceTicket: { findUnique: vi.fn() },
  technician: { findUnique: vi.fn() },
};

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('resolveVariables', () => {
  let resolveVariables: typeof import('../variable-resolver').resolveVariables;

  beforeEach(async () => {
    vi.clearAllMocks();
    resolveVariables = (await import('../variable-resolver')).resolveVariables;
  });

  it('resolves tenant name as company_name', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ name: 'Test Firma' });

    const result = await resolveVariables({ tenantId: 'tenant-1' });

    expect(result.company_name).toBe('Test Firma');
    expect(mockPrisma.tenant.findUnique).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      select: { name: true },
    });
  });

  it('resolves customer name and phone', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ name: 'Test' });
    mockPrisma.customer.findUnique.mockResolvedValue({ name: 'Ahmet Yılmaz', phone: '+905551234567' });

    const result = await resolveVariables({ tenantId: 'tenant-1', customerId: 'cust-1' });

    expect(result.customer_name).toBe('Ahmet Yılmaz');
    expect(result.phone).toBe('+905551234567');
  });

  it('resolves device brand and device_model', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ name: 'Test' });
    mockPrisma.device.findUnique.mockResolvedValue({ brand: 'AquaPure', model: 'AP-5000' });

    const result = await resolveVariables({ tenantId: 'tenant-1', deviceId: 'dev-1' });

    expect(result.device_brand).toBe('AquaPure');
    expect(result.device_model).toContain('AquaPure');
    expect(result.device_model).toContain('AP-5000');
  });

  it('resolves next_service_date and technician from ticket', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ name: 'Test' });
    mockPrisma.serviceTicket.findUnique.mockResolvedValue({
      scheduledAt: new Date('2025-03-15T10:00:00Z'),
      technicianId: 'tech-1',
      technician: { name: 'Mehmet Usta' },
      customerId: null,
      deviceId: null,
    });

    const result = await resolveVariables({ tenantId: 'tenant-1', ticketId: 'ticket-1' });

    expect(result.next_service_date).toBeDefined();
    expect(result.next_service_date).toContain('2025');
    expect(result.technician).toBe('Mehmet Usta');
  });

  it('resolves technician when only technicianId is provided', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ name: 'Test' });
    mockPrisma.technician.findUnique.mockResolvedValue({ name: 'Ali Usta' });

    const result = await resolveVariables({ tenantId: 'tenant-1', technicianId: 'tech-2' });

    expect(result.technician).toBe('Ali Usta');
  });

  it('includes discount_code and coupon_code', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ name: 'Test' });

    const result = await resolveVariables({ tenantId: 'tenant-1', discountCode: 'YAZ2025' });

    expect(result.discount_code).toBe('YAZ2025');
    expect(result.coupon_code).toBe('YAZ2025');
  });

  it('includes survey_link and google_review_link', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ name: 'Test' });

    const result = await resolveVariables({
      tenantId: 'tenant-1',
      surveyLink: 'https://survey.example.com/abc',
      googleReviewLink: 'https://g.page/r/xyz',
    });

    expect(result.survey_link).toBe('https://survey.example.com/abc');
    expect(result.google_review_link).toBe('https://g.page/r/xyz');
  });

  it('pulls customer/device from ticket when not directly given', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ name: 'Test' });
    mockPrisma.serviceTicket.findUnique.mockResolvedValue({
      scheduledAt: null,
      technicianId: null,
      technician: null,
      customerId: 'cust-1',
      deviceId: 'dev-1',
    });
    mockPrisma.customer.findUnique.mockResolvedValue({ name: 'Ticket Customer', phone: '+905551111111' });
    mockPrisma.device.findUnique.mockResolvedValue({ brand: 'LG', model: 'PuriCare' });

    const result = await resolveVariables({ tenantId: 'tenant-1', ticketId: 'ticket-2' });

    expect(result.customer_name).toBe('Ticket Customer');
    expect(result.device_brand).toBe('LG');
    expect(result.device_model).toContain('PuriCare');
  });

  it('does not overwrite explicitly provided values with ticket data', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ name: 'Test' });
    mockPrisma.customer.findUnique.mockResolvedValue({ name: 'Explicit Customer', phone: '+905552222222' });
    mockPrisma.serviceTicket.findUnique.mockResolvedValue({
      scheduledAt: null,
      technicianId: null,
      technician: null,
      customerId: 'different-cust',
      deviceId: null,
    });

    const result = await resolveVariables({
      tenantId: 'tenant-1',
      customerId: 'cust-explicit',
      ticketId: 'ticket-3',
    });

    // Should use explicit customer, not the one from the ticket
    expect(result.customer_name).toBe('Explicit Customer');
  });

  it('returns empty object for non-existent tenant', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue(null);

    const result = await resolveVariables({ tenantId: 'nonexistent' });

    expect(result.company_name).toBeUndefined();
  });

  it('handles missing optional fields gracefully', async () => {
    mockPrisma.tenant.findUnique.mockResolvedValue({ name: 'Test' });

    const result = await resolveVariables({ tenantId: 'tenant-1' });

    expect(result.customer_name).toBeUndefined();
    expect(result.device_brand).toBeUndefined();
    expect(result.technician).toBeUndefined();
    expect(result.discount_code).toBeUndefined();
    expect(result.survey_link).toBeUndefined();
  });
});
