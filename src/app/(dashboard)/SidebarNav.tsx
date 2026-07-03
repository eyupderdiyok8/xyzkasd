'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { hasRole } from '@/lib/roles';
import { isMembershipActive, type MembershipType } from '@/lib/features';
import type { UserRole } from '@/lib/supabase/types';
import {
  LayoutDashboard, Users, Wrench, Filter, Package, ClipboardList,
  BarChart3, Shield, UserPlus, MessageSquare, FileText, Bot,
  Ticket, ThumbsUp, ChevronLeft, Settings, Zap, ChevronDown,
} from 'lucide-react';

interface NavItem {
  href: string; label: string; icon: React.ElementType;
  minRole: UserRole;
  requiredFeature?: 'whatsapp' | 'automation' | 'message_templates' | 'surveys' | 'coupons' | 'advanced_reports';
}

interface NavSection {
  key: string; label: string; minRole: UserRole; items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    key: 'main', label: 'Ana', minRole: 'viewer', items: [
      { href: '/dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard, minRole: 'viewer' },
      { href: '/hizli-servis', label: 'Hızlı Servis', icon: Zap, minRole: 'technician' },
    ],
  },
  {
    key: 'ops', label: 'Operasyon', minRole: 'technician', items: [
      { href: '/customers', label: 'Müşteriler', icon: Users, minRole: 'viewer' },
      { href: '/devices', label: 'Cihazlar', icon: Wrench, minRole: 'technician' },
      { href: '/devices/filters', label: 'Filtre Takibi', icon: Filter, minRole: 'technician' },
      { href: '/inventory', label: 'Envanter', icon: Package, minRole: 'technician' },
      { href: '/technician', label: 'Servis Çağrıları', icon: ClipboardList, minRole: 'technician' },
    ],
  },
  {
    key: 'mgmt', label: 'Yönetim', minRole: 'manager', items: [
      { href: '/manager', label: 'Yönetici Paneli', icon: BarChart3, minRole: 'manager' },
      { href: '/manager/services', label: 'Servis Kayıtları', icon: FileText, minRole: 'manager' },
      { href: '/reports', label: 'Raporlar', icon: BarChart3, minRole: 'manager' },
    ],
  },
  {
    key: 'admin', label: 'Admin', minRole: 'tenant_admin', items: [
      { href: '/admin', label: 'Admin Paneli', icon: Shield, minRole: 'tenant_admin' },
      { href: '/admin/invite', label: 'Kullanıcı Davet Et', icon: UserPlus, minRole: 'tenant_admin' },
      { href: '/admin/whatsapp', label: 'WhatsApp', icon: MessageSquare, minRole: 'tenant_admin', requiredFeature: 'whatsapp' },
      { href: '/admin/whatsapp/templates', label: 'Mesaj Şablonları', icon: FileText, minRole: 'tenant_admin', requiredFeature: 'message_templates' },
      { href: '/admin/automation', label: 'Otomasyon', icon: Bot, minRole: 'manager', requiredFeature: 'automation' },
      { href: '/admin/coupons', label: 'Kuponlar', icon: Ticket, minRole: 'tenant_admin' },
      { href: '/admin/surveys', label: 'Anketler', icon: ThumbsUp, minRole: 'manager' },
    ],
  },
  {
    key: 'account', label: 'Hesap', minRole: 'viewer', items: [
      { href: '/settings', label: 'Hesap Ayarları', icon: Settings, minRole: 'viewer' },
    ],
  },
];

interface SidebarNavProps {
  role: UserRole;
  membershipType: MembershipType | null;
  membershipExpiresAt: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function SidebarNav({ role, membershipType, membershipExpiresAt, collapsed, onToggleCollapse }: SidebarNavProps) {
  const pathname = usePathname();
  const membershipActive = isMembershipActive(membershipType, membershipExpiresAt);
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    // Auto-expand sections containing the active route
    const init: Record<string, boolean> = {};
    for (const section of SECTIONS) {
      init[section.key] = section.items.some(item =>
        pathname === item.href || pathname.startsWith(item.href + '/')
      );
    }
    return init;
  });

  // Filter sections by role
  const visibleSections = SECTIONS.filter(s => hasRole(role, s.minRole)).map(section => ({
    ...section,
    items: section.items.filter(item =>
      hasRole(role, item.minRole) &&
      (!item.requiredFeature || membershipActive)
    ),
  })).filter(s => s.items.length > 0);

  if (collapsed) {
    // Collapsed: show just icons
    return (
      <nav className="flex-1 space-y-1 px-2 py-3 overflow-y-auto">
        {visibleSections.flatMap(s => s.items).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center justify-center rounded-lg p-2.5 transition-colors',
                isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
              title={item.label}
            >
              <Icon className="h-4 w-4" />
            </Link>
          );
        })}
        <button onClick={onToggleCollapse}
          className="mt-2 flex w-full justify-center rounded-lg p-2 text-xs text-muted-foreground hover:bg-accent transition-colors">
          <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
        </button>
      </nav>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2">
      {visibleSections.map((section) => {
        const isOpen = expanded[section.key] ?? false;
        const hasActive = section.items.some(item =>
          pathname === item.href || pathname.startsWith(item.href + '/')
        );

        return (
          <div key={section.key} className="mb-1">
            {/* Section header */}
            <button
              onClick={() => setExpanded(prev => ({ ...prev, [section.key]: !prev[section.key] }))}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={cn(
                'h-3 w-3 transition-transform',
                isOpen && 'rotate-180',
                hasActive && 'text-primary',
              )} />
              <span className={cn(hasActive && 'text-primary', 'truncate')}>{section.label}</span>
              <div className="ml-auto h-px flex-1 bg-border" />
            </button>

            {/* Section items */}
            {isOpen && (
              <div className="space-y-0.5 px-2">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Collapse toggle */}
      <button onClick={onToggleCollapse}
        className="mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2 mx-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
        <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
        <span>Daralt</span>
      </button>
    </nav>
  );
}
