'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { hasRole } from '@/lib/roles';
import { hasFeature, type PlanType } from '@/lib/features';
import type { UserRole } from '@/lib/supabase/types';
import {
  LayoutDashboard,
  Users,
  Wrench,
  Filter,
  Package,
  ClipboardList,
  BarChart3,
  Shield,
  UserPlus,
  MessageSquare,
  FileText,
  Bot,
  Ticket,
  ThumbsUp,
  ChevronLeft,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  minRole: UserRole;
  requiredFeature?: 'whatsapp' | 'automation' | 'message_templates' | 'surveys' | 'coupons' | 'advanced_reports';
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard, minRole: 'viewer' },
  { href: '/customers', label: 'Müşteriler', icon: Users, minRole: 'viewer' },
  { href: '/devices', label: 'Cihazlar', icon: Wrench, minRole: 'technician' },
  { href: '/devices/filters', label: 'Filtre Takibi', icon: Filter, minRole: 'technician' },
  { href: '/inventory', label: 'Envanter', icon: Package, minRole: 'technician' },
  { href: '/technician', label: 'Servis Çağrıları', icon: ClipboardList, minRole: 'technician' },
  { href: '/manager', label: 'Yönetici Paneli', icon: BarChart3, minRole: 'manager' },
  { href: '/manager/services', label: 'Servis Kayıtları', icon: FileText, minRole: 'manager' },
  { href: '/reports', label: 'Raporlar', icon: BarChart3, minRole: 'manager' },
  { href: '/admin', label: 'Admin Paneli', icon: Shield, minRole: 'tenant_admin' },
  { href: '/admin/invite', label: 'Kullanıcı Davet Et', icon: UserPlus, minRole: 'tenant_admin' },
  { href: '/admin/whatsapp', label: 'WhatsApp Bağlantısı', icon: MessageSquare, minRole: 'tenant_admin', requiredFeature: 'whatsapp' },
  { href: '/admin/whatsapp/templates', label: 'Mesaj Şablonları', icon: FileText, minRole: 'tenant_admin', requiredFeature: 'message_templates' },
  { href: '/admin/automation', label: 'Otomasyon', icon: Bot, minRole: 'manager', requiredFeature: 'automation' },
  { href: '/admin/coupons', label: 'Kupon / İndirim', icon: Ticket, minRole: 'tenant_admin' },
  { href: '/admin/surveys', label: 'Anketler', icon: ThumbsUp, minRole: 'manager' },
];

interface SidebarNavProps {
  role: UserRole;
  plan: PlanType | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function SidebarNav({ role, plan, collapsed, onToggleCollapse }: SidebarNavProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter(
    (item) =>
      hasRole(role, item.minRole) &&
      (!item.requiredFeature || hasFeature(plan, item.requiredFeature)),
  );

  return (
    <nav className="flex-1 space-y-1 px-3 py-3 overflow-y-auto">
      {visibleItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              collapsed && 'justify-center px-2',
            )}
            title={collapsed ? item.label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );
      })}

      {/* Collapse toggle at bottom */}
      <button
        onClick={onToggleCollapse}
        className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      >
        <ChevronLeft className={cn('h-3.5 w-3.5 shrink-0 transition-transform', collapsed && 'rotate-180')} />
        {!collapsed && <span>Daralt</span>}
      </button>
    </nav>
  );
}
