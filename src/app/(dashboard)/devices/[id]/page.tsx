'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { hasRole } from '@/lib/roles';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/lib/supabase/types';
import QRCode from 'qrcode';

interface Photo {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  isPrimary: boolean;
  createdAt: string;
}

interface TdsReading {
  id: string;
  tdsValue: number;
  inValue: number | null;
  outValue: number | null;
  notes: string | null;
  recordedAt: string;
  recordedBy: string | null;
}

interface TicketInfo {
  id: string;
  ticketNo: string;
  status: string;
  issueDesc: string;
  resolution: string | null;
  createdAt: string;
  completedAt: string | null;
  technician: { id: string; name: string } | null;
}

interface DeviceDetail {
  id: string;
  serialNo: string;
  brand: string;
  model: string;
  qrCode: string | null;
  status: string;
  warrantyStart: string | null;
  warrantyEnd: string | null;
  installDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  photos: Photo[];
  tdsReadings: TdsReading[];
  serviceTickets: TicketInfo[];
  _count: {
    tdsReadings: number;
    serviceTickets: number;
    photos: number;
  };
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PASSIVE: 'bg-gray-100 text-foreground',
  SCRAP: 'bg-red-100 text-red-800',
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktif',
  PASSIVE: 'Pasif',
  SCRAP: 'Hurda',
};

