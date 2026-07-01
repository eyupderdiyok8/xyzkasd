// ──────────────────────────────────────────────
// Water Purifier Service ERP — Roles Tests
// Multi-Tenant SaaS
//
// Tests: Role hierarchy, hasRole, getMinimumRoleForPath.
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  hasRole,
  getMinimumRoleForPath,
  ROLE_HIERARCHY,
  ROLE_LABELS,
  ROLE_COLORS,
  ROUTE_GUARDS,
} from '../roles';
import type { UserRole } from '@/lib/supabase/types';

describe('ROLE_HIERARCHY', () => {
  it('viewer has lowest level (0)', () => {
    expect(ROLE_HIERARCHY.viewer).toBe(0);
  });

  it('super_admin has highest level (4)', () => {
    expect(ROLE_HIERARCHY.super_admin).toBe(4);
  });

  it('hierarchy is viewer < technician < manager < tenant_admin < super_admin', () => {
    expect(ROLE_HIERARCHY.viewer).toBeLessThan(ROLE_HIERARCHY.technician);
    expect(ROLE_HIERARCHY.technician).toBeLessThan(ROLE_HIERARCHY.manager);
    expect(ROLE_HIERARCHY.manager).toBeLessThan(ROLE_HIERARCHY.tenant_admin);
    expect(ROLE_HIERARCHY.tenant_admin).toBeLessThan(ROLE_HIERARCHY.super_admin);
  });
});

describe('ROLE_LABELS', () => {
  it('has labels for all roles', () => {
    const roles: UserRole[] = ['viewer', 'technician', 'manager', 'tenant_admin', 'super_admin'];
    for (const role of roles) {
      expect(ROLE_LABELS[role]).toBeDefined();
      expect(typeof ROLE_LABELS[role]).toBe('string');
    }
  });
});

describe('ROLE_COLORS', () => {
  it('has Tailwind color classes for all roles', () => {
    const roles: UserRole[] = ['viewer', 'technician', 'manager', 'tenant_admin', 'super_admin'];
    for (const role of roles) {
      expect(ROLE_COLORS[role]).toBeDefined();
      expect(ROLE_COLORS[role]).toMatch(/^bg-/);
    }
  });
});

// ─── hasRole ───────────────────────────────

describe('hasRole()', () => {
  it('technician meets minimum role of viewer', () => {
    expect(hasRole('technician', 'viewer')).toBe(true);
  });

  it('technician meets minimum role of technician', () => {
    expect(hasRole('technician', 'technician')).toBe(true);
  });

  it('technician does NOT meet minimum role of manager', () => {
    expect(hasRole('technician', 'manager')).toBe(false);
  });

  it('manager meets minimum role of technician', () => {
    expect(hasRole('manager', 'technician')).toBe(true);
  });

  it('super_admin meets all minimum roles', () => {
    const roles: UserRole[] = ['viewer', 'technician', 'manager', 'tenant_admin', 'super_admin'];
    for (const role of roles) {
      expect(hasRole('super_admin', role)).toBe(true);
    }
  });

  it('returns false for null userRole', () => {
    expect(hasRole(null, 'viewer')).toBe(false);
  });

  it('returns false for undefined userRole', () => {
    expect(hasRole(undefined, 'viewer')).toBe(false);
  });

  it('viewer does NOT meet minimum role of technician', () => {
    expect(hasRole('viewer', 'technician')).toBe(false);
  });

  it('tenant_admin meets minimum role of manager', () => {
    expect(hasRole('tenant_admin', 'manager')).toBe(true);
  });
});

// ─── ROUTE_GUARDS ──────────────────────────

describe('ROUTE_GUARDS', () => {
  it('/admin requires tenant_admin', () => {
    expect(ROUTE_GUARDS['/admin']).toBe('tenant_admin');
  });

  it('/technician requires technician', () => {
    expect(ROUTE_GUARDS['/technician']).toBe('technician');
  });

  it('/dashboard requires viewer', () => {
    expect(ROUTE_GUARDS['/dashboard']).toBe('viewer');
  });

  it('/admin/invite requires tenant_admin', () => {
    expect(ROUTE_GUARDS['/admin/invite']).toBe('tenant_admin');
  });

  it('/admin/whatsapp requires tenant_admin', () => {
    expect(ROUTE_GUARDS['/admin/whatsapp']).toBe('tenant_admin');
  });

  it('/customers requires viewer', () => {
    expect(ROUTE_GUARDS['/customers']).toBe('viewer');
  });

  it('/customers/new requires technician', () => {
    expect(ROUTE_GUARDS['/customers/new']).toBe('technician');
  });

  it('/devices requires technician', () => {
    expect(ROUTE_GUARDS['/devices']).toBe('technician');
  });

  it('/inventory requires technician', () => {
    expect(ROUTE_GUARDS['/inventory']).toBe('technician');
  });

  it('/reports requires manager', () => {
    expect(ROUTE_GUARDS['/reports']).toBe('manager');
  });

  it('/manager requires manager', () => {
    expect(ROUTE_GUARDS['/manager']).toBe('manager');
  });

  it('/register requires viewer', () => {
    expect(ROUTE_GUARDS['/register']).toBe('viewer');
  });
});

// ─── getMinimumRoleForPath ─────────────────

describe('getMinimumRoleForPath()', () => {
  it('returns tenant_admin for /admin', () => {
    expect(getMinimumRoleForPath('/admin')).toBe('tenant_admin');
  });

  it('returns tenant_admin for /admin/whatsapp', () => {
    expect(getMinimumRoleForPath('/admin/whatsapp')).toBe('tenant_admin');
  });

  it('returns tenant_admin for /admin/whatsapp/templates', () => {
    expect(getMinimumRoleForPath('/admin/whatsapp/templates')).toBe('tenant_admin');
  });

  it('returns technician for /devices', () => {
    expect(getMinimumRoleForPath('/devices')).toBe('technician');
  });

  it('returns technician for /devices/filters', () => {
    expect(getMinimumRoleForPath('/devices/filters')).toBe('technician');
  });

  it('returns technician for /devices/new', () => {
    expect(getMinimumRoleForPath('/devices/new')).toBe('technician');
  });

  it('returns viewer for /dashboard', () => {
    expect(getMinimumRoleForPath('/dashboard')).toBe('viewer');
  });

  it('returns manager for /reports', () => {
    expect(getMinimumRoleForPath('/reports')).toBe('manager');
  });

  it('returns manager for /reports/monthly', () => {
    expect(getMinimumRoleForPath('/reports/monthly')).toBe('manager');
  });

  it('returns manager for /manager', () => {
    expect(getMinimumRoleForPath('/manager')).toBe('manager');
  });

  it('returns manager for /manager/services', () => {
    expect(getMinimumRoleForPath('/manager/services')).toBe('manager');
  });

  it('returns null for unregistered paths', () => {
    expect(getMinimumRoleForPath('/api/customers')).toBeNull();
    expect(getMinimumRoleForPath('/login')).toBeNull();
    expect(getMinimumRoleForPath('/public/device')).toBeNull();
  });

  it('returns null for root path', () => {
    expect(getMinimumRoleForPath('/')).toBeNull();
  });

  it('longest prefix match wins', () => {
    // /admin/whatsapp/templates should match /admin/whatsapp
    expect(getMinimumRoleForPath('/admin/whatsapp/templates')).toBe('tenant_admin');
  });

  it('exact match returns correct role', () => {
    expect(getMinimumRoleForPath('/customers')).toBe('viewer');
    expect(getMinimumRoleForPath('/customers/new')).toBe('technician');
  });
});
