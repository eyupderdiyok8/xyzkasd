'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import TenantSelect from '@/components/TenantSelect';
import { Plus, Phone, Mail, Users, UserCheck, AlertCircle, X, Check, Building } from 'lucide-react';
import { useDashboardSession } from '@/components/DashboardSessionProvider';
import { cachedJson } from '@/lib/client-api-cache';

interface Technician {
  id: string; name: string; phone: string | null; email: string | null; isActive: boolean;
  _count: { serviceTickets: number };
}

export default function ManagerPage() {
  const { role } = useDashboardSession();
  const [techs, setTechs] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [sending, setSending] = useState(false);
  const isSuperAdmin = role === 'super_admin';

  const fetchTechs = useCallback(() => {
    setLoading(true);
    cachedJson<{ data?: Technician[]; error?: { message?: string } }>('/api/technicians', undefined, 1000)
      .then(j => { if (j.error) setError(j.error.message ?? 'Yüklenemedi'); else setTechs(j.data ?? []); })
      .catch(() => setError('Yüklenemedi'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTechs();
  }, [fetchTechs]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isSuperAdmin && !tenantId) { setError('Firma seçmelisiniz'); return; }
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/technicians', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || undefined, email: email.trim() || undefined, tenantId: isSuperAdmin ? tenantId : undefined }),
      });
      const text = await res.text();
      let json: any;
      try { json = JSON.parse(text); } catch { throw new Error('Sunucu hatası: ' + (text || '(boş yanıt)')); }
      if (!res.ok) { setError(json.error?.message || 'Hata'); setSending(false); return; }
      setName(''); setPhone(''); setEmail(''); setTenantId(''); setShowForm(false); setSending(false);
      setSuccess(`${json.data.name} eklendi`);
      fetchTechs();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Beklenmeyen hata');
      setSending(false);
    }
  };

  const handleToggleActive = async (t: Technician) => {
    await fetch(`/api/technicians/${t.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    fetchTechs();
  };

  const active = techs.filter(t => t.isActive);
  const totalTickets = techs.reduce((sum, t) => sum + (t._count?.serviceTickets ?? 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Yönetici Paneli</h1>
          <p className="text-sm text-slate-500">Operasyonları ve ekip atamalarını yönetin</p>
        </div>
      </div>

      {/* Success/Error */}
      {success && <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><Check className="h-4 w-4" />{success}</div>}
      {error && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="h-4 w-4" />{error}</div>}

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<Users className="h-4 w-4" />} label="Toplam Teknisyen" value={techs.length} color="slate" />
        <Stat icon={<UserCheck className="h-4 w-4" />} label="Aktif" value={active.length} color="emerald" />
        <Stat icon={<AlertCircle className="h-4 w-4" />} label="Toplam Servis" value={totalTickets} color="blue" />
      </div>

      {/* Ekip Üyeleri */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Ekip Üyeleri ({techs.length})
          </h2>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-3.5 w-3.5" />{showForm ? 'İptal' : 'Teknisyen Ekle'}
          </Button>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleAdd} className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            {isSuperAdmin && (
              <div className="mb-3">
                <label className="mb-1 block text-xs font-medium text-slate-600">Firma</label>
                <TenantSelect value={tenantId} onChange={setTenantId} />
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ad Soyad *" className="bg-white" />
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefon" className="bg-white" />
              <div className="flex gap-2">
                <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="E-posta" className="bg-white flex-1" />
                <Button type="submit" size="sm" disabled={sending}>{sending ? '...' : 'Ekle'}</Button>
              </div>
            </div>
          </form>
        )}

        {/* Table */}
        {loading ? (
          <div className="space-y-2 p-5">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : techs.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            <Users className="mx-auto mb-2 h-8 w-8 text-slate-300" />Henüz ekip üyesi yok
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Ad Soyad</th>
                <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">İletişim</th>
                <th className="px-5 py-2.5 text-center text-xs font-semibold text-slate-500">Servis</th>
                <th className="px-5 py-2.5 text-center text-xs font-semibold text-slate-500">Durum</th>
                <th className="px-5 py-2.5 text-right text-xs font-semibold text-slate-500">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {techs.map(t => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-900">{t.name}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {t.phone && <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Phone className="h-3 w-3" />{t.phone}</span>}
                      {t.email && <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Mail className="h-3 w-3" />{t.email}</span>}
                      {!t.phone && !t.email && <span className="text-xs text-slate-300">—</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-center text-xs font-medium tabular-nums">{t._count?.serviceTickets ?? 0}</td>
                  <td className="px-5 py-3 text-center">
                    <Badge variant={t.isActive ? 'success' : 'secondary'} className="text-[10px]">{t.isActive ? 'Aktif' : 'Pasif'}</Badge>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleToggleActive(t)}>
                      {t.isActive ? 'Pasif Yap' : 'Aktif Yap'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: 'slate' | 'emerald' | 'blue' }) {
  const bg = { slate: 'bg-slate-100 text-slate-600', emerald: 'bg-emerald-100 text-emerald-600', blue: 'bg-blue-100 text-blue-600' }[color];
  const tc = { slate: 'text-slate-900', emerald: 'text-emerald-700', blue: 'text-blue-700' }[color];
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}>{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`text-xl font-bold tabular-nums ${tc}`}>{value}</p>
      </div>
    </div>
  );
}
