// ──────────────────────────────────────────────
// Water Purifier Service ERP — Device & Service Photo API Tests
// Multi-Tenant SaaS
//
// Covers:
//   GET    /api/devices/:id/photos
//   POST   /api/devices/:id/photos
//   DELETE /api/devices/:id/photos
//   POST   /api/service-tickets/:id/photos
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAuth = {
  ok: true, userId: 'user-1', role: 'technician' as const, tenantId: 'tenant-1', error: null as any,
};
vi.mock('@/lib/supabase/require-role', () => ({ requireRole: vi.fn(() => Promise.resolve(mockAuth)) }));

// ─── Device Photos ─────────────────────────────

const mockPhotos = [
  { id: 'ph-1', deviceId: 'dev-1', storagePath: 'tenant-1/devices/dev-1/panel.jpg', fileName: 'panel.jpg', mimeType: 'image/jpeg', isPrimary: true },
  { id: 'ph-2', deviceId: 'dev-1', storagePath: 'tenant-1/devices/dev-1/filter.jpg', fileName: 'filter.jpg', mimeType: 'image/jpeg', isPrimary: false },
];
const mockDeviceRepo = {
  getPhotos: vi.fn(),
  getPhoto: vi.fn(),
  addPhoto: vi.fn(),
  deletePhoto: vi.fn(),
  deleteAllPhotos: vi.fn(),
};
vi.mock('@/repositories/device.repository', () => ({ DeviceRepository: class { constructor() { return mockDeviceRepo; } } }));
vi.mock('@/lib/storage/device-photos', () => ({ devicePhotoStorage: { deletePhoto: vi.fn().mockResolvedValue(undefined) } }));

function mockReq(body: Record<string, unknown> = {}): any {
  return { json: vi.fn().mockResolvedValue(body), nextUrl: new URL('http://localhost:3000/api/devices/dev-1/photos') };
}

