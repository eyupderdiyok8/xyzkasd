// ──────────────────────────────────────────────
// Water Purifier Service ERP — Membership Feature Tests
// Multi-Tenant SaaS
//
// Tests membership-based feature gating.
// All membership types have all features; only expiry matters.
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  isMembershipActive,
  getMembershipStatus,
  hasFeature,
  getRemainingDays,
  formatRemainingDays,
  GRACE_PERIOD_DAYS,
  getPlanFeatures,
  PLAN_FEATURES,
  getRequiredFeatureForPath,
  FEATURE_ROUTES,
  type MembershipType,
  type FeatureFlag,
} from '../features';

describe('Membership — isMembershipActive', () => {
  it('FOUNDER is always active (no expiry)', () => {
    expect(isMembershipActive('FOUNDER', null)).toBe(true);
    expect(isMembershipActive('FOUNDER', '2020-01-01')).toBe(true);
  });

  it('MONTHLY with future expiry is active', () => {
    const future = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(isMembershipActive('MONTHLY', future)).toBe(true);
  });

  it('YEARLY with future expiry is active', () => {
    const future = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000).toISOString();
    expect(isMembershipActive('YEARLY', future)).toBe(true);
  });

  it('MONTHLY with past expiry is NOT active', () => {
    const past = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    expect(isMembershipActive('MONTHLY', past)).toBe(false);
  });

  it('YEARLY with past expiry is NOT active', () => {
    const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(isMembershipActive('YEARLY', past)).toBe(false);
  });

  it('MONTHLY within grace period IS active', () => {
    const recentlyExpired = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(isMembershipActive('MONTHLY', recentlyExpired)).toBe(true);
  });

  it('null/undefined membership returns false', () => {
    expect(isMembershipActive(null, null)).toBe(false);
    expect(isMembershipActive(undefined, null)).toBe(false);
  });

  it('MONTHLY/YEARLY with null expiry returns false', () => {
    expect(isMembershipActive('MONTHLY', null)).toBe(false);
    expect(isMembershipActive('YEARLY', null)).toBe(false);
  });
});

describe('hasFeature() — membership-based', () => {
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const expiredPast = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

  it('all features are available when membership is active', () => {
    expect(hasFeature('MONTHLY', future, 'whatsapp')).toBe(true);
    expect(hasFeature('MONTHLY', future, 'automation')).toBe(true);
    expect(hasFeature('MONTHLY', future, 'message_templates')).toBe(true);
    expect(hasFeature('MONTHLY', future, 'surveys')).toBe(true);
    expect(hasFeature('MONTHLY', future, 'coupons')).toBe(true);
    expect(hasFeature('MONTHLY', future, 'advanced_reports')).toBe(true);
  });

  it('features available during grace period', () => {
    const inGrace = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(hasFeature('MONTHLY', inGrace, 'whatsapp')).toBe(true);
  });

  it('no features are available when fully expired (past grace)', () => {
    expect(hasFeature('MONTHLY', expiredPast, 'whatsapp')).toBe(false);
    expect(hasFeature('YEARLY', expiredPast, 'surveys')).toBe(false);
  });

  it('FOUNDER always has all features', () => {
    expect(hasFeature('FOUNDER', null, 'whatsapp')).toBe(true);
    expect(hasFeature('FOUNDER', null, 'automation')).toBe(true);
    expect(hasFeature('FOUNDER', null, 'surveys')).toBe(true);
  });

  it('null/undefined membership returns false for all features', () => {
    expect(hasFeature(null, null, 'whatsapp')).toBe(false);
    expect(hasFeature(undefined, null, 'surveys')).toBe(false);
  });
});

describe('getMembershipStatus — grace period', () => {
  it('returns FOUNDER for founder type', () => {
    expect(getMembershipStatus('FOUNDER', null)).toBe('FOUNDER');
    expect(getMembershipStatus('FOUNDER', '2020-01-01')).toBe('FOUNDER');
  });

  it('returns ACTIVE when not yet expired', () => {
    const future = new Date(Date.now() + 30 * 86400000).toISOString();
    expect(getMembershipStatus('MONTHLY', future)).toBe('ACTIVE');
    expect(getMembershipStatus('YEARLY', future)).toBe('ACTIVE');
  });

  it('returns GRACE within 7 days after expiry', () => {
    const justExpired = new Date(Date.now() - 1 * 86400000).toISOString();
    expect(getMembershipStatus('MONTHLY', justExpired)).toBe('GRACE');

    const fiveDaysExpired = new Date(Date.now() - 5 * 86400000).toISOString();
    expect(getMembershipStatus('YEARLY', fiveDaysExpired)).toBe('GRACE');
  });

  it('returns EXPIRED after grace period', () => {
    const oldExpired = new Date(Date.now() - 10 * 86400000).toISOString();
    expect(getMembershipStatus('MONTHLY', oldExpired)).toBe('EXPIRED');
    expect(getMembershipStatus('YEARLY', oldExpired)).toBe('EXPIRED');
  });

  it('returns EXPIRED for null/undefined membership', () => {
    expect(getMembershipStatus(null, null)).toBe('EXPIRED');
    expect(getMembershipStatus(undefined, null)).toBe('EXPIRED');
  });

  it('returns EXPIRED for MONTHLY/YEARLY with null expiry', () => {
    expect(getMembershipStatus('MONTHLY', null)).toBe('EXPIRED');
    expect(getMembershipStatus('YEARLY', null)).toBe('EXPIRED');
  });
});

