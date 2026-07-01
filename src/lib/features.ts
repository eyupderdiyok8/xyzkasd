// ──────────────────────────────────────────────
// Water Purifier Service ERP — Feature Flags
// Multi-Tenant SaaS
//
// Plan-based feature gating for Starter / Professional.
// ──────────────────────────────────────────────

export type PlanType = 'STARTER' | 'PROFESSIONAL';

/**
 * Every feature in the system.
 * Add new features here as the product grows.
 */
export type FeatureFlag =
  | 'whatsapp'
  | 'automation'
  | 'message_templates'
  | 'surveys'
  | 'coupons'
  | 'advanced_reports';

/**
 * Which features are available on each plan.
 * STARTER = core CRM + service management only.
 * PROFESSIONAL = all features.
 */
export const PLAN_FEATURES: Record<PlanType, FeatureFlag[]> = {
  STARTER: ['surveys', 'coupons'],
  PROFESSIONAL: [
    'whatsapp',
    'automation',
    'message_templates',
    'surveys',
    'coupons',
    'advanced_reports',
  ],
};

/** Human-readable plan labels (Turkish) */
export const PLAN_LABELS: Record<PlanType, string> = {
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
};

/** Plan badge colors (Tailwind classes) */
export const PLAN_COLORS: Record<PlanType, string> = {
  STARTER: 'bg-gray-100 text-gray-800',
  PROFESSIONAL: 'bg-indigo-100 text-indigo-800',
};

/**
 * Check whether a given plan includes a feature.
 */
export function hasFeature(plan: PlanType | null | undefined, feature: FeatureFlag): boolean {
  if (!plan) return false;
  const features = PLAN_FEATURES[plan];
  if (!features) return false;
  return features.includes(feature);
}

/**
 * Return all features available on a plan.
 */
export function getPlanFeatures(plan: PlanType | null | undefined): FeatureFlag[] {
  if (!plan) return [];
  return PLAN_FEATURES[plan] ?? [];
}

/**
 * Routes / path prefixes that require a Professional plan.
 * Used by middleware and sidebar filtering.
 */
export const PROFESSIONAL_ONLY_ROUTES: Record<string, FeatureFlag> = {
  '/admin/whatsapp': 'whatsapp',
  '/api/whatsapp': 'whatsapp',
  '/api/automation': 'automation',
  '/api/message-templates': 'message_templates',
};

/**
 * Resolve the feature key required for a given pathname.
 */
export function getRequiredFeatureForPath(pathname: string): FeatureFlag | null {
  const sorted = Object.entries(PROFESSIONAL_ONLY_ROUTES).sort(
    (a, b) => b[0].length - a[0].length,
  );
  for (const [prefix, feature] of sorted) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return feature;
    }
  }
  return null;
}
