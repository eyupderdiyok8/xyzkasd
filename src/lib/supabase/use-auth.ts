'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from './client';
import type { UserRole, ProfileRow } from './types';
import { hasRole } from '@/lib/roles';

export interface AuthUser {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  tenantId: string | null;
  isActive: boolean;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  /** Kullanıcının belirtilen rolde (veya üstünde) olup olmadığını kontrol eder */
  can: (minimumRole: UserRole) => boolean;
  refresh: () => Promise<void>;
}

let cachedState: AuthUser | null = null;

/**
 * Client-side auth hook.
 * Fetches the current user profile from /api/auth/me on mount
 * and caches the result for subsequent calls within the same render tree.
 *
 * Usage:
 * ```tsx
 * const { user, loading, can } = useAuth();
 * if (loading) return <Spinner />;
 * if (!user) return redirect('/login');
 * if (can('manager')) return <DeleteButton />;
 * ```
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(cachedState);
  const [loading, setLoading] = useState(!cachedState);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/me');
      const json = await res.json();
      if (!res.ok || !json.data) {
        cachedState = null;
        setUser(null);
        return;
      }
      const profile: AuthUser = {
        id: json.data.id,
        email: json.data.email,
        fullName: json.data.fullName,
        role: json.data.role,
        tenantId: json.data.tenantId,
        isActive: json.data.isActive,
      };
      cachedState = profile;
      setUser(profile);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Kimlik doğrulanamadı');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Skip fetch if we already have cached state
    if (cachedState) {
      setUser(cachedState);
      setLoading(false);
      return;
    }
    fetchProfile();
  }, [fetchProfile]);

  const can = useCallback(
    (minimumRole: UserRole) => hasRole(user?.role ?? null, minimumRole),
    [user?.role],
  );

  return { user, loading, error, can, refresh: fetchProfile };
}

/**
 * Signs out the current user and redirects to login.
 * Use in client components that need a logout button.
 */
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = '/login';
}
