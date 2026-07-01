'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/lib/supabase/types';
import { ROLE_LABELS, ROLE_HIERARCHY } from '@/lib/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TenantSelect from '@/components/TenantSelect';

const ALL_ROLES: UserRole[] = ['super_admin', 'tenant_admin', 'manager', 'technician', 'viewer'];

export default function InviteUserPage() {
  const router = useRouter();
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('technician');
  const [tenantId, setTenantId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((json) => {
        const userRole = json.data?.role as UserRole | undefined;
        setCurrentUserRole(userRole ?? null);
        setIsSuperAdmin(userRole === 'super_admin');
        if (userRole) {
          const currentLevel = ROLE_HIERARCHY[userRole];
          const assignableDesc = ALL_ROLES
            .filter((r) => ROLE_HIERARCHY[r] <= currentLevel)
            .sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]);
          if (assignableDesc.length > 0) {
            const defaultRole = assignableDesc.includes('technician') ? 'technician' : assignableDesc[assignableDesc.length - 1];
            setRole(defaultRole);
          }
        }
      })
      .catch(() => {});
  }, []);

  const currentLevel = currentUserRole ? ROLE_HIERARCHY[currentUserRole] : -1;
  const assignableRoles = ALL_ROLES.filter((r) => ROLE_HIERARCHY[r] <= currentLevel);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSuperAdmin && !tenantId) {
      setError('Süper admin olarak bir firma seçmelisiniz');
      return;
    }
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName, role, tenantId: isSuperAdmin ? tenantId : undefined }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? 'Davet gönderilemedi');
        return;
      }

      setSuccess(`Kullanıcı oluşturuldu: ${json.data.email} (${ROLE_LABELS[json.data.role as UserRole] ?? json.data.role})`);
      setEmail('');
      setPassword('');
      setFullName('');
      setRole('technician');
      setTenantId('');
    } catch (err: any) {
      setError(err.message ?? 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Kullanıcı Davet Et</h1>
        <p className="mt-1 text-sm text-gray-500">Yeni bir kullanıcı oluşturun ve rol atayın</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Super admin: tenant selector */}
        {isSuperAdmin && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">Firma</label>
            <TenantSelect value={tenantId} onChange={setTenantId} />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Ad Soyad</label>
          <Input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ad Soyad" />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">E-posta</label>
          <Input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="kullanici@firma.com" />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Geçici Şifre</label>
          <Input required type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} placeholder="En az 6 karakter" />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1.5">Rol</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
            className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {assignableRoles.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Oluşturuluyor…' : 'Kullanıcı Oluştur'}
        </Button>
      </form>
    </div>
  );
}
