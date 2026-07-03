'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Star, Check, AlertCircle } from 'lucide-react';
import { MEMBERSHIP_LABELS, FOUNDER_BADGE, type MembershipType } from '@/lib/features';

const MEMBERSHIP_OPTIONS: MembershipType[] = ['MONTHLY', 'YEARLY', 'FOUNDER'];

interface Tenant {
  id: string;
  name: string;
  slug: string;
  membershipType?: string;
}

export default function MembershipAssigner() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [membershipType, setMembershipType] = useState<MembershipType>('MONTHLY');
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tenantsLoaded, setTenantsLoaded] = useState(false);

  const loadTenants = async () => {
    try {
      const res = await fetch('/api/tenants');
      const json = await res.json();
      if (json.data) {
        setTenants(json.data);
        if (json.data.length > 0) setSelectedTenant(json.data[0].id);
      }
    } catch {
      setError('Firmalar yüklenemedi');
    }
    setTenantsLoaded(true);
  };

  if (!tenantsLoaded) {
    loadTenants();
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-gray-400">
          Yükleniyor...
        </CardContent>
      </Card>
    );
  }

  const handleAssign = async () => {
    if (!selectedTenant) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedTenant,
          membershipType,
          membershipExpiresAt: expiresAt || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Atanamadı');

      const tenantName = tenants.find(t => t.id === selectedTenant)?.name ?? selectedTenant;
      setSuccess(
        `"${tenantName}" firmasına ${membershipType === 'FOUNDER' ? FOUNDER_BADGE + ' ' : ''}${MEMBERSHIP_LABELS[membershipType]} üyeliği atandı.`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Üyelik atanırken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-indigo-600" />
          <CardTitle className="text-base">Üyelik Ata</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Herhangi bir firmaya üyelik tipi ve bitiş tarihi atayın.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
            <Check className="h-3.5 w-3.5 shrink-0" />
            {success}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium mb-1">Firma</label>
            <select
              value={selectedTenant}
              onChange={e => setSelectedTenant(e.target.value)}
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Üyelik Tipi</label>
            <select
              value={membershipType}
              onChange={e => setMembershipType(e.target.value as MembershipType)}
              className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {MEMBERSHIP_OPTIONS.map(t => (
                <option key={t} value={t}>
                  {t === 'FOUNDER' ? `${FOUNDER_BADGE} ${MEMBERSHIP_LABELS[t]}` : MEMBERSHIP_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1">
            Bitiş Tarihi
            {membershipType === 'FOUNDER' && <span className="text-gray-400 ml-1">(boş bırak = sınırsız)</span>}
            {membershipType === 'MONTHLY' && <span className="text-gray-400 ml-1">(boş bırak = bugün + 30 gün)</span>}
            {membershipType === 'YEARLY' && <span className="text-gray-400 ml-1">(boş bırak = bugün + 365 gün)</span>}
          </label>
          <Input
            type="date"
            value={expiresAt}
            onChange={e => setExpiresAt(e.target.value)}
          />
        </div>

        <Button onClick={handleAssign} disabled={loading} className="w-full">
          {loading ? 'Atanıyor...' : 'Üyeliği Ata'}
        </Button>
      </CardContent>
    </Card>
  );
}
