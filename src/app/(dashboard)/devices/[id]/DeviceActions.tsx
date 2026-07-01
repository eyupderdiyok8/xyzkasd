'use client';
import { useState, useRef, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

export default function DeviceActions({ deviceId, hasPhotos }: { deviceId: string; hasPhotos: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showTds, setShowTds] = useState(false);
  const [tv, setTv] = useState(''); const [tin, setTin] = useState(''); const [tout, setTout] = useState('');
  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { setMsg({ type: 'err', text: 'JPEG/PNG/WebP kabul edilir.' }); return; }
    if (file.size > 10*1024*1024) { setMsg({ type: 'err', text: 'Maks 10 MB.' }); return; }
    setUploading(true); setMsg(null);
    try {
      // 1. Register photo metadata
      const r1 = await fetch('/api/devices/' + deviceId + '/photos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileName: file.name, contentType: file.type, isPrimary: !hasPhotos }) });
      const j1 = await r1.json(); if (!r1.ok) throw new Error(j1.error?.message);

      // 2. Upload actual file to Supabase Storage
      const { error: uploadErr } = await supabase.storage
        .from('device-photos')
        .upload(j1.data.photo.storagePath, file, {
          contentType: file.type,
          upsert: true,
        });
      if (uploadErr) throw uploadErr;

      setMsg({ type: 'ok', text: 'Fotoğraf yüklendi' }); router.refresh();
    } catch (err: any) { setMsg({ type: 'err', text: err.message }); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };
  const addTds = async () => {
    if (!tv) return;
    const r = await fetch('/api/devices/' + deviceId + '/tds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tdsValue: Number(tv), inValue: tin ? Number(tin) : null, outValue: tout ? Number(tout) : null }) });
    if (r.ok) { setShowTds(false); setTv(''); setTin(''); setTout(''); setMsg({ type: 'ok', text: 'TDS kaydedildi' }); router.refresh(); }
    else { const j = await r.json(); setMsg({ type: 'err', text: j.error?.message ?? 'Hata' }); }
  };
  return (<div className="mt-4 space-y-3">
    {msg && <div className={'rounded-lg px-3 py-2 text-xs ' + (msg.type === 'ok' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700')}>{msg.text}</div>}
    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFile} className="hidden" />
    <div className="flex flex-wrap gap-3">
      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        {uploading ? 'Yukleniyor...' : 'Fotograf Yukle'}
      </button>
      <button type="button" onClick={() => setShowTds(!showTds)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
        TDS Olc
      </button>
    </div>
    {showTds && <div className="rounded-lg border border-border bg-gray-50 p-4">
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-xs font-medium text-gray-600 mb-1">TDS (ppm)</label><input type="number" value={tv} onChange={e => setTv(e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Giris</label><input type="number" value={tin} onChange={e => setTin(e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></div>
        <div><label className="block text-xs font-medium text-gray-600 mb-1">Cikis</label><input type="number" value={tout} onChange={e => setTout(e.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm" /></div>
      </div>
      <button type="button" onClick={addTds} className="mt-3 rounded bg-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-primary/90">Kaydet</button>
    </div>}
  </div>);
}

