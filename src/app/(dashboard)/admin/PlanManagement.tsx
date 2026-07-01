'use client';

import { useState, useEffect, useCallback } from 'react';
import { PLAN_LABELS, PLAN_COLORS, PLAN_FEATURES, type PlanType, type FeatureFlag } from '@/lib/features';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: PlanType;
  planLabel: string;
}

const FEATURE_LABELS: Record<FeatureFlag, string> = {
  whatsapp: 'WhatsApp Bağlantısı',
  automation: 'Otomasyon Kuralları',
  message_templates: 'Mesaj Şablonları',
  surveys: 'Memnuniyet Anketleri',
  coupons: 'Kupon / İndirim Sistemi',
  advanced_reports: 'Gelişmiş Raporlar',
};

export default function PlanManagement() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/admin/plan');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Yüklenemedi');
      setTenant(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  async function handlePlanSwitch(newPlan: PlanType) {
    if (!tenant || tenant.plan === newPlan) return;

    const confirmMsg =
      newPlan === 'STARTER'
        ? 'Starter plana geçerseniz WhatsApp ve Otomasyon özellikleri gizlenir. Devam etmek istiyor musunuz?'
        : 'Professional plana geçmek istediğinize emin misiniz?';

    if (!window.confirm(confirmMsg)) return;

    setSwitching(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Plan değiştirilemedi');

      setTenant((prev) =>
        prev ? { ...prev, plan: newPlan, planLabel: PLAN_LABELS[newPlan] } : prev,
      );
      setSuccess(`Plan başarıyla "${PLAN_LABELS[newPlan]}" olarak değiştirildi.`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSwitching(false);
    }
  }

  if (loading) {
    return (
      <div className="mt-8 text-center text-sm text-gray-400">
        Plan bilgisi yükleniyor…
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="mt-8 text-center text-sm text-red-500">
        {error ?? 'Tenant bilgisi bulunamadı.'}
      </div>
    );
  }

  const plans: PlanType[] = ['STARTER', 'PROFESSIONAL'];

  return (
    <div className="mt-8 space-y-6">
      {/* Current Plan */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-foreground">Mevcut Plan</h2>
        <div className="mt-4 flex items-center gap-3">
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${PLAN_COLORS[tenant.plan]}`}
          >
            {tenant.planLabel}
          </span>
          <span className="text-sm text-gray-500">
            {tenant.name} ({tenant.slug})
          </span>
        </div>
      </div>

      {/* Plan Comparison */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-foreground">Plan Karşılaştırması</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {plans.map((plan) => {
            const features = PLAN_FEATURES[plan];
            const isCurrent = tenant.plan === plan;
            return (
              <div
                key={plan}
                className={`rounded-lg border p-5 ${
                  isCurrent
                    ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200'
                    : 'border-border bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{PLAN_LABELS[plan]}</h3>
                  {isCurrent && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      Aktif
                    </span>
                  )}
                </div>
                <ul className="mt-3 space-y-2">
                  {(Object.keys(FEATURE_LABELS) as FeatureFlag[]).map((feat) => {
                    const enabled = features.includes(feat);
                    return (
                      <li key={feat} className="flex items-center gap-2 text-sm">
                        <span
                          className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                            enabled
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          {enabled ? '✓' : '✗'}
                        </span>
                        <span className={enabled ? 'text-muted-foreground' : 'text-gray-400'}>
                          {FEATURE_LABELS[feat]}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {!isCurrent && (
                  <button
                    onClick={() => handlePlanSwitch(plan)}
                    disabled={switching}
                    className="mt-4 w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {switching
                      ? 'Değiştiriliyor…'
                      : `"${PLAN_LABELS[plan]}" Planına Geç`}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error / Success messages */}
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
