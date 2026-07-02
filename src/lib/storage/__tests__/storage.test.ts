// ──────────────────────────────────────────────
// Water Purifier Service ERP — Storage Utility Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Service Report ───────────────────────────

describe('generateServiceReport', () => {
  beforeEach(() => {
    vi.resetModules();
    // Mock PDFDocument with a class-based mock for proper constructor behavior
    class MockPDFDocument {
      private listeners: Record<string, Array<(arg?: unknown) => void>> = {};
      fontSize = vi.fn().mockReturnThis();
      font = vi.fn().mockReturnThis();
      fillColor = vi.fn().mockReturnThis();
      strokeColor = vi.fn().mockReturnThis();
      lineWidth = vi.fn().mockReturnThis();
      text = vi.fn().mockReturnThis();
      moveDown = vi.fn().mockReturnThis();
      image = vi.fn().mockReturnThis();
      save = vi.fn().mockReturnThis();
      restore = vi.fn().mockReturnThis();
      rect = vi.fn().mockReturnThis();
      fill = vi.fn().mockReturnThis();
      stroke = vi.fn().mockReturnThis();
      moveTo = vi.fn().mockReturnThis();
      lineTo = vi.fn().mockReturnThis();
      dash = vi.fn().mockReturnThis();
      roundedRect = vi.fn().mockReturnThis();
      on = vi.fn((event: string, cb: (arg?: unknown) => void) => {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(cb);
        return this;
      });
      end = vi.fn(() => {
        process.nextTick(() => {
          this.listeners['data']?.forEach(cb => cb(Buffer.from('pdf-content')));
          this.listeners['end']?.forEach(cb => cb());
        });
      });
      page = { height: 841, width: 595.28, margins: { bottom: 50 } };
      y = 100;
      currentLineHeight = vi.fn(() => 12);
    }

    vi.doMock('pdfkit/js/pdfkit.standalone', () => ({
      default: MockPDFDocument,
      __esModule: true,
    }));
  });

  it('generates a PDF buffer from report data', async () => {
    const { generateServiceReport } = await import('../service-report');
    const buffer = await generateServiceReport({
      ticketNo: 'SRV-001',
      tenantName: 'Test Firma',
      customerName: 'Ahmet Yılmaz',
      deviceBrand: 'AquaPure',
      deviceModel: 'AP-5000',
      deviceSerial: 'SN-001',
      issueDesc: 'Su basıncı düşük',
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  it('includes filter changes when provided', async () => {
    const { generateServiceReport } = await import('../service-report');
    const buffer = await generateServiceReport({
      ticketNo: 'SRV-002',
      tenantName: 'Test',
      customerName: 'Ayşe',
      deviceBrand: 'Test',
      deviceModel: 'M1',
      deviceSerial: 'SN-002',
      issueDesc: 'Filtre değişimi',
      filterChanges: [
        { filterName: 'Sediment', stage: 'SEDIMENT', quantity: 1 },
        { filterName: 'Karbon Blok', stage: 'CARBON_BLOCK', quantity: 2 },
      ],
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  it('handles signature data URL', async () => {
    const { generateServiceReport } = await import('../service-report');
    const buffer = await generateServiceReport({
      ticketNo: 'SRV-003',
      tenantName: 'Test',
      customerName: 'Ali',
      deviceBrand: 'Test',
      deviceModel: 'M2',
      deviceSerial: 'SN-003',
      issueDesc: 'Test',
      signatureDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      signatureName: 'Ali Veli',
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });

  it('handles measurements', async () => {
    const { generateServiceReport } = await import('../service-report');
    const buffer = await generateServiceReport({
      ticketNo: 'SRV-004',
      tenantName: 'Test',
      customerName: 'Veli',
      deviceBrand: 'T',
      deviceModel: 'M',
      deviceSerial: 'SN-004',
      issueDesc: 'Test',
      tdsBefore: 250,
      tdsAfter: 45,
      pressureBefore: 3.5,
      pressureAfter: 4.2,
      leakCheck: false,
    });
    expect(Buffer.isBuffer(buffer)).toBe(true);
  });
});

// ─── Save Report to Storage ───────────────────

describe('saveReportToStorage', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('uploads PDF and returns public URL', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example.com/report.pdf' } });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        storage: {
          from: vi.fn(() => ({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
          })),
        },
      })),
    }));

    const { saveReportToStorage } = await import('../service-report');
    const result = await saveReportToStorage('tenant-1', 'SRV-001', Buffer.from('pdf-data'));
    expect(result.publicUrl).toBe('https://storage.example.com/report.pdf');
    expect(mockUpload).toHaveBeenCalled();
  });

  it('throws on upload error', async () => {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        storage: {
          from: vi.fn(() => ({
            upload: vi.fn().mockResolvedValue({ error: new Error('Storage full') }),
            getPublicUrl: vi.fn(),
          })),
        },
      })),
    }));

    const { saveReportToStorage } = await import('../service-report');
    await expect(saveReportToStorage('tenant-1', 'SRV-001', Buffer.from('test'))).rejects.toThrow('PDF yuklenemedi');
  });
});

