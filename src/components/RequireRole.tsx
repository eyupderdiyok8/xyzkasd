'use client';

import { useEffect, useState } from 'react';
import type { UserRole } from '@/lib/supabase/types';
import { hasRole } from '@/lib/roles';

interface RequireRoleProps {
  /** Minimum role required to see children */
  minimumRole: UserRole;
  /** Role to check against (if not provided, fetches from /api/auth/me) */
  userRole?: UserRole;
  /** Content to show when authorized */
  children: React.ReactNode;
  /** Optional fallback when unauthorized */
  fallback?: React.ReactNode;
}

/**
 * Client-side role guard component.
 * Shows `children` only if the user meets the minimum role requirement.
 * Optionally shows `fallback` when unauthorized.
 *
 * Usage:
 * ```tsx
 * <RequireRole minimumRole="manager">
 *   <DeleteButton />
 * </RequireRole>
 * ```
 */
export default function RequireRole({
  minimumRole,
  userRole: propRole,
  children,
  fallback = null,
}: RequireRoleProps) {
  const [role, setRole] = useState<UserRole | null>(propRole ?? null);
  const [loading, setLoading] = useState(!propRole);

  useEffect(() => {
    // If role was provided via props, skip fetching
    if (propRole) {
      setRole(propRole);
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function fetchRole() {
      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json();
        if (!cancelled && json.data?.role) {
          setRole(json.data.role);
        }
      } catch {
        // Silently fail — user is not authenticated
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRole();
    return () => { cancelled = true; };
  }, [propRole]);

  if (loading) return null;
  if (!role) return null;
  if (!hasRole(role, minimumRole)) return <>{fallback}</>;
  return <>{children}</>;
}