describe('getRemainingDays', () => {
  it('returns -1 for null expiry (not set)', () => {
    expect(getRemainingDays(null)).toBe(-1);
  });

  it('returns positive days for future expiry', () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const days = getRemainingDays(future);
    expect(days).toBeGreaterThanOrEqual(4);
    expect(days).toBeLessThanOrEqual(6);
  });

  it('returns 0 for past expiry', () => {
    const past = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(getRemainingDays(past)).toBe(0);
  });
});

describe('formatRemainingDays', () => {
  it('shows "Bitiş tarihi atanmamış" for -1', () => {
    expect(formatRemainingDays(-1)).toContain('atanmamış');
  });

  it('shows "Sınırsız" for Infinity', () => {
    expect(formatRemainingDays(Infinity)).toContain('Sınırsız');
  });

  it('shows "Süresi dolmuş" for 0', () => {
    expect(formatRemainingDays(0)).toBe('Süresi dolmuş');
  });

  it('shows days for less than 30 days', () => {
    expect(formatRemainingDays(15)).toContain('gün');
  });

  it('shows months for 30+ days', () => {
    expect(formatRemainingDays(60)).toContain('ay');
  });
});

describe('getPlanFeatures() — backward compatibility', () => {
  it('all plans return all features', () => {
    const all: FeatureFlag[] = ['whatsapp', 'automation', 'message_templates', 'surveys', 'coupons', 'advanced_reports'];
    expect(getPlanFeatures('MONTHLY')).toEqual(all);
    expect(getPlanFeatures('YEARLY')).toEqual(all);
    expect(getPlanFeatures('FOUNDER')).toEqual(all);
  });

  it('returns empty array for null/undefined', () => {
    expect(getPlanFeatures(null)).toEqual([]);
    expect(getPlanFeatures(undefined)).toEqual([]);
  });
});

describe('PLAN_FEATURES — backward compatibility', () => {
  it('all membership types have all 6 features', () => {
    expect(PLAN_FEATURES.MONTHLY).toHaveLength(6);
    expect(PLAN_FEATURES.YEARLY).toHaveLength(6);
    expect(PLAN_FEATURES.FOUNDER).toHaveLength(6);
  });
});

describe('FEATURE_ROUTES', () => {
  it('maps /admin/whatsapp to whatsapp feature', () => {
    expect(FEATURE_ROUTES['/admin/whatsapp']).toBe('whatsapp');
  });

  it('maps /api/whatsapp to whatsapp feature', () => {
    expect(FEATURE_ROUTES['/api/whatsapp']).toBe('whatsapp');
  });

  it('maps /api/automation to automation feature', () => {
    expect(FEATURE_ROUTES['/api/automation']).toBe('automation');
  });

  it('maps /api/message-templates to message_templates feature', () => {
    expect(FEATURE_ROUTES['/api/message-templates']).toBe('message_templates');
  });
});

describe('getRequiredFeatureForPath()', () => {
  it('returns "whatsapp" for /admin/whatsapp', () => {
    expect(getRequiredFeatureForPath('/admin/whatsapp')).toBe('whatsapp');
  });

  it('returns "whatsapp" for /admin/whatsapp/templates', () => {
    expect(getRequiredFeatureForPath('/admin/whatsapp/templates')).toBe('whatsapp');
  });

  it('returns "automation" for /api/automation/rules', () => {
    expect(getRequiredFeatureForPath('/api/automation/rules')).toBe('automation');
  });

  it('returns "message_templates" for /api/message-templates', () => {
    expect(getRequiredFeatureForPath('/api/message-templates')).toBe('message_templates');
  });

  it('returns null for unprotected routes', () => {
    expect(getRequiredFeatureForPath('/dashboard')).toBeNull();
    expect(getRequiredFeatureForPath('/customers')).toBeNull();
  });

  it('returns null for unknown paths', () => {
    expect(getRequiredFeatureForPath('/api/unknown')).toBeNull();
  });

  it('longest prefix match wins', () => {
    expect(getRequiredFeatureForPath('/admin/whatsapp/templates')).toBe('whatsapp');
  });
});

describe('Membership type values', () => {
  it('valid membership types are MONTHLY, YEARLY, FOUNDER', () => {
    const validTypes: MembershipType[] = ['MONTHLY', 'YEARLY', 'FOUNDER'];
    expect(validTypes).toContain('MONTHLY');
    expect(validTypes).toContain('YEARLY');
    expect(validTypes).toContain('FOUNDER');
  });
});
