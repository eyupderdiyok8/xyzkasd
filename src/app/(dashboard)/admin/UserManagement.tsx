'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@/lib/supabase/types';
import { ROLE_LABELS, ROLE_HIERARCHY } from '@/lib/roles';

interface User {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  tenant_id: string | null;
  is_active: boolean;
  tenantName?: string;
}

const ROLES: UserRole[] = ['super_admin', 'tenant_admin', 'manager', 'technician', 'viewer'];

export default function UserManagement({ currentRole }: { currentRole: UserRole }) {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isSuperAdmin = currentRole === 'super_admin';

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Failed to fetch');
      setUsers(json.data ?? []);

      // Super admin için tenant listesini yükle
      if (currentRole === 'super_admin') {
        const tRes = await fetch('/api/tenants');
        const tJson = await tRes.json();
        if (tJson.data) {
          setTenants(tJson.data);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, [currentRole]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleRoleChange(userId: string, newRole: UserRole) {
    setUpdatingId(userId);
    setError(null);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Güncelleme başarısız');
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleActive(userId: string, currentActive: boolean) {
    setUpdatingId(userId);
    setError(null);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, is_active: !currentActive }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Güncelleme başarısız');
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_active: !currentActive } : u,
        ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Güncelleme başarısız');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleTenantChange(userId: string, newTenantId: string) {
    setUpdatingId(userId);
    setError(null);
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, tenant_id: newTenantId || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Güncelleme başarısız');
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, tenant_id: newTenantId || null } : u,
        ),
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Güncelleme başarısız');
    } finally {
      setUpdatingId(null);
    }
  }

  // Determine which roles the current user can assign
  const currentUserLevel = ROLE_HIERARCHY[currentRole] ?? -1;
  const assignableRoles = ROLES.filter((r) => ROLE_HIERARCHY[r] <= currentUserLevel);

  if (loading) {
    return (
      <div className="mt-8 text-center text-sm text-gray-400">
        Kullanıcılar yükleniyor…
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Kullanıcılar ({users.length})
        </h2>
        <button
          onClick={() => router.push('/admin/invite')}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
        >
          + Kullanıcı Ekle
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-3 overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-gray-200 bg-white text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">E-posta</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Ad Soyad</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Rol</th>
              {isSuperAdmin && <th className="px-4 py-3 text-left font-medium text-gray-500">Firma</th>}
              <th className="px-4 py-3 text-left font-medium text-gray-500">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-foreground">{u.email ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground">{u.full_name ?? '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    disabled={updatingId === u.id}
                    onChange={(e) =>
                      handleRoleChange(u.id, e.target.value as UserRole)
                    }
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {assignableRoles.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </td>
                {isSuperAdmin && (
                  <td className="px-4 py-3">
                    <select
                      value={u.tenant_id || ''}
                      disabled={updatingId === u.id}
                      onChange={(e) => handleTenantChange(u.id, e.target.value)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 max-w-[140px]"
                    >
                      <option value="">— Firma seç —</option>
                      {tenants.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </td>
                )}
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleActive(u.id, u.is_active)}
                    disabled={updatingId === u.id}
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium disabled:opacity-50 ${
                      u.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {u.is_active ? 'Aktif' : 'Pasif'}
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={isSuperAdmin ? 5 : 4} className="px-4 py-8 text-center text-gray-400">
                  Henüz kullanıcı bulunmuyor
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
