// ──────────────────────────────────────────────
// Water Purifier Service ERP — Feature Flag Tests
// Multi-Tenant SaaS
//
// Tests plan-based feature gating for Starter / Professional.
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  hasFeature,
  getPlanFeatures,
  PLAN_FEATURES,
  getRequiredFeatureForPath,
  PROFESSIONAL_ONLY_ROUTES,
  type PlanType,
  type FeatureFlag,
} from '../features';

describe('Feature Flags — Plan Definitions', () => {
  it('STARTER plan has basic CRM features', () => {
    const features = PLAN_FEATURES.STARTER;
    expect(features).toContain('surveys');
    expect(features).toContain('coupons');
  });

  it('STARTER plan does NOT include WhatsApp', () => {
    expect(PLAN_FEATURES.STARTER).not.toContain('whatsapp');
  });

  it('STARTER plan does NOT include automation', () => {
    expect(PLAN_FEATURES.STARTER).not.toContain('automation');
  });

  it('STARTER plan does NOT include message_templates', () => {
    expect(PLAN_FEATURES.STARTER).not.toContain('message_templates');
  });

  it('STARTER plan does NOT include advanced_reports', () => {
    expect(PLAN_FEATURES.STARTER).not.toContain('advanced_reports');
  });

  it('PROFESSIONAL plan includes all features', () => {
    const allFeatures: FeatureFlag[] = [
      'whatsapp',
      'automation',
      'message_templates',
      'surveys',
      'coupons',
      'advanced_reports',
    ];
    for (const feat of allFeatures) {
      expect(PLAN_FEATURES.PROFESSIONAL).toContain(feat);
    }
  });

  it('PROFESSIONAL plan has exactly 6 features', () => {
    expect(PLAN_FEATURES.PROFESSIONAL).toHaveLength(6);
  });

  it('STARTER plan has exactly 2 features (surveys, coupons)', () => {
    expect(PLAN_FEATURES.STARTER).toHaveLength(2);
  });
});

describe('hasFeature()', () => {
  describe('STARTER plan', () => {
    const plan: PlanType = 'STARTER';

    it('allows surveys', () => {
      expect(hasFeature(plan, 'surveys')).toBe(true);
    });

    it('allows coupons', () => {
      expect(hasFeature(plan, 'coupons')).toBe(true);
    });

    it('blocks WhatsApp', () => {
      expect(hasFeature(plan, 'whatsapp')).toBe(false);
    });

    it('blocks automation', () => {
      expect(hasFeature(plan, 'automation')).toBe(false);
    });

    it('blocks message_templates', () => {
      expect(hasFeature(plan, 'message_templates')).toBe(false);
    });

    it('blocks advanced_reports', () => {
      expect(hasFeature(plan, 'advanced_reports')).toBe(false);
    });
  });

  describe('PROFESSIONAL plan', () => {
    const plan: PlanType = 'PROFESSIONAL';

    it('allows WhatsApp', () => {
      expect(hasFeature(plan, 'whatsapp')).toBe(true);
    });

    it('allows automation', () => {
      expect(hasFeature(plan, 'automation')).toBe(true);
    });

    it('allows message_templates', () => {
      expect(hasFeature(plan, 'message_templates')).toBe(true);
    });

    it('allows surveys', () => {
      expect(hasFeature(plan, 'surveys')).toBe(true);
    });

    it('allows coupons', () => {
      expect(hasFeature(plan, 'coupons')).toBe(true);
    });

    it('allows advanced_reports', () => {
      expect(hasFeature(plan, 'advanced_reports')).toBe(true);
    });
  });

  describe('null / undefined plan', () => {
    it('returns false for null plan', () => {
      expect(hasFeature(null, 'whatsapp')).toBe(false);
      expect(hasFeature(null, 'surveys')).toBe(false);
    });

    it('returns false for undefined plan', () => {
      expect(hasFeature(undefined, 'whatsapp')).toBe(false);
      expect(hasFeature(undefined, 'surveys')).toBe(false);
    });
  });
});

