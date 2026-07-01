'use client';

import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface TenantSelectProps {
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function TenantSelect({ value, onChange, className }: TenantSelectProps) {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/tenants')
      .then(r => r.json())
      .then(j => {
        if (j.error) { setError(j.error.message); return; }
        setTenants(j.data ?? []);
      })
      .catch(() => setError('Firmalar yüklenemedi'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="h-10 w-full animate-pulse rounded-md bg-muted" />;
  }

  if (error) {
    return <div className="text-xs text-destructive">{error}</div>;
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="">Firma seçin...</option>
        {tenants.map(t => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.plan})
          </option>
        ))}
      </select>
    </div>
  );
}
