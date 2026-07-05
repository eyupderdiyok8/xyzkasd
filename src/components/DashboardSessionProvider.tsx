'use client';

import { createContext, useContext } from 'react';
import type { MembershipType } from '@/lib/features';
import type { UserRole } from '@/lib/supabase/types';

interface DashboardSession {
  userId: string;
  role: UserRole;
  tenantId: string | null;
  effectiveTenantId: string | null;
  membershipType: MembershipType | null;
  membershipExpiresAt: string | null;
  fullName: string | null;
  email: string | null;
}

const DashboardSessionContext = createContext<DashboardSession | null>(null);

export function DashboardSessionProvider({
  value,
  children,
}: {
  value: DashboardSession;
  children: React.ReactNode;
}) {
  return (
    <DashboardSessionContext.Provider value={value}>
      {children}
    </DashboardSessionContext.Provider>
  );
}

export function useDashboardSession() {
  const value = useContext(DashboardSessionContext);
  if (!value) {
    throw new Error('useDashboardSession must be used inside DashboardSessionProvider');
  }
  return value;
}
