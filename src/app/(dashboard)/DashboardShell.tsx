'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import ErrorBoundary from '@/components/ErrorBoundary';
import { hasRole } from '@/lib/roles';
import { hasFeature, type PlanType } from '@/lib/features';
import type { UserRole } from '@/lib/supabase/types';
import {
  LayoutDashboard, Users, Wrench, Filter, Package, ClipboardList,
  BarChart3, Shield, UserPlus, MessageSquare, FileText, Bot,
  Ticket, ThumbsUp, ChevronLeft, LogOut, Droplets,
  Menu, X, Home, Settings,
} from 'lucide-react';
import TenantSwitcher from '@/components/TenantSwitcher';
import SidebarNav from './SidebarNav';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  minRole: UserRole;
  requiredFeature?: 'whatsapp' | 'automation' | 'message_templates' | 'surveys' | 'coupons' | 'advanced_reports';
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Gösterge Paneli', icon: LayoutDashboard, minRole: 'viewer' },
  { href: '/hizli-servis', label: '⚡ Hızlı Servis', icon: ClipboardList, minRole: 'technician' },
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
  { href: '/admin/whatsapp', label: 'WhatsApp', icon: MessageSquare, minRole: 'tenant_admin', requiredFeature: 'whatsapp' },
  { href: '/admin/whatsapp/templates', label: 'Mesaj Şablonları', icon: FileText, minRole: 'tenant_admin', requiredFeature: 'message_templates' },
  { href: '/admin/automation', label: 'Otomasyon', icon: Bot, minRole: 'manager', requiredFeature: 'automation' },
  { href: '/admin/coupons', label: 'Kupon / İndirim', icon: Ticket, minRole: 'tenant_admin' },
  { href: '/admin/surveys', label: 'Anketler', icon: ThumbsUp, minRole: 'manager' },
];

/** Primary tabs shown in bottom bar (max 5) */
const BOTTOM_TABS: Array<{ href: string; label: string; icon: React.ElementType }> = [
  { href: '/dashboard', label: 'Panel', icon: Home },
  { href: '/technician', label: 'Servis', icon: ClipboardList },
  { href: '/customers', label: 'Müşteri', icon: Users },
  { href: '/devices', label: 'Cihaz', icon: Wrench },
];

interface DashboardShellProps {
  children: React.ReactNode;
  role: UserRole;
  plan: PlanType;
  fullName: string | null;
  email: string | null;
}

export default function DashboardShell({ children, role, plan, fullName, email }: DashboardShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => hasRole(role, item.minRole) && (!item.requiredFeature || hasFeature(plan, item.requiredFeature)),
  );

  // ── Desktop Sidebar (md+) ──────────────────
  const sidebar = (
    <aside className={cn(
      'hidden md:flex flex-col border-r border-border bg-white transition-all duration-200 shrink-0',
      collapsed ? 'w-[64px]' : 'w-60',
    )}>
      {/* Logo */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Droplets className="h-4 w-4 text-white" />
        </div>
        {!collapsed && <span className="text-sm font-bold text-slate-900">suaritmaservisyazilimi.com.tr</span>}
      </div>

      {/* Tenant Switcher (super_admin only) */}
      <div className={cn('px-3 py-2 border-b border-border', collapsed && 'flex justify-center')}>
        <TenantSwitcher />
      </div>

      {/* Nav */}
      <SidebarNav role={role} plan={plan} collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />

      {/* User + Collapse */}
      <div className="border-t border-border p-2 space-y-1">
        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <Settings className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && 'Hesap Ayarları'}
        </Link>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft className={cn('h-3.5 w-3.5 shrink-0 transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && 'Daralt'}
        </button>

        {!collapsed && (
          <div className="px-3 py-1">
            <p className="truncate text-xs font-medium text-slate-700">{fullName ?? email}</p>
            <p className="text-[10px] text-slate-400">{role === 'super_admin' ? 'Süper Admin' : role === 'tenant_admin' ? 'Firma Admin' : role}</p>
          </div>
        )}

        <a
          href="/auth/logout"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && 'Çıkış'}
        </a>
      </div>
    </aside>
  );

  // ── Mobile Bottom Tab Bar ──────────────────
  const bottomBar = (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-border safe-bottom">
      <div className="flex items-center justify-around h-14 px-1">
        {BOTTOM_TABS.map((tab) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full tap-44 transition-colors',
                isActive ? 'text-primary' : 'text-slate-400',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium leading-none">{tab.label}</span>
            </Link>
          );
        })}
        {/* More / Menu button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full tap-44 text-slate-400"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-medium leading-none">Daha</span>
        </button>
      </div>
    </nav>
  );

  // ── Mobile Full Menu Overlay ───────────────
  const mobileMenu = mobileMenuOpen && (
    <div className="md:hidden fixed inset-0 z-[60] animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl safe-bottom animate-fade-up max-h-[70vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div>
            <p className="text-sm font-semibold text-slate-900">{fullName ?? email}</p>
            <p className="text-xs text-slate-400">{role === 'super_admin' ? 'Süper Admin' : role === 'tenant_admin' ? 'Firma Admin' : role}</p>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 tap-44">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* Nav items */}
        <div className="px-3 py-2 space-y-0.5">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors tap-44',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <hr className="my-2 border-border" />

          {/* Logout */}
          <a
            href="/auth/logout"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors tap-44"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            <span>Çıkış Yap</span>
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {sidebar}

      {/* Main */}
      <main className="flex-1 overflow-auto bg-slate-50 pb-16 md:pb-0">
        <ErrorBoundary>
          <div className="animate-slide-in p-4 md:p-6 lg:p-8" key={pathname}>
            {children}
          </div>
        </ErrorBoundary>
      </main>

      {bottomBar}
      {mobileMenu}
    </div>
  );
}