// ─── Service Photo Storage ────────────────────

describe('ServicePhotoStorage', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getUploadUrl returns signed URL', async () => {
    const mockCreateSignedUploadUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://upload.example.com/photo' }, error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example.com/photo.jpg' } });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        storage: {
          from: vi.fn(() => ({
            createSignedUploadUrl: mockCreateSignedUploadUrl,
            getPublicUrl: mockGetPublicUrl,
            remove: vi.fn().mockResolvedValue({ error: null }),
            upload: vi.fn().mockResolvedValue({ error: null }),
          })),
        },
      })),
    }));

    const { ServicePhotoStorage } = await import('../service-photos');
    const storage = new ServicePhotoStorage();
    const result = await storage.getUploadUrl('tenant-1', 'ticket-1', 'photo.jpg', 'image/jpeg');
    expect(result.uploadUrl).toBe('https://upload.example.com/photo');
    expect(result.publicUrl).toBe('https://storage.example.com/photo.jpg');
  });

  it('deletePhoto calls remove on storage', async () => {
    const mockRemove = vi.fn().mockResolvedValue({ error: null });
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        storage: {
          from: vi.fn(() => ({ remove: mockRemove })),
        },
      })),
    }));

    const { ServicePhotoStorage } = await import('../service-photos');
    const storage = new ServicePhotoStorage();
    await storage.deletePhoto('tenants/tenant-1/services/ticket-1/photo.jpg');
    expect(mockRemove).toHaveBeenCalledWith(['tenants/tenant-1/services/ticket-1/photo.jpg']);
  });

  it('uploadBuffer uploads and returns public URL', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example.com/photo.jpg' } });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        storage: {
          from: vi.fn(() => ({
            upload: mockUpload,
            getPublicUrl: mockGetPublicUrl,
          })),
        },
      })),
    }));

    const { ServicePhotoStorage } = await import('../service-photos');
    const storage = new ServicePhotoStorage();
    const result = await storage.uploadBuffer('tenant-1', 'ticket-1', 'photo.jpg', Buffer.from('test'), 'image/jpeg');
    expect(result.publicUrl).toBe('https://storage.example.com/photo.jpg');
    expect(mockUpload).toHaveBeenCalled();
  });

  it('uploadBuffer throws on error', async () => {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        storage: {
          from: vi.fn(() => ({
            upload: vi.fn().mockResolvedValue({ error: new Error('Upload failed') }),
            getPublicUrl: vi.fn(),
          })),
        },
      })),
    }));

    const { ServicePhotoStorage } = await import('../service-photos');
    const storage = new ServicePhotoStorage();
    await expect(storage.uploadBuffer('t', 't', 'f.jpg', Buffer.from('test'), 'image/jpeg')).rejects.toThrow('Upload failed');
  });
});

// ─── Device Photo Storage ─────────────────────

describe('DevicePhotoStorage', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('getUploadUrl returns signed URL', async () => {
    const mockCreateSignedUploadUrl = vi.fn().mockResolvedValue({ data: { signedUrl: 'https://upload.example.com/device' }, error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example.com/device.jpg' } });

    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        storage: {
          from: vi.fn(() => ({
            createSignedUploadUrl: mockCreateSignedUploadUrl,
            getPublicUrl: mockGetPublicUrl,
            remove: vi.fn().mockResolvedValue({ error: null }),
          })),
        },
      })),
    }));

    const { DevicePhotoStorage } = await import('../device-photos');
    const storage = new DevicePhotoStorage();
    const result = await storage.getUploadUrl('tenant-1', 'dev-1', 'photo.jpg', 'image/jpeg');
    expect(result.uploadUrl).toBe('https://upload.example.com/device');
  });

  it('deletePhoto removes from storage', async () => {
    const mockRemove = vi.fn().mockResolvedValue({ error: null });
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        storage: {
          from: vi.fn(() => ({ remove: mockRemove })),
        },
      })),
    }));

    const { DevicePhotoStorage } = await import('../device-photos');
    const storage = new DevicePhotoStorage();
    await storage.deletePhoto('tenants/tenant-1/devices/dev-1/photo.jpg');
    expect(mockRemove).toHaveBeenCalledWith(['tenants/tenant-1/devices/dev-1/photo.jpg']);
  });

  it('deletePhoto throws on error', async () => {
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => ({
        storage: {
          from: vi.fn(() => ({
            remove: vi.fn().mockResolvedValue({ error: new Error('Not found') }),
          })),
        },
      })),
    }));

    const { DevicePhotoStorage } = await import('../device-photos');
    const storage = new DevicePhotoStorage();
    await expect(storage.deletePhoto('tenants/t/d/f.jpg')).rejects.toThrow('Storage delete');
  });
});