const TICKET_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const supabase = createClient();

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  // QR code image
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrShow, setQrShow] = useState(false);

  // Photo upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  // TDS reading state
  const [showTdsForm, setShowTdsForm] = useState(false);

  // Filter tracking state
  const [deviceFilters, setDeviceFilters] = useState<any[]>([]);
  const [filterCatalog, setFilterCatalog] = useState<any[]>([]);
  const [showFilterForm, setShowFilterForm] = useState(false);
  const [filterForm, setFilterForm] = useState({
    filterCatalogId: '',
    expectedLifespanDays: '365',
    installedAt: new Date().toISOString().slice(0, 10),
    notes: '',
  });
  const [bulkFilterForms, setBulkFilterForms] = useState<Array<{
    filterCatalogId: string;
    expectedLifespanDays: string;
    installedAt: string;
    notes: string;
  }>>([]);
  const [filterSubmitting, setFilterSubmitting] = useState(false);
  const [tdsValue, setTdsValue] = useState('');
  const [inValue, setInValue] = useState('');
  const [outValue, setOutValue] = useState('');
  const [tdsNotes, setTdsNotes] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((json) => setRole(json.data?.role ?? null))
      .catch(() => {});

    if (!params.id) return;

    Promise.all([
      fetch(`/api/devices/${params.id}`).then((r) => r.json()),
      fetch(`/api/devices/${params.id}/filters`).then((r) => r.json()),
      fetch('/api/filters?active=true').then((r) => r.json()),
    ])
      .then(([deviceJson, filtersJson, catalogJson]) => {
        if (deviceJson.error) {
          setError(deviceJson.error.message);
          return;
        }
        setDevice(deviceJson.data);
        setDeviceFilters(filtersJson.data ?? []);
        setFilterCatalog(catalogJson.data ?? []);
      })
      .catch(() => setError('Cihaz bilgileri yüklenemedi'))
      .finally(() => setLoading(false));
  }, [params.id]);

  // Generate QR code image when device has qrCode
  useEffect(() => {
    if (device?.qrCode) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const qrUrl = `${origin}/qr/${encodeURIComponent(device.qrCode)}`;
      QRCode.toDataURL(qrUrl, {
        width: 200,
        margin: 2,
        color: { dark: '#1e3a5f', light: '#ffffff' },
      })
        .then(setQrDataUrl)
        .catch(() => {});
    }
  }, [device?.qrCode]);

  const handleDelete = async () => {
    if (!device) return;
    if (!confirm(`"${device.brand} ${device.model}" cihazını silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/devices/${device.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error?.message || 'Silinemedi');
        return;
      }
      router.push('/devices');
    } catch {
      alert('Silinirken hata oluştu');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !device) return;

    setUploading(true);
    setUploadError(null);

    try {
      // 1. Register photo metadata via API
      const metaRes = await fetch(`/api/devices/${device.id}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          isPrimary: device.photos.length === 0,
        }),
      });

      if (!metaRes.ok) {
        const errJson = await metaRes.json();
        throw new Error(errJson.error?.message || 'Fotoğraf kaydedilemedi');
      }

      const { data } = await metaRes.json();
      const publicUrl = data.publicUrl;

      // 2. Upload file to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from('device-photos')
        .upload(data.photo.storagePath, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      // 3. Refresh device data to show new photo
      const res = await fetch(`/api/devices/${device.id}`);
      const json = await res.json();
      if (!json.error) setDevice(json.data);
    } catch (err: any) {
      setUploadError(err.message || 'Yükleme başarısız');
    } finally {
      setUploading(false);
    }
  };

  const toggleBulkFilter = (filterCatalogId: string) => {
    setBulkFilterForms((prev) => {
      if (prev.some((item) => item.filterCatalogId === filterCatalogId)) {
        return prev.filter((item) => item.filterCatalogId !== filterCatalogId);
      }
      return [...prev, {
        filterCatalogId,
        expectedLifespanDays: '365',
        installedAt: new Date().toISOString().slice(0, 10),
        notes: '',
      }];
    });
  };

  const updateBulkFilter = (filterCatalogId: string, field: 'expectedLifespanDays' | 'installedAt' | 'notes', value: string) => {
    setBulkFilterForms((prev) => prev.map((item) => (
      item.filterCatalogId === filterCatalogId ? { ...item, [field]: value } : item
    )));
  };

  const handleAddFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device) return;
    const filtersToSave = bulkFilterForms.length > 0 ? bulkFilterForms : (filterForm.filterCatalogId ? [filterForm] : []);
    if (filtersToSave.length === 0) {
      alert('En az bir filtre seçmelisiniz');
      return;
    }
    setFilterSubmitting(true);

    try {
      const res = await fetch(`/api/devices/${device.id}/filters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: filtersToSave.map((item) => ({
            filterCatalogId: item.filterCatalogId,
            installedAt: item.installedAt,
            expectedLifespanDays: Number(item.expectedLifespanDays),
            notes: item.notes || null,
          })),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        alert(errJson.error?.message || 'Filtre eklenemedi');
        return;
      }

      // Refresh filters
      const json = await (await fetch(`/api/devices/${device.id}/filters`)).json();
      setDeviceFilters(json.data ?? []);
      setShowFilterForm(false);
      setFilterForm({
        filterCatalogId: '',
        expectedLifespanDays: '365',
        installedAt: new Date().toISOString().slice(0, 10),
        notes: '',
      });
      setBulkFilterForms([]);
    } catch {
      alert('Filtre eklenirken hata oluştu');
    } finally {
      setFilterSubmitting(false);
    }
  };

  const handleRemoveFilter = async (filterId: string, name: string) => {
    if (!device) return;
    if (!confirm(`"${name}" filtresini kaldırmak istediğinize emin misiniz?`)) return;

    try {
      const res = await fetch(`/api/devices/${device.id}/filters/${filterId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errJson = await res.json();
        alert(errJson.error?.message || 'Silinemedi');
        return;
      }
      setDeviceFilters((prev) => prev.filter((f) => f.id !== filterId));
    } catch {
      alert('Silinirken hata oluştu');
    }
  };

  const handleAddTds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device) return;

    const val = Number(tdsValue);
    if (!val || val < 0 || val > 5000) {
      alert('TDS değeri 0-5000 arasında olmalıdır');
      return;
    }

    try {
      const res = await fetch(`/api/devices/${device.id}/tds`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tdsValue: val,
          inValue: inValue ? Number(inValue) : null,
          outValue: outValue ? Number(outValue) : null,
          notes: tdsNotes || null,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        alert(errJson.error?.message || 'TDS kaydedilemedi');
        return;
      }

      // Refresh
      const json = await (await fetch(`/api/devices/${device.id}`)).json();
      if (!json.error) setDevice(json.data);

      setTdsValue('');
      setInValue('');
      setOutValue('');
      setTdsNotes('');
      setShowTdsForm(false);
    } catch {
      alert('TDS kaydedilirken hata oluştu');
    }
  };

  const handlePhotoDelete = async (photoId: string) => {
    if (!device) return;
    if (!confirm('Bu fotoğrafı silmek istediğinize emin misiniz?')) return;

    setDeletingPhotoId(photoId);
    try {
      const res = await fetch(
        `/api/devices/${device.id}/photos?photoId=${encodeURIComponent(photoId)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const errJson = await res.json();
        alert(errJson.error?.message || 'Fotoğraf silinemedi');
        return;
      }
      // Refresh device data
      const json = await (await fetch(`/api/devices/${device.id}`)).json();
      if (!json.error) setDevice(json.data);
    } catch {
      alert('Fotoğraf silinirken hata oluştu');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const getPhotoUrl = (photo: Photo) => {
    const { data } = supabase.storage.from('device-photos').getPublicUrl(photo.storagePath);
    return data.publicUrl;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700">{error || 'Cihaz bulunamadı'}</p>
        <Link href="/devices" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Cihaz Listesine Dön
        </Link>
      </div>
    );
  }

  const canEdit = role && hasRole(role, 'technician');
  const warrantyExpired = device.warrantyEnd && new Date(device.warrantyEnd) < new Date();
  const warrantyActive = device.warrantyEnd && new Date(device.warrantyEnd) > new Date();

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link href="/devices" className="inline-flex items-center text-sm text-gray-500 hover:text-muted-foreground">
        ← Cihaz Listesi
      </Link>

      {/* Device Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              {device.brand} {device.model}
            </h1>
            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[device.status] ?? ''}`}>
              {STATUS_LABELS[device.status] ?? device.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Seri No: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{device.serialNo}</code>
          </p>
          {device.qrCode && (
            <p className="mt-1 text-sm text-gray-400">
              QR Kod: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono">{device.qrCode}</code>
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link
              href={`/devices/${device.id}/edit`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Düzenle
            </Link>
            <button
              onClick={handleDelete}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Sil
            </button>
          </div>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Customer */}
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Müşteri</h2>
          {device.customer ? (
            <div>
              <Link
                href={`/customers/${device.customer.id}`}
                className="font-medium text-blue-600 hover:text-blue-800"
              >
                {device.customer.name}
              </Link>
              {device.customer.phone && (
                <p className="mt-1 text-sm text-gray-500">{device.customer.phone}</p>
              )}
              {device.customer.email && (
                <p className="text-sm text-gray-400">{device.customer.email}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Müşteri atanmamış</p>
          )}
        </div>

        {/* Warranty */}
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Garanti</h2>
          {device.warrantyStart && (
            <p className="text-sm text-muted-foreground">
              Başlangıç: {new Date(device.warrantyStart).toLocaleDateString('tr-TR')}
            </p>
          )}
          {device.warrantyEnd && (
            <p className="mt-1 text-sm text-muted-foreground">
              Bitiş: {new Date(device.warrantyEnd).toLocaleDateString('tr-TR')}
            </p>
          )}
          <p className="mt-2 text-sm font-medium">
            {warrantyActive && <span className="text-green-600">Garanti devam ediyor</span>}
            {warrantyExpired && <span className="text-red-500">Garanti süresi doldu</span>}
            {!device.warrantyEnd && <span className="text-gray-400">Garanti bilgisi girilmemiş</span>}
          </p>
        </div>

        {/* Install */}
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Kurulum</h2>
          {device.installDate ? (
            <p className="text-sm text-muted-foreground">
              {new Date(device.installDate).toLocaleDateString('tr-TR')}
            </p>
          ) : (
            <p className="text-sm text-gray-400">Kurulum tarihi girilmemiş</p>
          )}
          <p className="mt-2 text-xs text-gray-400">
            Kayıt: {new Date(device.createdAt).toLocaleDateString('tr-TR')}
          </p>
        </div>
      </div>

      {/* QR Code */}
      {device.qrCode && (
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">QR Kod</h2>
              <p className="mt-1 text-xs text-gray-400">
                <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">{device.qrCode}</code>
              </p>
              <button
                type="button"
                onClick={() => setQrShow(!qrShow)}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-gray-50 transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                {qrShow ? 'Gizle' : 'QR Kodu Göster'}
              </button>
            </div>
            {qrShow && qrDataUrl && (
              <div className="flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`QR: ${device.qrCode}`}
                  className="h-32 w-32 rounded-lg border border-border"
                />
                <span className="mt-1 text-[10px] text-gray-400">Cihaz sorgulama</span>
                <div className="mt-2 flex gap-2">
                  <a
                    href={qrDataUrl}
                    download={`qr-${device.qrCode}.png`}
                    className="rounded bg-primary px-3 py-1 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
                  >
                    İndir
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      const w = window.open('', '_blank');
                      if (w) {
                        w.document.write(
                          `<img src="${qrDataUrl}" alt="QR" /><p style="text-align:center;font-family:sans-serif;margin-top:8px;font-size:12px">${device.qrCode}</p>`
                        );
                        w.document.title = `QR-${device.qrCode}`;
                        w.print();
                      }
                    }}
                    className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-gray-50 transition-colors"
                  >
                    Yazdır
                  </button>
                  <Link
                    href={`/devices/${device.id}/qr-sticker`}
                    className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-gray-50 transition-colors"
                  >
                    Sticker
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {device.notes && (
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Notlar</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{device.notes}</p>
        </div>
      )}

      {/* Photos */}
      <div className="rounded-lg border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            Fotoğraflar ({device.photos.length})
          </h2>
          {canEdit && (
            <label className="cursor-pointer rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
              {uploading ? 'Yükleniyor...' : '+ Fotoğraf Ekle'}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>
        {uploadError && (
          <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {uploadError}
          </div>
        )}
        {device.photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 md:grid-cols-4">
            {device.photos.map((photo) => (
              <div key={photo.id} className="group relative h-32">
                <Image
                  src={getPhotoUrl(photo)}
                  alt={photo.fileName}
                  fill
                  sizes="(min-width: 768px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="rounded-lg object-cover shadow-sm"
                  unoptimized
                />
                {photo.isPrimary && (
                  <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-xs text-white">
                    Birincil
                  </span>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handlePhotoDelete(photo.id)}
                    disabled={deletingPhotoId === photo.id}
                    className="absolute right-1 top-1 rounded bg-red-600 px-1.5 py-0.5 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 disabled:opacity-50"
                  >
                    {deletingPhotoId === photo.id ? '...' : 'Sil'}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            Henüz fotoğraf eklenmemiş
          </div>
        )}
      </div>

      {/* TDS Readings */}
      <div className="rounded-lg border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            TDS Ölçümleri ({device._count.tdsReadings})
          </h2>
          {canEdit && (
            <button
              onClick={() => setShowTdsForm(!showTdsForm)}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              {showTdsForm ? 'İptal' : '+ TDS Ekle'}
            </button>
          )}
        </div>

        {showTdsForm && (
          <form onSubmit={handleAddTds} className="border-b border-border px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">TDS Değeri *</label>
                <input
                  type="number"
                  value={tdsValue}
                  onChange={(e) => setTdsValue(e.target.value)}
                  required
                  min={0}
                  max={5000}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="0-5000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Giriş (opsiyonel)</label>
                <input
                  type="number"
                  value={inValue}
                  onChange={(e) => setInValue(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Çıkış (opsiyonel)</label>
                <input
                  type="number"
                  value={outValue}
                  onChange={(e) => setOutValue(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Not</label>
                <input
                  type="text"
                  value={tdsNotes}
                  onChange={(e) => setTdsNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="İsteğe bağlı"
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              Kaydet
            </button>
          </form>
        )}

        {device.tdsReadings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Tarih</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">TDS</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Giriş</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">Çıkış</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Not</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {device.tdsReadings.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-600">
                      {new Date(r.recordedAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-3 text-right font-mono font-medium text-foreground">
                      {r.tdsValue}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-gray-600">
                      {r.inValue ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-gray-600">
                      {r.outValue ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {r.notes ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            Henüz TDS ölçümü yapılmamış
          </div>
        )}
      </div>

      {/* Filter Tracking */}
      <div className="rounded-lg border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            Filtre Takibi ({deviceFilters.length})
          </h2>
          {canEdit && (
            <button
              onClick={() => setShowFilterForm(!showFilterForm)}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              {showFilterForm ? 'İptal' : '+ Filtre Ekle'}
            </button>
          )}
        </div>

        {showFilterForm && (
          <form onSubmit={handleAddFilter} className="border-b border-border px-6 py-4">
            <div className="space-y-3">
              {filterCatalog.map((fc: any) => {
                const selected = bulkFilterForms.find((item) => item.filterCatalogId === fc.id);
                return (
                  <div key={fc.id} className={`rounded-lg border p-3 transition-colors ${selected ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'}`}>
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!selected}
                        onChange={() => toggleBulkFilter(fc.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      <span className="flex-1 text-sm font-medium text-foreground">{fc.name}</span>
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">{fc.stage}</code>
                    </label>
                    {selected && (
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Takılma Tarihi *</label>
                          <input
                            type="date"
                            value={selected.installedAt}
                            onChange={(e) => updateBulkFilter(fc.id, 'installedAt', e.target.value)}
                            required
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Beklenen Ömür (gün) *</label>
                          <input
                            type="number"
                            value={selected.expectedLifespanDays}
                            onChange={(e) => updateBulkFilter(fc.id, 'expectedLifespanDays', e.target.value)}
                            required
                            min={1}
                            max={9999}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Not</label>
                          <input
                            type="text"
                            value={selected.notes}
                            onChange={(e) => updateBulkFilter(fc.id, 'notes', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                            placeholder="İsteğe bağlı"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {filterCatalog.length === 0 && (
                <p className="text-sm text-gray-400">Filtre kataloğu bulunamadı.</p>
              )}
            </div>
            <button
              type="submit"
              disabled={filterSubmitting || bulkFilterForms.length === 0}
              className="mt-3 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {filterSubmitting ? 'Kaydediliyor...' : `${bulkFilterForms.length || 0} Filtreyi Kaydet`}
            </button>
          </form>
        )}

        {deviceFilters.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Filtre</th>
                  <th className="px-6 py-3 text-center font-medium text-gray-500">Stage</th>
                  <th className="px-6 py-3 text-center font-medium text-gray-500">Takılma</th>
                  <th className="px-6 py-3 text-center font-medium text-gray-500">Ömür (gün)</th>
                  <th className="px-6 py-3 text-center font-medium text-gray-500">Kalan</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Sonraki Bakım</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-500">Not</th>
                  {canEdit && <th className="px-6 py-3 text-right font-medium text-gray-500">İşlem</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deviceFilters.map((f: any) => {
                  const isOverdue = f.remainingDays === 0;
                  const isWarning = f.remainingPercent <= 20 && !isOverdue;
                  const rowBg = isOverdue ? 'bg-red-50' : isWarning ? 'bg-yellow-50' : '';
                  return (
                    <tr key={f.id} className={`hover:bg-gray-50 ${rowBg}`}>
                      <td className="px-6 py-3 font-medium text-foreground">
                        {f.filterCatalog.name}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                          {f.filterCatalog.stage}
                        </code>
                      </td>
                      <td className="px-6 py-3 text-center text-gray-600">
                        {new Date(f.installedAt).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-3 text-center font-mono text-muted-foreground">
                        {f.expectedLifespanDays}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`font-mono text-sm font-semibold ${
                            isOverdue ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {isOverdue ? 'SÜRESİ DOLDU' : `${f.remainingDays} gün`}
                          </span>
                          <div className="h-1.5 w-full max-w-[80px] rounded-full bg-gray-200">
                            <div
                              className={`h-1.5 rounded-full ${
                                isOverdue ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, f.remainingPercent)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400">%{f.remainingPercent}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-sm">
                        <span className={`font-medium ${
                          isOverdue ? 'text-red-600' : 'text-muted-foreground'
                        }`}>
                          {new Date(f.nextMaintenanceAt).toLocaleDateString('tr-TR')}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {f.notes ?? '—'}
                      </td>
                      {canEdit && (
                        <td className="px-6 py-3 text-right">
                          <button
                            onClick={() => handleRemoveFilter(f.id, f.filterCatalog.name)}
                            className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Kaldır
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            Bu cihaza ait filtre takip kaydı bulunmuyor
          </div>
        )}
      </div>

      {/* Service History */}
      <div className="rounded-lg border border-border bg-white shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            Servis Geçmişi ({device._count.serviceTickets})
          </h2>
        </div>
        {device.serviceTickets.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {device.serviceTickets.map((t) => (
              <div key={t.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-medium text-foreground">{t.ticketNo}</span>
                    <p className="mt-0.5 text-sm text-gray-600">{t.issueDesc}</p>
                    {t.technician && (
                      <p className="text-xs text-gray-400">Teknisyen: {t.technician.name}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${TICKET_STATUS_COLORS[t.status] ?? ''}`}>
                      {t.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
                {t.resolution && (
                  <p className="mt-2 rounded bg-gray-50 p-2 text-xs text-gray-600">
                    {t.resolution}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            Bu cihaza ait servis kaydı bulunmuyor
          </div>
        )}
      </div>
    </div>
  );
}
