'use client';
import { useState, useEffect, type FormEvent } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import CustomerSelect from '@/components/CustomerSelect';

export default function EditDeviceForm() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [f, setF] = useState({ serialNo: '', brand: '', model: '', customerId: '', warrantyStart: '', warrantyEnd: '', installDate: '', notes: '', status: 'ACTIVE' });
  const u = (field: string, v: string) => setF(p => ({ ...p, [field]: v }));
  const cls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';
  useEffect(() => {
    fetch('/api/devices/' + id).then(r => r.json()).then(j => {
      const d = j.data; setF({ serialNo: d.serialNo, brand: d.brand, model: d.model, customerId: d.customerId ?? '', warrantyStart: d.warrantyStart ? d.warrantyStart.slice(0,10) : '', warrantyEnd: d.warrantyEnd ? d.warrantyEnd.slice(0,10) : '', installDate: d.installDate ? d.installDate.slice(0,10) : '', notes: d.notes ?? '', status: d.status });
    }).catch(() => setError('Cihaz yüklenemedi')).finally(() => setLoading(false));
  }, [id]);
  async function submit(e: FormEvent) {
    e.preventDefault(); setSending(true); setError('');
    const res = await fetch('/api/devices/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, customerId: f.customerId || null, warrantyStart: f.warrantyStart || null, warrantyEnd: f.warrantyEnd || null, installDate: f.installDate || null, notes: f.notes || null }) });
    const j = await res.json();
    if (!res.ok) { setError(j.error?.message ?? 'Güncelleme başarısız'); setSending(false); return; }
    router.push('/devices/' + id); router.refresh();
  }
  if (loading) return <div className="py-12 text-center text-sm text-gray-400">Yükleniyor...</div>;
  return (<div>
    {error && <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    <form onSubmit={submit} className="space-y-8">
      <section className="rounded-lg border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Temel Bilgiler</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div><label className="block text-sm font-medium text-muted-foreground mb-1">Seri No</label><input type="text" required value={f.serialNo} onChange={e => u('serialNo', e.target.value)} className={cls} /></div>
          <div><label className="block text-sm font-medium text-muted-foreground mb-1">Marka</label><input type="text" required value={f.brand} onChange={e => u('brand', e.target.value)} className={cls} /></div>
          <div><label className="block text-sm font-medium text-muted-foreground mb-1">Model</label><input type="text" required value={f.model} onChange={e => u('model', e.target.value)} className={cls} /></div>
          <div><label className="block text-sm font-medium text-muted-foreground mb-1">Durum</label><select value={f.status} onChange={e => u('status', e.target.value)} className={cls}><option value="ACTIVE">Aktif</option><option value="PASSIVE">Pasif</option><option value="SCRAP">Hurda</option></select></div>
        </div>
      </section>
      <section className="rounded-lg border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Müşteri</h2>
        <CustomerSelect
          value={f.customerId}
          onChange={(v) => u('customerId', v)}
        />
      </section>
      <section className="rounded-lg border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Garanti</h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div><label className="block text-sm font-medium text-muted-foreground mb-1">Başlangıç</label><input type="date" value={f.warrantyStart} onChange={e => u('warrantyStart', e.target.value)} className={cls} /></div>
          <div><label className="block text-sm font-medium text-muted-foreground mb-1">Bitiş</label><input type="date" value={f.warrantyEnd} onChange={e => u('warrantyEnd', e.target.value)} className={cls} /></div>
        </div>
      </section>
      <section className="rounded-lg border border-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Kurulum</h2>
        <div><label className="block text-sm font-medium text-muted-foreground mb-1">Kurulum Tarihi</label><input type="date" value={f.installDate} onChange={e => u('installDate', e.target.value)} className={cls} /></div>
        <div className="mt-6"><label className="block text-sm font-medium text-muted-foreground mb-1">Notlar</label><textarea value={f.notes} onChange={e => u('notes', e.target.value)} rows={3} className={cls} /></div>
      </section>
      <div className="flex gap-4">
        <button type="submit" disabled={sending} className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">{sending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</button>
        <Link href={'/devices/' + id} className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-gray-50">İptal</Link>
      </div>
    </form>
  </div>);
}