describe('GET /api/devices/[id]/photos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns photos for a device', async () => {
    mockDeviceRepo.getPhotos.mockResolvedValue(mockPhotos);
    const { GET } = await import('../devices/[id]/photos/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'dev-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].fileName).toBe('panel.jpg');
  });

  it('returns empty array when device has no photos', async () => {
    mockDeviceRepo.getPhotos.mockResolvedValue([]);
    const { GET } = await import('../devices/[id]/photos/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'dev-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toHaveLength(0);
  });

  it('returns 404 when device not found', async () => {
    mockDeviceRepo.getPhotos.mockRejectedValue(new Error('NOT_FOUND'));
    const { GET } = await import('../devices/[id]/photos/route');
    const res = await GET(null as any, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/devices/[id]/photos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('adds a photo to a device', async () => {
    mockDeviceRepo.addPhoto.mockResolvedValue(mockPhotos[0]);
    const { POST } = await import('../devices/[id]/photos/route');
    const req = mockReq({ fileName: 'panel.jpg', contentType: 'image/jpeg', isPrimary: true });
    const res = await POST(req, { params: Promise.resolve({ id: 'dev-1' }) });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.photo.fileName).toBe('panel.jpg');
    expect(body.data.publicUrl).toContain('storage/v1/object/public/device-photos/');
    expect(mockDeviceRepo.addPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: 'dev-1', fileName: 'panel.jpg', isPrimary: true }),
    );
  });

  it('returns 400 when fileName missing', async () => {
    const { POST } = await import('../devices/[id]/photos/route');
    const req = mockReq({ contentType: 'image/jpeg' });
    const res = await POST(req, { params: Promise.resolve({ id: 'dev-1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 400 when contentType missing', async () => {
    const { POST } = await import('../devices/[id]/photos/route');
    const req = mockReq({ fileName: 'photo.jpg' });
    const res = await POST(req, { params: Promise.resolve({ id: 'dev-1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid JSON', async () => {
    const { POST } = await import('../devices/[id]/photos/route');
    const req = { json: vi.fn().mockRejectedValue(new Error('Invalid JSON')) };
    const res = await POST(req as any, { params: Promise.resolve({ id: 'dev-1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 when device not found', async () => {
    mockDeviceRepo.addPhoto.mockRejectedValue(new Error('NOT_FOUND'));
    const { POST } = await import('../devices/[id]/photos/route');
    const req = mockReq({ fileName: 'photo.jpg', contentType: 'image/jpeg' });
    const res = await POST(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/devices/[id]/photos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('deletes a single photo by photoId param', async () => {
    mockDeviceRepo.getPhoto.mockResolvedValue(mockPhotos[0]);
    mockDeviceRepo.deletePhoto.mockResolvedValue(undefined);
    const { DELETE } = await import('../devices/[id]/photos/route');
    const req = { nextUrl: new URL('http://localhost:3000/api/devices/dev-1/photos?photoId=ph-1') } as any;
    const res = await DELETE(req, { params: Promise.resolve({ id: 'dev-1' }) });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.ok).toBe(true);
    expect(mockDeviceRepo.deletePhoto).toHaveBeenCalledWith('ph-1');
  });

  it('deletes all photos when no photoId param', async () => {
    mockDeviceRepo.getPhotos.mockResolvedValue(mockPhotos);
    mockDeviceRepo.deleteAllPhotos.mockResolvedValue(undefined);
    const { DELETE } = await import('../devices/[id]/photos/route');
    const req = { nextUrl: new URL('http://localhost:3000/api/devices/dev-1/photos') } as any;
    const res = await DELETE(req, { params: Promise.resolve({ id: 'dev-1' }) });
    expect(res.status).toBe(200);
    expect(mockDeviceRepo.deleteAllPhotos).toHaveBeenCalledWith('dev-1');
  });

  it('returns 401 when unauthenticated', async () => {
    const { requireRole } = await import('@/lib/supabase/require-role');
    vi.mocked(requireRole).mockResolvedValueOnce({
      ok: false, userId: null, role: null, tenantId: null,
      error: { status: 401, code: 'UNAUTHORIZED', message: '' },
    });
    const { DELETE } = await import('../devices/[id]/photos/route');
    const req = { nextUrl: new URL('http://localhost:3000/api/devices/dev-1/photos') } as any;
    const res = await DELETE(req, { params: Promise.resolve({ id: 'dev-1' }) });
    expect(res.status).toBe(401);
  });
});

// ─── Service Ticket Photos ─────────────────────

// Mock server supabase for service ticket photos route
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(() => ({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'user-1', tenant_id: 'tenant-1', role: 'technician', is_active: true },
            error: null,
          }),
        })),
      })),
    })),
  })),
}));

// Mock storage for service photos
vi.mock('@/lib/storage/service-photos', () => ({
  ServicePhotoStorage: class {
    getUploadUrl = vi.fn().mockResolvedValue({
      uploadUrl: 'https://storage.example.com/upload-url',
      publicUrl: 'https://storage.example.com/public/photo.jpg',
      storagePath: 'tenant-1/service-photos/ticket-1/photo.jpg',
    });
  },
}));

const mockTicketRepo = {
  addPhoto: vi.fn(),
};
vi.mock('@/repositories/service-ticket.repository', () => ({
  ServiceTicketRepository: class { constructor() { return mockTicketRepo; } },
}));

describe('POST /api/service-tickets/:id/photos', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('uploads a photo and returns signed URL', async () => {
    mockTicketRepo.addPhoto.mockResolvedValue({
      id: 'sph-1', ticketId: 'ticket-1', storagePath: 'tenant-1/service-photos/ticket-1/photo.jpg',
    });
    const { POST } = await import('../service-tickets/[id]/photos/route');
    const req = { json: vi.fn().mockResolvedValue({ fileName: 'photo.jpg', contentType: 'image/jpeg' }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: 'ticket-1' }) });
    const body = await res.json();
    expect(res.status).toBe(201);
    expect(body.data.uploadUrl).toBe('https://storage.example.com/upload-url');
    expect(body.data.publicUrl).toBe('https://storage.example.com/public/photo.jpg');
    expect(mockTicketRepo.addPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ ticketId: 'ticket-1', fileName: 'photo.jpg' }),
    );
  });

  it('returns 400 when fileName missing', async () => {
    const { POST } = await import('../service-tickets/[id]/photos/route');
    const req = { json: vi.fn().mockResolvedValue({ contentType: 'image/jpeg' }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: 'ticket-1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 400 when contentType missing', async () => {
    const { POST } = await import('../service-tickets/[id]/photos/route');
    const req = { json: vi.fn().mockResolvedValue({ fileName: 'photo.jpg' }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: 'ticket-1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid JSON', async () => {
    const { POST } = await import('../service-tickets/[id]/photos/route');
    const req = { json: vi.fn().mockRejectedValue(new Error('Invalid JSON')) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: 'ticket-1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 404 when ticket not found', async () => {
    mockTicketRepo.addPhoto.mockRejectedValue(new Error('NOT_FOUND'));
    const { POST } = await import('../service-tickets/[id]/photos/route');
    const req = { json: vi.fn().mockResolvedValue({ fileName: 'photo.jpg', contentType: 'image/jpeg' }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: 'nonexistent' }) });
    expect(res.status).toBe(404);
  });

  it('returns 404 on storage NOT_FOUND error', async () => {
    // Re-mock storage to throw NOT_FOUND
    vi.doMock('@/lib/storage/service-photos', () => ({
      ServicePhotoStorage: class {
        getUploadUrl = vi.fn().mockRejectedValue(new Error('NOT_FOUND'));
      },
    }));

    const { POST } = await import('../service-tickets/[id]/photos/route');
    const req = { json: vi.fn().mockResolvedValue({ fileName: 'photo.jpg', contentType: 'image/jpeg' }) } as any;
    const res = await POST(req, { params: Promise.resolve({ id: 'ticket-1' }) });
    expect(res.status).toBe(404);
  });
});
