// ──────────────────────────────────────────────
// Water Purifier Service ERP — Template Engine Tests
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  KNOWN_VARIABLES,
  renderTemplate,
  extractVariables,
  getUnknownVariables,
} from '../template-engine';

// ── KNOWN_VARIABLES ─────────────────────────

describe('KNOWN_VARIABLES', () => {
  it('includes device_brand', () => {
    const keys = KNOWN_VARIABLES.map((v) => v.key);
    expect(keys).toContain('device_brand');
  });

  it('includes all required variables from AC', () => {
    const keys = KNOWN_VARIABLES.map((v) => v.key);
    const required = [
      'customer_name', 'device_model', 'next_service_date',
      'company_name', 'phone', 'technician', 'discount_code',
      'device_brand',
    ] as const;
    for (const r of required) {
      expect(keys).toContain(r);
    }
  });

  it('each entry has label and description', () => {
    for (const v of KNOWN_VARIABLES) {
      expect(v.label).toBeTruthy();
      expect(v.description).toBeTruthy();
    }
  });
});

// ── renderTemplate ──────────────────────────

describe('renderTemplate', () => {
  it('replaces {{variable}} with provided value', () => {
    const result = renderTemplate('Sayın {{customer_name}}', {
      customer_name: 'Ali',
    });
    expect(result).toBe('Sayın Ali');
  });

  it('replaces multiple variables in one template', () => {
    const result = renderTemplate(
      '{{customer_name}} — {{device_brand}} {{device_model}}',
      { customer_name: 'Ali', device_brand: 'Aqua', device_model: 'Pure Pro' },
    );
    expect(result).toBe('Ali — Aqua Pure Pro');
  });

  it('leaves unknown variables as-is when no value provided', () => {
    const result = renderTemplate('Hello {{unknown_var}}', {});
    expect(result).toBe('Hello {{unknown_var}}');
  });

  it('handles empty string values (replaces with empty string)', () => {
    const result = renderTemplate('{{customer_name}}', {
      customer_name: '',
    });
    expect(result).toBe('');
  });

  it('preserves text without variables', () => {
    const result = renderTemplate('Sabit metin', { customer_name: 'Ali' });
    expect(result).toBe('Sabit metin');
  });

  it('works with discount_code variable', () => {
    const result = renderTemplate('İndirim kodunuz: {{discount_code}}', {
      discount_code: 'SU-20',
    });
    expect(result).toBe('İndirim kodunuz: SU-20');
  });
});

// ── extractVariables ────────────────────────

describe('extractVariables', () => {
  it('extracts single variable', () => {
    expect(extractVariables('{{customer_name}}')).toEqual(['customer_name']);
  });

  it('extracts multiple unique variables', () => {
    const result = extractVariables(
      '{{customer_name}} ve {{device_model}}',
    );
    expect(result).toEqual(['customer_name', 'device_model']);
  });

  it('deduplicates repeated variables', () => {
    const result = extractVariables(
      '{{customer_name}} x {{customer_name}}',
    );
    expect(result).toEqual(['customer_name']);
  });

  it('returns empty array for plain text', () => {
    expect(extractVariables('Düz metin')).toEqual([]);
  });

  it('extracts device_brand variable', () => {
    expect(extractVariables('{{device_brand}}')).toEqual(['device_brand']);
  });

  it('extracts all variables from a real template', () => {
    const result = extractVariables(
      'Sayın {{customer_name}}, {{device_brand}} {{device_model}} bakım zamanı',
    );
    expect(result).toEqual(['customer_name', 'device_brand', 'device_model']);
  });
});

// ── getUnknownVariables ─────────────────────

describe('getUnknownVariables', () => {
  it('returns empty for known variables', () => {
    expect(getUnknownVariables('{{customer_name}}')).toEqual([]);
  });

  it('returns unknown variables', () => {
    const result = getUnknownVariables('{{customer_name}} {{foo_bar}}');
    expect(result).toEqual(['foo_bar']);
  });

  it('recognizes device_brand as known', () => {
    expect(getUnknownVariables('{{device_brand}}')).toEqual([]);
  });

  it('ignores text without variables', () => {
    expect(getUnknownVariables('Düz metin')).toEqual([]);
  });

  it('returns only unknown variables when mixed', () => {
    const result = getUnknownVariables(
      '{{customer_name}} {{device_brand}} {{unknown_1}} {{unknown_2}}',
    );
    expect(result).toEqual(['unknown_1', 'unknown_2']);
  });
});
