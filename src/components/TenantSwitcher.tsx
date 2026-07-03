'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  membershipType?: string;
  membershipExpiresAt?: string | null;
}

/** Güvenli JSON parse — boş/geçersiz yanıtta hata fırlatmaz */
async function safeJson(res: Response): Promise<any> {
  if (!res.ok) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function TenantSwitcher() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedId, setSelectedId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // Only load for super_admin
    fetch('/api/auth/me')
      .then(safeJson)
      .then((j) => {
        if (!j?.data) { setLoading(false); return; }
        setRole(j.data.role ?? null);
        setSelectedId(j.data.effectiveTenantId ?? 'all');
        if (j.data.role !== 'super_admin') { setLoading(false); return; }
        // Load tenants
        fetch('/api/tenants')
          .then(safeJson)
          .then((tj) => {
            setTenants(tj?.data ?? []);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSwitch = useCallback(async (tenantId: string) => {
    setSelectedId(tenantId);
    try {
      await fetch('/api/tenants/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenantId === 'all' ? null : tenantId }),
      });
      router.refresh();
    } catch {
      // ignore
    }
  }, [router]);

  if (role !== 'super_admin' || loading) return null;

  return (
    <div className="relative">
      <select
        value={selectedId}
        onChange={(e) => handleSwitch(e.target.value)}
        className="h-9 rounded-lg border border-border bg-card pl-3 pr-8 text-sm font-medium text-card-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary appearance-none cursor-pointer"
      >
        <option value="all">🏢 Tüm Firmalar</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}
