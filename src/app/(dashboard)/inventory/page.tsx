'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { hasRole } from '@/lib/roles';
import { useDashboardSession } from '@/components/DashboardSessionProvider';
import { cachedJson } from '@/lib/client-api-cache';

interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  quantity: number;
  minStock: number;
  unitPrice: number;
  isCritical: boolean;
  createdAt: string;
  updatedAt: string;
}

const REFERENCE_LABELS: Record<string, string> = {
  PURCHASE: 'Satın Alma',
  SERVICE: 'Servis',
  RETURN: 'İade',
  ADJUSTMENT: 'Düzeltme',
  OTHER: 'Diğer',
};

export default function InventoryPage() {
  const { role } = useDashboardSession();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ total: number; totalPages: number; page: number; pageSize: number; allTotal?: number; criticalTotal?: number; totalStock?: number } | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '25');
    if (showCriticalOnly) params.set('critical', 'true');

    cachedJson<{ data?: InventoryItem[]; meta?: typeof meta; error?: { message?: string } }>(`/api/inventory?${params}`, undefined, 1000)
      .then((json) => {
        if (json.error) {
          setError(json.error.message ?? 'Stok verileri yüklenemedi');
          return;
        }
        setItems(json.data ?? []);
        setMeta(json.meta ?? null);
      })
      .catch(() => setError('Stok verileri yüklenemedi'))
      .finally(() => setLoading(false));
  }, [page, showCriticalOnly]);

  const canEdit = hasRole(role, 'technician');

  const displayed = showCriticalOnly
    ? items.filter((i) => i.isCritical)
    : items;

  const stats = {
    total: meta?.allTotal ?? meta?.total ?? items.length,
    critical: meta?.criticalTotal ?? items.filter((i) => i.isCritical).length,
    totalStock: meta?.totalStock ?? items.reduce((s, i) => s + i.quantity, 0),
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Envanter Yönetimi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Filtre ve parça stoğu takibi, giriş/çıkış yönetimi
          </p>
        </div>
        {canEdit && (
          <Link
            href="/inventory/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            + Yeni Stok Kalemi
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Toplam Kalem</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Toplam Stok Adedi</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats.totalStock}</p>
        </div>
        <div className={`rounded-lg border p-4 shadow-sm ${stats.critical > 0 ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Kritik Stok</p>
          <p className={`mt-1 text-2xl font-bold ${stats.critical > 0 ? 'text-red-700' : 'text-green-700'}`}>
            {stats.critical > 0 ? `${stats.critical} kalem ⚠️` : 'Yok ✅'}
          </p>
        </div>
      </div>

      {/* Critical Stock Alert Banner */}
      {stats.critical > 0 && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <p className="text-sm font-medium text-red-800">
                <strong>{stats.critical} stok kalemi</strong> kritik seviyenin altına düştü. En kısa sürede sipariş verilmesi önerilir.
              </p>
            </div>
            <button
              onClick={() => { setShowCriticalOnly(!showCriticalOnly); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                showCriticalOnly
                  ? 'bg-red-600 text-white'
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {showCriticalOnly ? 'Tümünü Göster' : 'Sadece Kritik'}
            </button>
          </div>
        </div>
      )}

      {/* Quick Filter */}
      {stats.critical > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => { setShowCriticalOnly(false); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              !showCriticalOnly
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tümü ({stats.total})
          </button>
          <button
            onClick={() => { setShowCriticalOnly(true); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              showCriticalOnly
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Kritik ({stats.critical})
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="mt-8 text-center text-sm text-gray-400">Yükleniyor...</div>
      )}

      {/* Inventory Table */}
      {!loading && !error && (
        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Ürün Adı</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">SKU</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Stok Adedi</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Min. Stok</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Durum</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Birim Fiyat</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayed.map((item) => {
                const isCritical = item.quantity <= item.minStock;
                const isOutOfStock = item.quantity === 0;
                const rowBg = isOutOfStock ? 'bg-red-50' : isCritical ? 'bg-yellow-50' : '';
                return (
                  <tr key={item.id} className={`hover:bg-gray-50 ${rowBg}`}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/inventory/${item.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {item.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {item.sku ? (
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                          {item.sku}
                        </code>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-center font-mono font-semibold ${
                      isOutOfStock ? 'text-red-600' : isCritical ? 'text-yellow-600' : 'text-foreground'
                    }`}>
                      {item.quantity}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-gray-600">
                      {item.minStock}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          STOKTA YOK
                        </span>
                      ) : isCritical ? (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          KRİTİK
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          YETERLİ
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {item.unitPrice > 0 ? `${item.unitPrice.toFixed(2)} TL` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {canEdit && (
                        <Link
                          href={`/inventory/${item.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Detay
                        </Link>
                      )}
                    </td>
                  </tr>
                );
              })}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    {showCriticalOnly
                      ? 'Kritik stok kalemi bulunmuyor ✅'
                      : 'Henüz stok kalemi eklenmemiş'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-white px-4 py-3 text-sm">
          <span className="text-gray-500">Sayfa {meta.page} / {meta.totalPages}</span>
          <div className="flex gap-2">
            <button className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Önceki</button>
            <button className="rounded-md border px-3 py-1.5 text-sm disabled:opacity-50" disabled={page >= meta.totalPages || loading} onClick={() => setPage((p) => p + 1)}>Sonraki</button>
          </div>
        </div>
      )}
    </div>
  );
}
