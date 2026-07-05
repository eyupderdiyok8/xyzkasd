'use client';
import { useState, useEffect, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import CustomerSelect from '@/components/CustomerSelect';
import TenantSelect from '@/components/TenantSelect';

const supabase = createClient();

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  unitPrice: number;
}

export default function NewDeviceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState('');

  const [f, setF] = useState({
    serialNo: '',
    brand: '',
    model: '',
    customerId: '',
    warrantyStart: '',
    warrantyEnd: '',
    installDate: '',
    notes: '',
    status: 'ACTIVE',
  });
  const [saleType, setSaleType] = useState<'existing' | 'sold'>('existing');
  const [sale, setSale] = useState({
    inventoryItemId: '',
    amount: '',
    paymentMethod: 'CASH',
    installmentCount: '',
    dueDate: '',
    notes: '',
  });
  const u = (field: string, v: string) => setF(p => ({ ...p, [field]: v }));
  const su = (field: string, v: string) => setSale(p => ({ ...p, [field]: v }));
  const cls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';

  // Read customerId from URL query params (e.g. /devices/new?customerId=xxx)
  useEffect(() => {
    const cid = searchParams?.get('customerId');
    if (cid) u('customerId', cid);
  }, [searchParams]);

  // Detect super admin and load tenant list
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tenantId, setTenantId] = useState('');
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(j => { if (j.data?.role === 'super_admin') setIsSuperAdmin(true); })
      .catch(() => {});

    fetch('/api/inventory?pageSize=100')
      .then(r => r.json())
      .then(j => setInventoryItems(j.data ?? []))
      .catch(() => {});
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (isSuperAdmin && !tenantId) { setError('Süper admin olarak bir firma seçmelisiniz'); return; }
    if (saleType === 'sold' && !f.customerId) { setError('Cihaz satışı için müşteri seçmelisiniz'); return; }
    if (saleType === 'sold' && !sale.inventoryItemId) { setError('Cihaz satışı için envanter ürünü seçmelisiniz'); return; }
    setSending(true);
    setError('');

    // Create device
    const res = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...f,
        customerId: f.customerId || undefined,
        warrantyStart: f.warrantyStart || null,
        warrantyEnd: f.warrantyEnd || null,
        installDate: f.installDate || null,
        notes: f.notes || null,
        tenantId: isSuperAdmin ? tenantId || undefined : undefined,
        sale: saleType === 'sold' ? {
          inventoryItemId: sale.inventoryItemId,
          amount: sale.amount ? Number(sale.amount) : 0,
          paymentMethod: sale.paymentMethod,
          installmentCount: sale.installmentCount ? Number(sale.installmentCount) : null,
          dueDate: sale.dueDate || null,
          notes: sale.notes || null,
        } : null,
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error?.message ?? 'Hata');
      setSending(false);
      return;
    }

    const deviceId = j.data.id;
    setCreatedId(deviceId);
    if (Array.isArray(j.warnings) && j.warnings.length > 0) {
      alert(j.warnings.map((w: { message?: string }) => w.message).filter(Boolean).join('\n'));
    }

    // Upload photos if selected
    if (photos.length > 0) {
      setUploadProgress('Fotoğraflar yükleniyor...');
      setUploading(true);
      try {
        for (let i = 0; i < photos.length; i++) {
          const file = photos[i];
          setUploadProgress(`Fotoğraf ${i + 1}/${photos.length} yükleniyor...`);

          // Register photo metadata
          const metaRes = await fetch(`/api/devices/${deviceId}/photos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              contentType: file.type,
              isPrimary: i === 0,
            }),
          });
          if (!metaRes.ok) throw new Error('Fotoğraf kaydı başarısız');
          const { data } = await metaRes.json();

          // Upload to Supabase Storage
          const { error: uploadErr } = await supabase.storage
            .from('device-photos')
            .upload(data.photo.storagePath, file, {
              contentType: file.type,
              upsert: true,
            });
          if (uploadErr) throw uploadErr;
        }
      } catch (err: any) {
        setError(`Cihaz kaydedildi ancak fotoğraflar yüklenemedi: ${err.message}`);
      } finally {
        setUploading(false);
        setUploadProgress('');
      }
    }

    // Navigate to device detail
    router.push('/devices/' + deviceId);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Super admin tenant selector */}
      {isSuperAdmin && (
        <section className="rounded-lg border border-primary/30 bg-primary/5 p-6">
          <h2 className="mb-1 text-lg font-semibold text-primary">Firma Seçimi</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Süper admin olarak cihazı hangi firmaya eklemek istediğinizi seçin.
          </p>
          <TenantSelect value={tenantId} onChange={setTenantId} />
        </section>
      )}

      {/* Temel Bilgiler */}
      <section className="rounded-lg border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Temel Bilgiler</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Seri No <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={f.serialNo}
              onChange={e => u('serialNo', e.target.value)}
              className={cls}
              placeholder="SN-2024-0001"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Marka <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={f.brand}
              onChange={e => u('brand', e.target.value)}
              className={cls}
              placeholder="AquaPure"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Model <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={f.model}
              onChange={e => u('model', e.target.value)}
              className={cls}
              placeholder="AP-5000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Durum</label>
            <select value={f.status} onChange={e => u('status', e.target.value)} className={cls}>
              <option value="ACTIVE">Aktif</option>
              <option value="PASSIVE">Pasif</option>
              <option value="SCRAP">Hurda</option>
            </select>
          </div>
        </div>
      </section>

      {/* Müşteri */}
      <section className="rounded-lg border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Müşteri</h2>
        <CustomerSelect
          value={f.customerId}
          onChange={(v) => u('customerId', v)}
        />
        {!f.customerId && (
          <p className="mt-1.5 text-xs text-gray-400">
            Opsiyonel — cihazı bir müşteriye atayın
          </p>
        )}
      </section>

      {/* Satış ve Stok */}
      <section className="rounded-lg border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Satış ve Stok</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={`cursor-pointer rounded-lg border p-4 transition-colors ${saleType === 'existing' ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'}`}>
            <input
              type="radio"
              name="saleType"
              value="existing"
              checked={saleType === 'existing'}
              onChange={() => setSaleType('existing')}
              className="mr-2"
            />
            <span className="text-sm font-semibold">Müşterinin mevcut cihazı</span>
            <p className="mt-1 text-xs text-gray-500">Sadece cihaz kaydı oluşur; stok ve gelir işlemi yapılmaz.</p>
          </label>
          <label className={`cursor-pointer rounded-lg border p-4 transition-colors ${saleType === 'sold' ? 'border-primary bg-primary/5' : 'border-gray-200 bg-white'}`}>
            <input
              type="radio"
              name="saleType"
              value="sold"
              checked={saleType === 'sold'}
              onChange={() => setSaleType('sold')}
              className="mr-2"
            />
            <span className="text-sm font-semibold">Cihaz bizden satıldı</span>
            <p className="mt-1 text-xs text-gray-500">Stoktan düşer, satış servis kaydı ve tahsilat oluşur.</p>
          </label>
        </div>

        {saleType === 'sold' && (
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Envanter Ürünü <span className="text-red-500">*</span>
              </label>
              <select
                value={sale.inventoryItemId}
                onChange={(e) => {
                  const selected = inventoryItems.find((item) => item.id === e.target.value);
                  su('inventoryItemId', e.target.value);
                  if (selected && !sale.amount) su('amount', String(selected.unitPrice || ''));
                }}
                required={saleType === 'sold'}
                className={cls}
              >
                <option value="">Seçiniz...</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}{item.sku ? ` (${item.sku})` : ''} - Stok: {item.quantity}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Satış Tutarı</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={sale.amount}
                onChange={(e) => su('amount', e.target.value)}
                className={cls}
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Ödeme Yöntemi</label>
              <select value={sale.paymentMethod} onChange={(e) => su('paymentMethod', e.target.value)} className={cls}>
                <option value="CASH">Nakit</option>
                <option value="CREDIT_CARD">Kredi Kartı</option>
                <option value="BANK_TRANSFER">Banka Transferi</option>
                <option value="PROMISSORY_NOTE">Senet</option>
                <option value="DEFERRED">İleri Tarihli</option>
              </select>
            </div>
            {sale.paymentMethod === 'DEFERRED' && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Vade Tarihi</label>
                <input type="date" value={sale.dueDate} onChange={(e) => su('dueDate', e.target.value)} className={cls} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Taksit Sayısı</label>
              <input type="number" min="1" value={sale.installmentCount} onChange={(e) => su('installmentCount', e.target.value)} className={cls} placeholder="Opsiyonel" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Satış Notu</label>
              <input type="text" value={sale.notes} onChange={(e) => su('notes', e.target.value)} className={cls} placeholder="Opsiyonel" />
            </div>
          </div>
        )}
      </section>

      {/* Garanti */}
      <section className="rounded-lg border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Garanti</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Başlangıç</label>
            <input
              type="date"
              value={f.warrantyStart}
              onChange={e => u('warrantyStart', e.target.value)}
              className={cls}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">Bitiş</label>
            <input
              type="date"
              value={f.warrantyEnd}
              onChange={e => u('warrantyEnd', e.target.value)}
              className={cls}
            />
          </div>
        </div>
      </section>

      {/* Kurulum ve Fotoğraflar */}
      <section className="rounded-lg border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Kurulum</h2>
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">Kurulum Tarihi</label>
          <input
            type="date"
            value={f.installDate}
            onChange={e => u('installDate', e.target.value)}
            className={cls}
          />
        </div>
        <div className="mt-6">
          <label className="block text-sm font-medium text-muted-foreground mb-1">Kurulum Fotoğrafları</label>
          <div className="mt-1 flex items-center gap-4">
            <label className="cursor-pointer rounded-lg border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 transition-colors">
              {photos.length > 0 ? `${photos.length} dosya seçili` : 'Fotoğraf Seç'}
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setPhotos(prev => [...prev, ...files]);
                }}
                className="hidden"
              />
            </label>
            {photos.length > 0 && (
              <button
                type="button"
                onClick={() => setPhotos([])}
                className="text-sm text-red-600 hover:text-red-800 transition-colors"
              >
                Temizle
              </button>
            )}
          </div>
          {photos.length > 0 && (
            <ul className="mt-3 space-y-1">
              {photos.map((file, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {file.name}
                  <span className="text-gray-400">
                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1.5 text-xs text-gray-400">
            Maksimum 10 MB, JPEG/PNG/WebP formatı. Birden fazla fotoğraf seçilebilir.
          </p>
        </div>
        <div className="mt-6">
          <label className="block text-sm font-medium text-muted-foreground mb-1">Notlar</label>
          <textarea
            value={f.notes}
            onChange={e => u('notes', e.target.value)}
            rows={3}
            className={cls}
            placeholder="Kurulum notları..."
          />
        </div>
      </section>

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={sending || uploading}
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {uploading ? uploadProgress : sending ? 'Kaydediliyor...' : 'Cihazı Kaydet'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-gray-50 transition-colors"
        >
          İptal
        </button>
      </div>
    </form>
  );
}
