'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
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
      .then((r) => r.json())
      .then((j) => {
        setRole(j.data?.role ?? null);
        if (j.data?.role !== 'super_admin') return;
        // Load tenants
        fetch('/api/tenants')
          .then((r) => r.json())
          .then((tj) => setTenants(tj.data ?? []))
          .finally(() => setLoading(false));
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
      router.refresh(); // Re-render server components with new cookie
    } catch {
      // ignore
    }
  }, [router]);

  if (role !== 'super_admin' || loading) return null;

  const selectedTenant = tenants.find((t) => t.id === selectedId);

  return (
    <div className="relative">
      <select
        value={selectedId}
        onChange={(e) => handleSwitch(e.target.value)}
        className="h-9 rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
      >
        <option value="all">🏢 Tüm Firmalar</option>
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      {selectedTenant && (
        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
          <Building2 className="h-3 w-3" />
          {selectedTenant.name}
        </span>
      )}
    </div>
  );
}
