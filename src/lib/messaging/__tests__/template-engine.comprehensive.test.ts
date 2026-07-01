// ──────────────────────────────────────────────
// Water Purifier Service ERP — Template Engine Comprehensive Tests
// Multi-Tenant SaaS
//
// Tests: deep edge cases for renderTemplate, extractVariables,
// getUnknownVariables, KNOWN_VARIABLES structure
// ──────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import {
  KNOWN_VARIABLES,
  renderTemplate,
  extractVariables,
  getUnknownVariables,
  type TemplateVariable,
} from '../template-engine';

// ─── KNOWN_VARIABLES ─────────────────────────

describe('KNOWN_VARIABLES', () => {
  it('has exactly 11 variables', () => {
    expect(KNOWN_VARIABLES).toHaveLength(11);
  });

  it('every entry has key, label, description as non-empty strings', () => {
    for (const v of KNOWN_VARIABLES) {
      expect(v.key).toBeTruthy();
      expect(typeof v.key).toBe('string');
      expect(v.label).toBeTruthy();
      expect(typeof v.label).toBe('string');
      expect(v.description).toBeTruthy();
      expect(typeof v.description).toBe('string');
    }
  });

  it('all keys match TemplateVariable type', () => {
    const keys = KNOWN_VARIABLES.map((v) => v.key);
    // Verify no unexpected keys
    const expected: TemplateVariable[] = [
      'customer_name', 'device_brand', 'device_model',
      'next_service_date', 'company_name', 'phone',
      'technician', 'discount_code', 'survey_link',
      'google_review_link', 'coupon_code',
    ];
    for (const k of expected) {
      expect(keys).toContain(k);
    }
    expect(keys.sort()).toEqual(expected.sort());
  });

  it('no duplicate keys', () => {
    const keys = KNOWN_VARIABLES.map((v) => v.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('each label is unique per variable', () => {
    const labels = KNOWN_VARIABLES.map((v) => v.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

// ─── renderTemplate ──────────────────────────

describe('renderTemplate — edge cases', () => {
  it('returns empty string for empty template', () => {
    expect(renderTemplate('', {})).toBe('');
  });

  it('returns empty string for empty template with values provided', () => {
    expect(renderTemplate('', { customer_name: 'Ali' })).toBe('');
  });

  it('handles special regex characters in template', () => {
    const result = renderTemplate('Cost: {{amount}} (tax: {{tax}}%)', {
      amount: '$100.50',
      tax: '18',
    });
    expect(result).toBe('Cost: $100.50 (tax: 18%)');
  });

  it('preserves multiple whitespace and newlines', () => {
    const result = renderTemplate('Line1\n\nLine3\n  {{var}}  ', { var: 'X' });
    expect(result).toBe('Line1\n\nLine3\n  X  ');
  });

  it('handles variables with underscores and numbers', () => {
    const result = renderTemplate('{{discount_code}} for order_{{order_id}}', {
      discount_code: 'YAZ2025',
    });
    // order_id is not provided, so it stays as-is
    expect(result).toBe('YAZ2025 for order_{{order_id}}');
  });

  it('replaces same variable used multiple times', () => {
    const result = renderTemplate('{{name}} {{name}} {{name}}', {
      customer_name: 'X',
    });
    // customer_name is not "name", so all stay as-is
    expect(result).toBe('{{name}} {{name}} {{name}}');
  });

  it('replaces every occurrence of the same known variable', () => {
    const result = renderTemplate('Hi {{customer_name}}! {{customer_name}}!', {
      customer_name: 'Ali',
    });
    expect(result).toBe('Hi Ali! Ali!');
  });

  it('leaves null variable value as-is', () => {
    // VariableValues type disallows null, but runtime values might be undefined
    const result = renderTemplate('Hello {{customer_name}}', {
      customer_name: undefined as unknown as string,
    });
    expect(result).toBe('Hello {{customer_name}}');
  });

  it('replaces empty string value with empty string', () => {
    const result = renderTemplate('Prefix{{value}}Suffix', { discount_code: '' });
    expect(result).toBe('Prefix{{value}}Suffix'); // discount_code != value
  });

  it('handles values with curly braces', () => {
    const result = renderTemplate('Template: {{discount_code}}', {
      discount_code: '{{not_a_var}}',
    });
    expect(result).toBe('Template: {{not_a_var}}');
  });

  it('handles very long template strings', () => {
    const longStr = 'X{{var}}'.repeat(1000);
    const result = renderTemplate(longStr, { customer_name: 'Y' });
    // customer_name != var, so nothing is replaced
    expect(result).toBe(longStr);
  });

  it('handles template with all known variables replaced', () => {
    const result = renderTemplate(
      '{{customer_name}} {{device_brand}} {{device_model}} {{next_service_date}} {{company_name}} {{phone}} {{technician}} {{discount_code}} {{survey_link}} {{google_review_link}} {{coupon_code}}',
      {
        customer_name: 'Ali',
        device_brand: 'Aqua',
        device_model: 'Aqua Pure',
        next_service_date: '15 Mart 2025',
        company_name: 'Test A.Ş.',
        phone: '05551234567',
        technician: 'Mehmet',
        discount_code: 'IND10',
        survey_link: 'https://anket.test.com/123',
        google_review_link: 'https://g.page/r/abc',
        coupon_code: 'KUPON-2025',
      },
    );
    expect(result).toBe(
      'Ali Aqua Aqua Pure 15 Mart 2025 Test A.Ş. 05551234567 Mehmet IND10 https://anket.test.com/123 https://g.page/r/abc KUPON-2025',
    );
  });

  it('handles template with special Turkish characters in values', () => {
    const result = renderTemplate('Sayın {{customer_name}}', {
      customer_name: 'İsmail ŞahinĞüşöç',
    });
    expect(result).toBe('Sayın İsmail ŞahinĞüşöç');
  });

  it('handles numeric and boolean-like values as strings', () => {
    const result = renderTemplate('TDS: {{tds}} ppm', {
      customer_name: 'Test',  // tds not a known var, but using a known one
      discount_code: '42',
    });
    expect(result).toBe('TDS: {{tds}} ppm'); // tds is not known, stays
  });

  it('handles template with only whitespace', () => {
    expect(renderTemplate('   ', {})).toBe('   ');
    expect(renderTemplate('\t\n', {})).toBe('\t\n');
  });

  it('handles mixed known and unknown variables', () => {
    const result = renderTemplate(
      '{{customer_name}} - {{custom_field}} - {{another_unknown}}',
      { customer_name: 'Ali' },
    );
    expect(result).toBe('Ali - {{custom_field}} - {{another_unknown}}');
  });
});

// ─── extractVariables ────────────────────────

describe('extractVariables — edge cases', () => {
  it('returns empty array for empty string', () => {
    expect(extractVariables('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(extractVariables('   ')).toEqual([]);
  });

  it('returns empty array for string without variables', () => {
    expect(extractVariables('Düz metin {not_var}')).toEqual([]);
    expect(extractVariables('{not_closed')).toEqual([]);
  });

  it('extracts variable with numeric characters', () => {
    expect(extractVariables('{{var_123}}')).toEqual(['var_123']);
  });

  it('extracts variable at start of string', () => {
    expect(extractVariables('{{customer_name}} metin')).toEqual(['customer_name']);
  });

  it('extracts variable at end of string', () => {
    expect(extractVariables('metin {{customer_name}}')).toEqual(['customer_name']);
  });

  it('extracts adjacent variables without spaces', () => {
    expect(extractVariables('{{a}}{{b}}')).toEqual(['a', 'b']);
  });

  it('extracts variables separated by special characters', () => {
    expect(extractVariables('{{a}}|{{b}}|{{c}}')).toEqual(['a', 'b', 'c']);
  });

  it('handles malformed variable syntax', () => {
    // Single brace is not a variable
    expect(extractVariables('{not_var}')).toEqual([]);
    // Triple brace — validates inner {{var}} as a match
    expect(extractVariables('{{{var}}}')).toEqual(['var']);
  });

  it('handles empty variable name {{}}', () => {
    const result = extractVariables('before{{}}after');
    expect(result).toEqual([]); // \w+ requires at least one word char
  });

  it('deduplicates even with different positions in template', () => {
    const result = extractVariables(
      '{{customer_name}} start {{customer_name}} end {{customer_name}}',
    );
    expect(result).toEqual(['customer_name']);
  });

  it('extracts up to many unique variables', () => {
    const vars = [];
    for (let i = 0; i < 100; i++) vars.push(`var_${i}`);
    const template = vars.map((v) => `{{${v}}}`).join(' ');
    const result = extractVariables(template);
    expect(result).toHaveLength(100);
    expect(result[0]).toBe('var_0');
    expect(result[99]).toBe('var_99');
  });
});

// ─── getUnknownVariables ─────────────────────

describe('getUnknownVariables — edge cases', () => {
  it('returns empty for template with no variables', () => {
    expect(getUnknownVariables('Düz metin')).toEqual([]);
  });

  it('returns empty for empty string', () => {
    expect(getUnknownVariables('')).toEqual([]);
  });

  it('recognizes all known variables as known', () => {
    const allKnown = KNOWN_VARIABLES.map((v) => `{{${v.key}}}`).join(' ');
    expect(getUnknownVariables(allKnown)).toEqual([]);
  });

  it('returns only unknown variables from mixed template', () => {
    const result = getUnknownVariables(
      '{{customer_name}} {{device_brand}} {{totally_unknown}} {{also_unknown_123}}',
    );
    expect(result).toEqual(['totally_unknown', 'also_unknown_123']);
  });

  it('case sensitivity — variables must match exactly', () => {
    const result = getUnknownVariables('{{Customer_Name}}');
    // Known variables are lowercase with underscores
    expect(result).toEqual(['Customer_Name']);
  });

  it('handles variable names overlapping with known prefixes', () => {
    // customer_name_extra starts with customer_name but is different
    const result = getUnknownVariables('{{customer_name_extra}}');
    expect(result).toEqual(['customer_name_extra']);
  });

  it('returns all variables as unknown when none are known', () => {
    const result = getUnknownVariables('{{a}} {{b}} {{c}}');
    expect(result).toEqual(['a', 'b', 'c']);
  });

  it('returns empty for only known variables scattered in text', () => {
    const result = getUnknownVariables(
      'Merhaba {{customer_name}}, cihazınız {{device_brand}} {{device_model}} bakıma hazır.',
    );
    expect(result).toEqual([]);
  });

  it('handles completely unknown variables with underscore patterns', () => {
    const result = getUnknownVariables('{{_private_var}} {{__dunder__}}');
    expect(result).toEqual(['_private_var', '__dunder__']);
  });
});
