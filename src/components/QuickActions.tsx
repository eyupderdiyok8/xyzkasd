'use client';

import Link from 'next/link';
import { hasRole } from '@/lib/roles';
import type { UserRole } from '@/lib/supabase/types';
import { useDashboardSession } from '@/components/DashboardSessionProvider';
import { UserPlus, Wrench, Package, ClipboardList, ArrowRight } from 'lucide-react';

const ACTIONS = [
  { href: '/hizli-servis', label: '⚡ Hızlı Servis', icon: ClipboardList, minRole: 'manager' as UserRole },
  { href: '/customers/new', label: 'Yeni Müşteri', icon: UserPlus, minRole: 'technician' as UserRole },
  { href: '/devices/new', label: 'Yeni Cihaz', icon: Wrench, minRole: 'technician' as UserRole },
  { href: '/inventory', label: 'Stok Kontrol', icon: Package, minRole: 'technician' as UserRole },
];

export default function QuickActions({ role: initialRole }: { role?: UserRole }) {
  const session = useDashboardSession();
  const role = initialRole ?? session.role;

  const visible = ACTIONS.filter(a => role && hasRole(role, a.minRole));
  if (visible.length === 0) return null;

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Hızlı İşlemler</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        {visible.map(a => {
          const Icon = a.icon;
          return (
            <Link key={a.href} href={a.href}
              className="group flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-xs font-medium text-card-foreground">{a.label}</span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
