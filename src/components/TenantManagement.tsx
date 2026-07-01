'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Building, Check, X } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
}

const PLAN_OPTIONS = ['STARTER', 'PROFESSIONAL'];

export default function TenantManagement() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [plan, setPlan] = useState('STARTER');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchTenants = () => {
    setLoading(true);
    fetch('/api/tenants')
      .then(r => r.json())
      .then(j => {
        if (j.error) { setError(j.error.message); return; }
        setTenants(j.data ?? []);
      })
      .catch(() => setError('Firmalar yüklenemedi'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTenants(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setSending(true);
    setError(null);

    const res = await fetch('/api/tenants', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), slug: slug.trim(), plan }),
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error?.message ?? 'Firma oluşturulamadı');
      setSending(false);
      return;
    }

    setSuccess(`"${json.data.name}" firması oluşturuldu`);
    setName('');
    setSlug('');
    setPlan('STARTER');
    setShowForm(false);
    setSending(false);
    fetchTenants();
    setTimeout(() => setSuccess(null), 4000);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-4 w-4 text-gray-600" />
            <CardTitle className="text-base">Firma Yönetimi</CardTitle>
          </div>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {showForm ? 'İptal' : 'Firma Ekle'}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
            <Check className="mr-1 inline h-3 w-3" /> {success}
          </div>
        )}

        {/* Create form */}
        {showForm && (
          <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Firma Adı</label>
                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="Ana Su Arıtma Ltd." />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Kısa Kod (slug)</label>
                <Input required value={slug} onChange={e => setSlug(e.target.value)} placeholder="ana-su" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Plan</label>
              <select
                value={plan}
                onChange={e => setPlan(e.target.value)}
                className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none"
              >
                {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <Button type="submit" disabled={sending} size="sm">
              {sending ? 'Oluşturuluyor...' : 'Firma Oluştur'}
            </Button>
          </form>
        )}

        {/* Tenant list */}
        {loading ? (
          <div className="text-sm text-gray-400">Yükleniyor...</div>
        ) : tenants.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-400">
            <Building className="mx-auto mb-2 h-8 w-8 text-gray-300" />
            Henüz firma bulunmuyor
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tenants.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.slug}</p>
                </div>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                  {t.plan}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