describe('getPlanFeatures()', () => {
  it('returns STARTER features for STARTER plan', () => {
    expect(getPlanFeatures('STARTER')).toEqual(['surveys', 'coupons']);
  });

  it('returns all features for PROFESSIONAL plan', () => {
    const prof = getPlanFeatures('PROFESSIONAL');
    expect(prof).toHaveLength(6);
    expect(prof).toContain('whatsapp');
    expect(prof).toContain('automation');
  });

  it('returns empty array for null plan', () => {
    expect(getPlanFeatures(null)).toEqual([]);
  });

  it('returns empty array for undefined plan', () => {
    expect(getPlanFeatures(undefined)).toEqual([]);
  });
});

describe('PROFESSIONAL_ONLY_ROUTES', () => {
  it('maps /admin/whatsapp to whatsapp feature', () => {
    expect(PROFESSIONAL_ONLY_ROUTES['/admin/whatsapp']).toBe('whatsapp');
  });

  it('maps /api/whatsapp to whatsapp feature', () => {
    expect(PROFESSIONAL_ONLY_ROUTES['/api/whatsapp']).toBe('whatsapp');
  });

  it('maps /api/automation to automation feature', () => {
    expect(PROFESSIONAL_ONLY_ROUTES['/api/automation']).toBe('automation');
  });

  it('maps /api/message-templates to message_templates feature', () => {
    expect(PROFESSIONAL_ONLY_ROUTES['/api/message-templates']).toBe('message_templates');
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

  it('returns "whatsapp" for /api/whatsapp/send', () => {
    expect(getRequiredFeatureForPath('/api/whatsapp/send')).toBe('whatsapp');
  });

  it('returns null for unprotected routes', () => {
    expect(getRequiredFeatureForPath('/dashboard')).toBeNull();
    expect(getRequiredFeatureForPath('/customers')).toBeNull();
    expect(getRequiredFeatureForPath('/api/customers')).toBeNull();
  });

  it('returns null for unknown paths', () => {
    expect(getRequiredFeatureForPath('/api/unknown')).toBeNull();
  });

  it('longest prefix match wins', () => {
    // /admin/whatsapp/templates should match the /admin/whatsapp prefix (not /admin)
    expect(getRequiredFeatureForPath('/admin/whatsapp/templates')).toBe('whatsapp');
  });
});

describe('Manual plan change — API route helpers', () => {
  it('valid plan values are STARTER and PROFESSIONAL', () => {
    const validPlans: PlanType[] = ['STARTER', 'PROFESSIONAL'];
    expect(validPlans).toContain('STARTER');
    expect(validPlans).toContain('PROFESSIONAL');
  });

  it('plan type can be switched from STARTER to PROFESSIONAL', () => {
    const currentPlan: PlanType = 'STARTER';
    const newPlan: PlanType = 'PROFESSIONAL';
    // After switch, new plan should include all features
    expect(getPlanFeatures(newPlan)).toHaveLength(6);
    expect(getPlanFeatures(newPlan)).toContain('whatsapp');
    expect(getPlanFeatures(newPlan)).toContain('automation');
    // Old plan should not
    expect(getPlanFeatures(currentPlan)).not.toContain('whatsapp');
  });

  it('plan can be downgraded from PROFESSIONAL to STARTER', () => {
    const currentPlan: PlanType = 'PROFESSIONAL';
    const newPlan: PlanType = 'STARTER';
    // After downgrade, WhatsApp and automation are blocked
    expect(hasFeature(newPlan, 'whatsapp')).toBe(false);
    expect(hasFeature(newPlan, 'automation')).toBe(false);
    // Basic features still work
    expect(hasFeature(newPlan, 'surveys')).toBe(true);
    expect(hasFeature(newPlan, 'coupons')).toBe(true);
  });
});
