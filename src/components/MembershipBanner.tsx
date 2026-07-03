'use client';

import { useEffect, useState } from 'react';
import { getMembershipStatus, GRACE_PERIOD_DAYS, FOUNDER_BADGE, type MembershipStatus } from '@/lib/features';
import { AlertTriangle, Clock, Star, X } from 'lucide-react';

interface Props {
  membershipType: string | null;
  expiresAt: string | null;
}

export default function MembershipBanner({ membershipType, expiresAt }: Props) {
  const [dismissed, setDismissed] = useState(false);

  if (!membershipType || dismissed) return null;

  const status = getMembershipStatus(membershipType as any, expiresAt);

  if (status === 'FOUNDER' || status === 'ACTIVE') return null;

  // Grace period uyarısı
  if (status === 'GRACE') {
    const remainingGraceDays = expiresAt
      ? Math.ceil((new Date(expiresAt).getTime() + GRACE_PERIOD_DAYS * 86400000 - Date.now()) / 86400000)
      : 0;

    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-orange-300 bg-orange-50 px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-orange-600" />
          <span className="text-orange-800">
            <strong>Üyeliğiniz sona erdi.</strong>{' '}
            {remainingGraceDays > 0
              ? `Yenilemek için ${remainingGraceDays} gününüz kaldı. Bu sürede tüm özellikleri kullanmaya devam edebilirsiniz.`
              : 'Bugün son gününüz! Yarın bazı özellikler kısıtlanacak.'}
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-1 text-orange-400 hover:bg-orange-100 hover:text-orange-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // EXPIRED — tamamen doldu
  if (status === 'EXPIRED') {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
          <span className="text-red-800">
            <strong>Üyelik süreniz doldu.</strong>{' '}
            Sistem özelliklerine erişiminiz kısıtlandı. Üyeliğinizi yenilemek için yöneticinizle iletişime geçin.
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded p-1 text-red-400 hover:bg-red-100 hover:text-red-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return null;
}
