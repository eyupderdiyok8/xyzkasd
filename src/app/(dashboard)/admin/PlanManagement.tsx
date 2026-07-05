'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  MEMBERSHIP_LABELS,
  MEMBERSHIP_COLORS,
  FOUNDER_BADGE,
  isMembershipActive,
  getRemainingDays,
  formatRemainingDays,
  type MembershipType,
} from '@/lib/features';
import { Star, Clock, Shield, AlertTriangle } from 'lucide-react';
import { cachedJson } from '@/lib/client-api-cache';

interface TenantMembership {
  id: string;
  name: string;
  slug: string;
  membershipType: MembershipType;
  membershipLabel: string;
  membershipExpiresAt: string | null;
  isActive: boolean;
  remainingDays: number;
  remainingLabel: string;
}

const MEMBERSHIP_OPTIONS: MembershipType[] = ['MONTHLY', 'YEARLY', 'FOUNDER'];

interface PlanManagementProps {
  /** Sunucu tarafında zaten alınmışsa prop'tan gelir, fetch yapılmaz. */
  tenantId?: string | null;
  tenantName?: string;
  tenantSlug?: string;
  membershipType?: MembershipType | null;
  membershipLabel?: string;
  membershipExpiresAt?: string | null;
  isActive?: boolean;
  remainingLabel?: string;
}

export default function PlanManagement(props: PlanManagementProps = {}) {
  const hasServerData = props.tenantId !== undefined;

  const [tenant, setTenant] = useState<TenantMembership | null>(() => {
    if (hasServerData && props.tenantId) {
      return {
        id: props.tenantId,
        name: props.tenantName ?? '',
        slug: props.tenantSlug ?? '',
        membershipType: (props.membershipType ?? 'MONTHLY') as MembershipType,
        membershipLabel: props.membershipLabel ?? 'Aylık',
        membershipExpiresAt: props.membershipExpiresAt ?? null,
        isActive: props.isActive ?? false,
        remainingDays: -1,
        remainingLabel: props.remainingLabel ?? '',
      };
    }
    return null;
  });
  const [loading, setLoading] = useState(!hasServerData);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(
    hasServerData && !props.tenantId ? 'Kullanıcı hesabınız henüz bir firmaya bağlanmamış.' : null,
  );

  const fetchPlan = useCallback(async () => {
    try {
      setError(null);
      setEmptyMessage(null);
      const json = await cachedJson<{ data?: TenantMembership | null; meta?: { message?: string }; error?: { message?: string } }>('/api/admin/plan');
      if (json.error) throw new Error(json.error.message ?? 'Yüklenemedi');
      if (!json.data) {
        setTenant(null);
        setEmptyMessage(json.meta?.message ?? null);
        setLoading(false);
        return;
      }
      setTenant(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasServerData) fetchPlan();
  }, [fetchPlan, hasServerData]);

  if (loading) {
    return (
      <div className="mt-8 text-center text-sm text-gray-400">
        Üyelik bilgisi yükleniyor…
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm font-medium text-amber-800">
          {error
            ? error
            : emptyMessage ?? 'Kullanıcı hesabınız henüz bir firmaya bağlanmamış. Üyelik bilgilerinizi görüntülemek için süper admin\'in sizi bir firmaya ataması gerekiyor.'}
        </p>
      </div>
    );
  }

  const isActive = tenant.isActive;
  const isFounder = tenant.membershipType === 'FOUNDER';
  const statusIcon = isFounder
    ? <Star className="h-5 w-5 text-amber-500" />
    : isActive
      ? <Clock className="h-5 w-5 text-green-500" />
      : <AlertTriangle className="h-5 w-5 text-red-500" />;

  return (
    <div className="mt-8 space-y-6">
      {/* Current Membership Status */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-foreground">Üyelik Durumu</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                isActive
                  ? (MEMBERSHIP_COLORS[tenant.membershipType] ?? 'bg-gray-100 text-gray-800')
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {isFounder && <span>{FOUNDER_BADGE}</span>}
              {tenant.membershipLabel}
            </span>
            {statusIcon}
            <span className={`text-sm font-medium ${isActive ? 'text-green-600' : 'text-red-600'}`}>
              {isActive ? 'Aktif' : 'Süresi Dolmuş'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>{tenant.name} ({tenant.slug})</span>
          </div>

          {!isFounder && (
            <div className="rounded-md bg-blue-50 p-3 border border-blue-100">
              <p className="text-sm font-medium text-blue-800">
                {tenant.remainingLabel}
              </p>
              {tenant.membershipExpiresAt && (
                <p className="mt-1 text-xs text-blue-600">
                  Bitiş tarihi: {new Date(tenant.membershipExpiresAt).toLocaleDateString('tr-TR')}
                </p>
              )}
            </div>
          )}

          {isFounder && (
            <div className="rounded-md bg-amber-50 p-3 border border-amber-100">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-medium text-amber-800">
                  Kurucu Üye — Sınırsız erişim
                </p>
              </div>
              <p className="mt-1 text-xs text-amber-600">
                Tüm özellikler süresiz olarak kullanılabilir.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Feature Availability */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-foreground">Mevcut Özellikler</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {isActive
            ? 'Üyeliğiniz aktif olduğu sürece tüm özellikler kullanılabilir.'
            : 'Üyeliğiniz sona erdiği için özelliklere erişim kısıtlanmıştır. Yöneticinizle iletişime geçin.'}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {[
            { label: 'WhatsApp Bağlantısı', icon: '💬' },
            { label: 'Otomasyon Kuralları', icon: '🤖' },
            { label: 'Mesaj Şablonları', icon: '📝' },
            { label: 'Memnuniyet Anketleri', icon: '👍' },
            { label: 'Kupon / İndirim Sistemi', icon: '🎫' },
            { label: 'Gelişmiş Raporlar', icon: '📊' },
          ].map(feat => (
            <div
              key={feat.label}
              className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                isActive
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-100 bg-red-50 text-red-400'
              }`}
            >
              <span>{feat.icon}</span>
              <span>{feat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Membership Types Info */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-foreground">Üyelik Tipleri</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {MEMBERSHIP_OPTIONS.map(type => {
            const colors = MEMBERSHIP_COLORS[type] ?? 'bg-gray-100 text-gray-800';
            const isCurrent = tenant.membershipType === type;
            return (
              <div
                key={type}
                className={`rounded-lg border p-4 ${
                  isCurrent ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">
                    {type === 'FOUNDER' ? `${FOUNDER_BADGE} ` : ''}
                    {MEMBERSHIP_LABELS[type]}
                  </h3>
                  {isCurrent && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      Mevcut
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {type === 'MONTHLY' && '30 günlük abonelik. Tüm özellikler dahil.'}
                  {type === 'YEARLY' && '365 günlük abonelik. Tüm özellikler dahil.'}
                  {type === 'FOUNDER' && 'Sınırsız süre. Özel kurucu rozeti.'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-700 border border-green-200">
          {success}
        </div>
      )}
    </div>
  );
}
