// ──────────────────────────────────────────────
// Water Purifier Service ERP — Template Engine
// Multi-Tenant SaaS
// ──────────────────────────────────────────────
// Mesaj şablonlarındaki {{variable}} değişkenlerini
// gerçek değerlerle değiştirir.
//
// Desteklenen değişkenler:
//   customer_name, device_model, next_service_date,
//   company_name, phone, technician, discount_code
// ──────────────────────────────────────────────

/** Bilinen tüm değişken tanımları. */
export const KNOWN_VARIABLES = [
  { key: 'customer_name', label: 'Müşteri Adı', description: 'Müşterinin adı soyadı' },
  { key: 'device_brand', label: 'Cihaz Markası', description: 'Cihazın markası' },
  { key: 'device_model', label: 'Cihaz Modeli', description: 'Cihazın marka ve modeli' },
  { key: 'next_service_date', label: 'Sonraki Servis Tarihi', description: 'Bir sonraki bakım tarihi' },
  { key: 'company_name', label: 'Firma Adı', description: 'Tenant/firma adı' },
  { key: 'phone', label: 'Telefon', description: 'Müşteri telefon numarası' },
  { key: 'technician', label: 'Teknisyen', description: 'Görevli teknisyen adı' },
  { key: 'discount_code', label: 'İndirim Kodu', description: 'Varsa indirim kodu' },
  { key: 'survey_link', label: 'Anket Linki', description: 'Memnuniyet anketi linki' },
  { key: 'google_review_link', label: 'Google Review Linki', description: 'Google yorum linki' },
  { key: 'coupon_code', label: 'Kupon Kodu', description: 'İndirim kupon kodu' },
] as const;

export type TemplateVariable = (typeof KNOWN_VARIABLES)[number]['key'];

/** Değişken değerlerini içeren map. */
export type VariableValues = Partial<Record<string, string>>;

/**
 * Bir şablon metnindeki {{variable}} değişkenlerini
 * verilen değerlerle değiştirir.
 *
 * @example
 * ```ts
 * const result = renderTemplate(
 *   'Sayın {{customer_name}}, cihazınızın bakım zamanı geldi.',
 *   { customer_name: 'Ahmet Yılmaz' }
 * );
 * // "Sayın Ahmet Yılmaz, cihazınızın bakım zamanı geldi."
 * ```
 */
export function renderTemplate(
  template: string,
  values: VariableValues,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, variable: string) => {
    const value = values[variable as TemplateVariable];
    if (value === undefined || value === null) {
      return match; // Değişken bulunamazsa olduğu gibi bırak
    }
    return value;
  });
}

/**
 * Bir şablon metninde kullanılan tüm değişkenleri
 * ({{variable}}) regex ile bulur ve döndürür.
 *
 * @example
 * ```ts
 * extractVariables('{{customer_name}} - {{device_model}}')
 * // => ['customer_name', 'device_model']
 * ```
 */
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

/**
 * Bir şablon metninde bilinmeyen değişken olup olmadığını kontrol eder.
 * Bilinmeyen değişken varsa bunları döndürür.
 */
export function getUnknownVariables(template: string): string[] {
  const used = extractVariables(template);
  const known = new Set(KNOWN_VARIABLES.map((v) => v.key));
  return used.filter((v) => !known.has(v as TemplateVariable));
}
