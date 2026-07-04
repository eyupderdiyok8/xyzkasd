import type { UserRole } from './supabase/types';

/**
 * Role hierarchy: higher index = more privileges.
 * super_admin > tenant_admin > manager > technician > viewer
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 0,
  technician: 1,
  manager: 2,
  tenant_admin: 3,
  super_admin: 4,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  viewer: 'Çalışan',
  technician: 'Teknisyen',
  manager: 'Yönetici',
  tenant_admin: 'Firma Sahibi',
  super_admin: 'Süper Admin',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  viewer: 'bg-gray-100 text-gray-800',
  technician: 'bg-blue-100 text-blue-800',
  manager: 'bg-green-100 text-green-800',
  tenant_admin: 'bg-purple-100 text-purple-800',
  super_admin: 'bg-red-100 text-red-800',
};

/**
 * Check if a user's role meets the minimum required level.
 */
export function hasRole(userRole: UserRole | null | undefined, minimumRole: UserRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

/**
 * Middleware-compatible route guard rules.
 * Map route prefixes to minimum roles.
 */
export const ROUTE_GUARDS: Record<string, UserRole> = {
  '/admin': 'tenant_admin',
  '/admin/invite': 'tenant_admin',
  '/admin/whatsapp': 'tenant_admin',
  '/admin/whatsapp/templates': 'tenant_admin',
  '/admin/coupons': 'tenant_admin',
  '/admin/surveys': 'manager',
  '/manager': 'manager',
  '/reports': 'manager',
  '/technician': 'technician',
  '/devices': 'technician',
  '/devices/filters': 'technician',
  '/inventory': 'technician',
  '/devices/new': 'technician',
  '/hizli-servis': 'manager',
  '/customers': 'viewer',
  '/customers/new': 'technician',
  '/dashboard': 'viewer',
  '/register': 'viewer',
};

/**
 * Resolve the minimum role required for a given pathname.
 */
export function getMinimumRoleForPath(pathname: string): UserRole | null {
  // Exact match first, then prefix
  const sorted = Object.entries(ROUTE_GUARDS).sort((a, b) => b[0].length - a[0].length);
  for (const [prefix, role] of sorted) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return role;
    }
  }
  return null;
}
