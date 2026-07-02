'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  minStock: number;
  unitPrice: number;
  isCritical: boolean;
}

export default function EditInventoryItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [minStock, setMinStock] = useState('0');
  const [unitPrice, setUnitPrice] = useState('0');

  useEffect(() => {
    fetch(`/api/inventory/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setError(json.error.message);
          return;
        }
        const item: InventoryItem = json.data;
        setName(item.name);
        setSku(item.sku ?? '');
        setMinStock(String(item.minStock));
        setUnitPrice(String(item.unitPrice));
      })
      .catch(() => setError('Veriler yüklenemedi'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Ürün adı zorunludur');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          sku: sku.trim() || null,
          minStock: Math.max(0, parseInt(minStock) || 0),
          unitPrice: Math.max(0, parseFloat(unitPrice) || 0),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? 'Bir hata oluştu');
        return;
      }

      router.push(`/inventory/${id}`);
    } catch {
      setError('Sunucu hatası');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="mt-8 text-center text-sm text-gray-400">Yükleniyor...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href={`/inventory/${id}`} className="text-sm text-blue-600 hover:text-blue-800">
              ← {name}
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">Stok Kalemi Düzenle</h1>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 max-w-lg space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-muted-foreground">
            Ürün Adı <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* SKU */}
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-muted-foreground">
            SKU (Stok Kodu)
          </label>
          <input
            id="sku"
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Min Stock */}
        <div>
          <label htmlFor="minStock" className="block text-sm font-medium text-muted-foreground">
            Kritik Stok Seviyesi (Min.)
          </label>
          <input
            id="minStock"
            type="number"
            min="0"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            Bu seviyenin altına düşüldüğünde kritik stok uyarısı gösterilir
          </p>
        </div>

        {/* Unit Price */}
        <div>
          <label htmlFor="unitPrice" className="block text-sm font-medium text-muted-foreground">
            Birim Fiyat (TL)
          </label>
          <input
            id="unitPrice"
            type="number"
            min="0"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50 transition-colors"
          >
            İptal
          </button>
        </div>
      </form>
    </div>
  );
}
