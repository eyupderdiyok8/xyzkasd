// ──────────────────────────────────────────────
// Water Purifier Service ERP — Membership & Feature Flags
// Multi-Tenant SaaS
//
// Üyelik tipleri:
//   MONTHLY — 1 aylık abonelik
//   YEARLY  — yıllık abonelik
//   FOUNDER — kurucu üye (sınırsız, badge'li)
//
// Tüm üyelik tipleri tüm özelliklere erişebilir.
// Kısıtlama: membershipExpiresAt geçmişse erişim kesilir.
// FOUNDER üyelerin membershipExpiresAt = null (hiç bitmez).
// ──────────────────────────────────────────────

export type MembershipType = 'MONTHLY' | 'YEARLY' | 'FOUNDER';

/**
 * Her özellik tüm üyelik tiplerinde mevcuttur.
 * Kısıtlama sadece süre bazlıdır (expiry).
 */
export type FeatureFlag =
  | 'whatsapp'
  | 'automation'
  | 'message_templates'
  | 'surveys'
  | 'coupons'
  | 'advanced_reports';

/** İnsan tarafından okunabilir üyelik etiketleri (Türkçe) */
export const MEMBERSHIP_LABELS: Record<MembershipType, string> = {
  MONTHLY: 'Aylık',
  YEARLY: 'Yıllık',
  FOUNDER: 'Kurucu',
};

/** Üyelik badge renkleri (Tailwind) */
export const MEMBERSHIP_COLORS: Record<MembershipType, string> = {
  MONTHLY: 'bg-blue-100 text-blue-800',
  YEARLY: 'bg-green-100 text-green-800',
  FOUNDER: 'bg-amber-100 text-amber-800',
};

/** Süresi dolmuş badge rengi */
export const EXPIRED_COLORS = 'bg-red-100 text-red-800';

/** Grace period badge rengi */
export const GRACE_COLORS = 'bg-orange-100 text-orange-800';

/** FOUNDER özel badge ikonu */
export const FOUNDER_BADGE = '⭐';

/** Üyelik bitiminden sonra tanınan ek süre (gün) */
export const GRACE_PERIOD_DAYS = 7;

export type MembershipStatus = 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'FOUNDER';

/**
 * Üyeliğin detaylı durumunu döndürür.
 * - FOUNDER → her zaman ACTIVE
 * - Süresi dolmamış → ACTIVE
 * - Süresi dolmuş ama grace period içinde → GRACE
 * - Grace period da dolmuş → EXPIRED
 */
export function getMembershipStatus(
  membershipType: MembershipType | null | undefined,
  expiresAt: Date | string | null | undefined,
): MembershipStatus {
  if (!membershipType) return 'EXPIRED';
  if (membershipType === 'FOUNDER') return 'FOUNDER';
  if (!expiresAt) return 'EXPIRED';

  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const now = new Date();

  if (expiry > now) return 'ACTIVE';

  // Grace period: expiry + 7 gün
  const graceEnd = new Date(expiry.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
  if (now <= graceEnd) return 'GRACE';

  return 'EXPIRED';
}

/**
 * Üyeliğin aktif olup olmadığını kontrol eder.
 * GRACE period'da da aktif sayılır (tam erişim).
 * Sadece EXPIRED durumunda false döner.
 */
export function isMembershipActive(
  membershipType: MembershipType | null | undefined,
  expiresAt: Date | string | null | undefined,
): boolean {
  const status = getMembershipStatus(membershipType, expiresAt);
  return status !== 'EXPIRED';
}

/**
 * Kalan gün sayısını hesapla.
 * FOUNDER → Infinity (sınırsız)
 * null/undefined expiresAt → -1 (atanmamış)
 * Süresi dolmuş → 0
 */
export function getRemainingDays(expiresAt: Date | string | null | undefined): number {
  if (!expiresAt) return -1;
  const expiry = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const diff = expiry.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Kalan günü insan tarafından okunabilir formatta göster.
 */
export function formatRemainingDays(days: number): string {
  if (days === -1) return 'Bitiş tarihi atanmamış';
  if (days === Infinity) return 'Sınırsız (Kurucu Üye)';
  if (days <= 0) return 'Süresi dolmuş';
  if (days === 1) return '1 gün kaldı';
  if (days <= 30) return `${days} gün kaldı`;
  const months = Math.floor(days / 30);
  if (months === 1) return '1 ay kaldı';
  if (months < 12) return `${months} ay kaldı`;
  const years = Math.floor(days / 365);
  return `${years} yıl kaldı`;
}

/**
 * Belirli bir feature'ın kullanılabilir olup olmadığını kontrol eder.
 * Aktif üyelik varsa tüm feature'lar açık.
 */
export function hasFeature(
  membershipType: MembershipType | null | undefined,
  expiresAt: Date | string | null | undefined,
  _feature: FeatureFlag,
): boolean {
  return isMembershipActive(membershipType, expiresAt);
}

/**
 * Route → FeatureFlag eşleştirmesi.
 * Professional-only rotalar hâlâ var, ama kontrol üyelik expiry'sine bağlı.
 */
export const FEATURE_ROUTES: Record<string, FeatureFlag> = {
  '/admin/whatsapp': 'whatsapp',
  '/api/whatsapp': 'whatsapp',
  '/api/automation': 'automation',
  '/api/message-templates': 'message_templates',
};

/**
 * Bir pathname için gerekli feature'ı döndür.
 */
export function getRequiredFeatureForPath(pathname: string): FeatureFlag | null {
  const sorted = Object.entries(FEATURE_ROUTES).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [prefix, feature] of sorted) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return feature;
    }
  }
  return null;
}

// ─── Backward compatibility (kademeli geçiş için) ───

/** @deprecated MembershipType kullanın */
export type PlanType = MembershipType;

/** @deprecated isMembershipActive kullanın */
export const PLAN_FEATURES: Record<MembershipType, FeatureFlag[]> = {
  MONTHLY: ['whatsapp', 'automation', 'message_templates', 'surveys', 'coupons', 'advanced_reports'],
  YEARLY: ['whatsapp', 'automation', 'message_templates', 'surveys', 'coupons', 'advanced_reports'],
  FOUNDER: ['whatsapp', 'automation', 'message_templates', 'surveys', 'coupons', 'advanced_reports'],
};

/** @deprecated MEMBERSHIP_LABELS kullanın */
export const PLAN_LABELS = MEMBERSHIP_LABELS;

/** @deprecated MEMBERSHIP_COLORS kullanın */
export const PLAN_COLORS = MEMBERSHIP_COLORS;

/** @deprecated getPlanFeatures yerine tüm feature'lar her zaman mevcut */
export function getPlanFeatures(_plan: MembershipType | null | undefined): FeatureFlag[] {
  if (!_plan) return [];
  return ['whatsapp', 'automation', 'message_templates', 'surveys', 'coupons', 'advanced_reports'];
}

/** @deprecated FEATURE_ROUTES kullanın */
export const PROFESSIONAL_ONLY_ROUTES = FEATURE_ROUTES;
