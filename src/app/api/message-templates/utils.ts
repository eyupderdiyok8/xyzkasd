// ──────────────────────────────────────────────
// Water Purifier Service ERP — Message Template API Utils
// ──────────────────────────────────────────────

import {
  extractVariables,
  getUnknownVariables,
} from '@/lib/messaging/template-engine';

export interface ValidationResult {
  /** Değişkenlerin listesi ({{variable}} içinde geçenler) */
  usedVars: string[];
  /** Bilinmeyen değişkenler (KNOWN_VARIABLES içinde olmayanlar) */
  unknownVars: string[];
}

/**
 * Şablon içeriğini validate eder, kullanılan ve bilinmeyen
 * değişkenleri döndürür.
 */
export function validateAndExtractVariables(content: string): ValidationResult {
  const usedVars = extractVariables(content);
  const unknownVars = getUnknownVariables(content);
  return { usedVars, unknownVars };
}
