// ──────────────────────────────────────────────
// Water Purifier Service ERP — WhatsApp Notification Builder Tests
// Multi-Tenant SaaS
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { buildMaintenanceReminderText, buildSurveyInvitationText, buildHighScoreThanksText, buildLowScoreNotificationText } from '../notify';

describe('buildMaintenanceReminderText', () => {
  it('builds overdue message when daysOverdue is provided', () => {
    const text = buildMaintenanceReminderText({
      customerName: 'Ahmet',
      deviceBrand: 'AquaPure',
      deviceModel: 'AP-5000',
      daysUntilDue: null,
      daysOverdue: 5,
      filterName: 'Sediment',
    });
    expect(text).toContain('Ahmet');
    expect(text).toContain('AquaPure');
    expect(text).toContain('Sediment');
    expect(text).toContain('5 gün önce');
  });

  it('builds upcoming message when daysUntilDue is provided', () => {
    const text = buildMaintenanceReminderText({
      customerName: 'Ayşe',
      deviceBrand: 'PureTech',
      deviceModel: 'PT-200',
      daysUntilDue: 10,
      daysOverdue: null,
    });
    expect(text).toContain('Ayşe');
    expect(text).toContain('PureTech');
    expect(text).toContain('10 gün');
  });

  it('builds generic message when no days info', () => {
    const text = buildMaintenanceReminderText({
      customerName: 'Mehmet',
      deviceBrand: 'Test',
      deviceModel: 'M1',
      daysUntilDue: null,
      daysOverdue: null,
    });
    expect(text).toContain('Mehmet');
    expect(text).toContain('bakım zamanı');
  });

  it('includes filter name when provided in overdue', () => {
    const text = buildMaintenanceReminderText({
      customerName: 'Ali',
      deviceBrand: 'B',
      deviceModel: 'M',
      daysUntilDue: null,
      daysOverdue: 3,
      filterName: 'Karbon Blok',
    });
    expect(text).toContain('Karbon Blok');
  });

  it('uses generic "bakım" when no filter name in overdue', () => {
    const text = buildMaintenanceReminderText({
      customerName: 'Ali',
      deviceBrand: 'B',
      deviceModel: 'M',
      daysUntilDue: null,
      daysOverdue: 3,
    });
    expect(text).toContain('Bakım zamanı');
  });
});

describe('buildSurveyInvitationText', () => {
  it('builds survey invitation with customer name and URL', () => {
    const text = buildSurveyInvitationText({
      customerName: 'Ahmet Yılmaz',
      companyName: 'Test Firma',
      surveyUrl: 'https://survey.example.com/abc',
    });
    expect(text).toContain('Ahmet Yılmaz');
    expect(text).toContain('Test Firma');
    expect(text).toContain('https://survey.example.com/abc');
    expect(text).toContain('değerlendirmeniz');
    expect(text).toContain('1-5 puan');
  });
});

describe('buildHighScoreThanksText', () => {
  it('builds thanks message with coupon code', () => {
    const text = buildHighScoreThanksText({
      customerName: 'Ayşe Demir',
      couponCode: 'INDIRIM20',
      discountPct: 20,
      googleReviewUrl: 'https://g.page/r/test',
    });
    expect(text).toContain('Ayşe Demir');
    expect(text).toContain('INDIRIM20');
    expect(text).toContain('%20');
    expect(text).toContain('Google');
    expect(text).toContain('90 gün');
  });
});

describe('buildLowScoreNotificationText', () => {
  it('builds low score notification', () => {
    const text = buildLowScoreNotificationText({
      customerName: 'Ali Veli',
      ticketNo: 'SRV-001',
      score: 2,
    });
    expect(text).toContain('DÜŞÜK PUAN');
    expect(text).toContain('Ali Veli');
    expect(text).toContain('SRV-001');
    expect(text).toContain('2/5');
    expect(text).toContain('incelenmelidir');
  });

  it('includes customer comment when provided', () => {
    const text = buildLowScoreNotificationText({
      customerName: 'Ali',
      ticketNo: 'SRV-002',
      score: 1,
      comment: 'Geç geldiler',
    });
    expect(text).toContain('Geç geldiler');
  });

  it('works without customer comment', () => {
    const text = buildLowScoreNotificationText({
      customerName: 'Veli',
      ticketNo: 'SRV-003',
      score: 2,
    });
    expect(text).not.toContain('Müşteri Yorumu:');
  });
});
