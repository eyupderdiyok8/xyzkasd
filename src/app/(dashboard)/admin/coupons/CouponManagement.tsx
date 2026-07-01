'use client';

import { useState, useEffect, useCallback } from 'react';

interface Coupon {
  id: string;
  code: string;
  discountPct: number;
  maxUses: number;
  currentUses: number;
  expiresAt: string | null;
  isActive: boolean;
  autoCreated: boolean;
  minRating: number | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { usages: number };
}

export default function CouponManagement() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formDiscount, setFormDiscount] = useState('10');
  const [formMaxUses, setFormMaxUses] = useState('1');
  const [formExpiresAt, setFormExpiresAt] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch('/api/coupons');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Yükleme hatası');
      setCoupons(json.data ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  function openNewForm() {
    setFormCode('');
    setFormDiscount('10');
    setFormMaxUses('1');
    setFormExpiresAt('');
    setFormDescription('');
    setError(null);
    setShowForm(true);
  }

  async function handleCreate() {
    if (!formCode.trim()) {
      setError('Kupon kodu zorunludur');
      return;
    }
    const discount = parseFloat(formDiscount);
    if (isNaN(discount) || discount <= 0 || discount > 100) {
      setError('İndirim yüzdesi 1-100 arasında olmalıdır');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formCode.trim(),
          discountPct: discount,
          maxUses: parseInt(formMaxUses) || 1,
          expiresAt: formExpiresAt || null,
          description: formDescription.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Oluşturma hatası');

      await fetchCoupons();
      setShowForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(coupon: Coupon) {
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Güncelleme hatası');
      setCoupons((prev) =>
        prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !c.isActive } : c)),
      );
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu kuponu silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Silme hatası');
      setCoupons((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setError(err.message);
    }
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  function getExpiryStatus(coupon: Coupon): { label: string; color: string } {
    if (!coupon.isActive) return { label: 'Pasif', color: 'bg-gray-100 text-gray-600' };
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return { label: 'Süresi Doldu', color: 'bg-red-100 text-red-700' };
    }
    if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
      return { label: 'Tükendi', color: 'bg-yellow-100 text-yellow-700' };
    }
    return { label: 'Aktif', color: 'bg-green-100 text-green-700' };
  }

  if (loading) {
    return (
      <div className="mt-8 text-center text-sm text-gray-400">
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Coupon List */}
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Kuponlar ({coupons.length})
          </h2>
          <button
            onClick={openNewForm}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            + Yeni Kupon
          </button>
        </div>

        {coupons.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">
            Henüz kupon oluşturulmamış. &quot;+ Yeni Kupon&quot; butonuna tıklayarak
            ilk kuponunuzu oluşturun.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Kod</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">İndirim</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Kullanım</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Son Geçerlilik</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Durum</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Açıklama</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {coupons.map((coupon) => {
                  const expiry = getExpiryStatus(coupon);
                  return (
                    <tr key={coupon.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm font-medium text-foreground">
                        {coupon.code}
                        {coupon.autoCreated && (
                          <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-700">
                            Otomatik
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">%{coupon.discountPct}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {coupon.currentUses}
                        {coupon.maxUses > 0 ? ` / ${coupon.maxUses}` : ' / ∞'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(coupon.expiresAt)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${expiry.color}`}
                        >
                          {expiry.label}
                        </span>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 text-gray-500">
                        {coupon.description ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleActive(coupon)}
                          className="mr-2 text-xs text-blue-600 hover:text-blue-800"
                          title={coupon.isActive ? 'Pasif yap' : 'Aktif yap'}
                        >
                          {coupon.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                        </button>
                        <button
                          onClick={() => handleDelete(coupon.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="text-lg font-semibold text-foreground">Yeni Kupon</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Kupon Kodu *
              </label>
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="Örn: INDIRIM10"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono uppercase focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Otomatik büyük harfe çevrilir
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                İndirim Yüzdesi *
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="number"
                  value={formDiscount}
                  onChange={(e) => setFormDiscount(e.target.value)}
                  min="1"
                  max="100"
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-500">%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Maksimum Kullanım
              </label>
              <input
                type="number"
                value={formMaxUses}
                onChange={(e) => setFormMaxUses(e.target.value)}
                min="0"
                placeholder="0 = sınırsız"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">0 = sınırsız kullanım</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Son Geçerlilik Tarihi
              </label>
              <input
                type="date"
                value={formExpiresAt}
                onChange={(e) => setFormExpiresAt(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-400">Boş bırakılırsa süresiz</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground">
                Açıklama
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Kampanya açıklaması (opsiyonel)"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Oluşturuluyor…' : 'Kupon Oluştur'}
            </button>
            <button
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50"
            >
              İptal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
