'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { hasRole } from '@/lib/roles';
import type { UserRole } from '@/lib/supabase/types';
import { UserPlus, Wrench, Package, ClipboardList } from 'lucide-react';

const ACTIONS = [
  { href: '/hizli-servis', label: '⚡ Hızlı Servis', icon: ClipboardList, minRole: 'technician' as UserRole },
  { href: '/customers/new', label: 'Yeni Müşteri', icon: UserPlus, minRole: 'technician' as UserRole },
  { href: '/devices/new', label: 'Yeni Cihaz', icon: Wrench, minRole: 'technician' as UserRole },
  { href: '/inventory', label: 'Stok Kontrol', icon: Package, minRole: 'technician' as UserRole },
];

export default function QuickActions({ role: initialRole }: { role?: UserRole }) {
  const [role, setRole] = useState<UserRole | null>(initialRole ?? null);
  useEffect(() => {
    if (initialRole) return;
    fetch('/api/auth/me').then(r => r.json()).then(j => setRole(j.data?.role ?? null)).catch(() => {});
  }, [initialRole]);

  const visible = ACTIONS.filter(a => role && hasRole(role, a.minRole));
  if (visible.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">Hızlı İşlemler</h3>
      <div className="grid grid-cols-2 gap-2">
        {visible.map(a => {
          const Icon = a.icon;
          return (
            <Link key={a.href} href={a.href}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-slate-200 p-3 text-center transition-colors hover:border-blue-300 hover:bg-blue-50"
            >
              <Icon className="h-5 w-5 text-slate-500" />
              <span className="text-xs font-medium text-slate-700">{a.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
