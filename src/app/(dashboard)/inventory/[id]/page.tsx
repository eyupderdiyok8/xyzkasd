'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { hasRole } from '@/lib/roles';
import type { UserRole } from '@/lib/supabase/types';

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

interface Transaction {
  id: string;
  itemId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  referenceType: string;
  referenceId: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
}

const REFERENCE_LABELS: Record<string, string> = {
  PURCHASE: 'Satın Alma',
  SERVICE: 'Servis',
  RETURN: 'İade',
  ADJUSTMENT: 'Düzeltme',
  OTHER: 'Diğer',
};

const TYPE_LABELS: Record<string, string> = {
  IN: 'Giriş',
  OUT: 'Çıkış',
};

export default function InventoryItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);

  // Stock in/out modal
  const [showModal, setShowModal] = useState<'IN' | 'OUT' | null>(null);
  const [txQuantity, setTxQuantity] = useState('1');
  const [txReference, setTxReference] = useState('OTHER');
  const [txReferenceId, setTxReferenceId] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [txCost, setTxCost] = useState('');
  const [txSaving, setTxSaving] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);

  const loadItem = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/inventory/${id}`).then((r) => r.json()),
      fetch(`/api/inventory/${id}/transactions`).then((r) => r.json()),
    ])
      .then(([itemJson, txJson]) => {
        if (itemJson.error) {
          setError(itemJson.error.message);
          return;
        }
        setItem(itemJson.data);
        setTransactions(txJson.data ?? []);
      })
      .catch(() => setError('Veriler yüklenemedi'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((json) => setRole(json.data?.role ?? null))
      .catch(() => {});
    loadItem();
  }, [id]);

  const canEdit = role && hasRole(role, 'technician');
  const canDelete = role && hasRole(role, 'manager');

  const handleTransaction = async () => {
    if (!showModal || !item) return;
    setTxError(null);

    const qty = parseInt(txQuantity);
    if (isNaN(qty) || qty <= 0) {
      setTxError('Miktar pozitif bir sayı olmalıdır');
      return;
    }

    setTxSaving(true);
    try {
      const endpoint = showModal === 'IN' ? 'stock-in' : 'stock-out';
      const res = await fetch(`/api/inventory/${item.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: qty,
          unitCost: txCost ? parseFloat(txCost) : undefined,
          referenceType: txReference,
          referenceId: txReferenceId.trim() || null,
          notes: txNotes.trim() || null,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        setTxError(json.error?.message ?? 'İşlem başarısız');
        return;
      }

      setShowModal(null);
      setTxQuantity('1');
      setTxReference('OTHER');
      setTxReferenceId('');
      setTxNotes('');
      loadItem();
    } catch {
      setTxError('Sunucu hatası');
    } finally {
      setTxSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!item || !confirm(`${item.name} kalemini silmek istediğinize emin misiniz?`)) return;

    try {
      const res = await fetch(`/api/inventory/${item.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        setError(json.error?.message ?? 'Silme başarısız');
        return;
      }
      router.push('/inventory');
    } catch {
      setError('Sunucu hatası');
    }
  };

  if (loading) {
    return <div className="mt-8 text-center text-sm text-gray-400">Yükleniyor...</div>;
  }

  if (error && !item) {
    return (
      <div>
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
        <Link href="/inventory" className="mt-4 inline-block text-sm text-blue-600 hover:text-blue-800">
          ← Envantere Dön
        </Link>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/inventory" className="text-sm text-blue-600 hover:text-blue-800">
              ← Envanter
            </Link>
          </div>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{item.name}</h1>
          {item.sku && (
            <p className="mt-0.5 text-sm text-gray-500">
              SKU: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{item.sku}</code>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <button
                onClick={() => setShowModal('IN')}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
              >
                + Stok Girişi
              </button>
              <button
                onClick={() => setShowModal('OUT')}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
              >
                - Stok Çıkışı
              </button>
            </>
          )}
          {canEdit && (
            <Link
              href={`/inventory/${item.id}/edit`}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50 transition-colors"
            >
              Düzenle
            </Link>
          )}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Sil
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Info Cards */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Mevcut Stok</p>
          <p className={`mt-1 text-2xl font-bold font-mono ${
            item.quantity === 0 ? 'text-red-600' : item.isCritical ? 'text-yellow-600' : 'text-foreground'
          }`}>
            {item.quantity}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Min. Stok</p>
          <p className="mt-1 text-2xl font-bold text-foreground font-mono">{item.minStock}</p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Durum</p>
          <p className="mt-1">
            {item.quantity === 0 ? (
              <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                STOKTA YOK
              </span>
            ) : item.isCritical ? (
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                KRİTİK
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                YETERLİ
              </span>
            )}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Birim Fiyat</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {item.unitPrice > 0 ? `${item.unitPrice.toFixed(2)} TL` : '—'}
          </p>
        </div>
      </div>

      {/* Critical Stock Alert */}
      {item.isCritical && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <p className="text-sm font-medium text-red-800">
              <strong>Kritik stok uyarısı!</strong> Mevcut stok ({item.quantity}), minimum stok seviyesinin ({item.minStock}) altında.
              {item.quantity === 0
                ? ' Stok tükendi, lütfen sipariş verin.'
                : ` ${item.minStock - item.quantity} adet daha eklemeniz önerilir.`}
            </p>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">Hareket Geçmişi</h2>

        <div className="mt-4 overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Tarih</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Tür</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Miktar</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Referans</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Not</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">
                    {new Date(tx.createdAt).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {tx.type === 'IN' ? (
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Giriş
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                        Çıkış
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-semibold ${
                    tx.type === 'IN' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.type === 'IN' ? '+' : '-'}{tx.quantity}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-muted-foreground">
                      {REFERENCE_LABELS[tx.referenceType] ?? tx.referenceType}
                    </span>
                    {tx.referenceId && (
                      <code className="ml-1 rounded bg-gray-100 px-1 py-0.5 text-[10px] text-gray-500">
                        #{tx.referenceId}
                      </code>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {tx.notes || '—'}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    Henüz hareket kaydı bulunmuyor
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock In/Out Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">
              {showModal === 'IN' ? 'Stok Girişi' : 'Stok Çıkışı'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {item.name} — Mevcut stok: <strong>{item.quantity}</strong>
            </p>

            {txError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {txError}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Miktar *</label>
                <input
                  type="number"
                  min="1"
                  value={txQuantity}
                  onChange={(e) => setTxQuantity(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {showModal === 'IN' && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Birim Maliyet (₺)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={txCost}
                    onChange={(e) => setTxCost(e.target.value)}
                    placeholder="0.00"
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-400">Gider takibi için stok giriş maliyeti</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted-foreground">Referans Türü</label>
                <select
                  value={txReference}
                  onChange={(e) => setTxReference(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {Object.entries(REFERENCE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">Referans No</label>
                <input
                  type="text"
                  value={txReferenceId}
                  onChange={(e) => setTxReferenceId(e.target.value)}
                  placeholder="Sipariş no, fatura no vb."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground">Not</label>
                <textarea
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => { setShowModal(null); setTxError(null); }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleTransaction}
                disabled={txSaving}
                className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                  showModal === 'IN'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-orange-600 hover:bg-orange-700'
                } disabled:opacity-50`}
              >
                {txSaving ? 'İşleniyor...' : 'Onayla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
