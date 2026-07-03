export type AppThemePresetId = 'classic' | 'violet' | 'aqua' | 'graphite';

export interface AppThemeConfig {
  preset: AppThemePresetId;
}

export interface AppThemePreset {
  id: AppThemePresetId;
  name: string;
  description: string;
  swatches: string[];
  variables: Record<string, string>;
}

export const DEFAULT_APP_THEME: AppThemeConfig = { preset: 'classic' };

export const APP_THEME_PRESETS: AppThemePreset[] = [
  {
    id: 'classic',
    name: 'Klasik',
    description: 'Mevcut görünüm, mor vurgu ve açık zemin.',
    swatches: ['oklch(58% 0.16 270)', 'oklch(72% 0.16 35)', 'oklch(98% 0.01 250)'],
    variables: {
      '--background': 'oklch(98% 0.01 250)',
      '--foreground': 'oklch(28% 0.02 270)',
      '--card': 'oklch(100% 0 0)',
      '--card-foreground': 'oklch(28% 0.02 270)',
      '--primary': 'oklch(58% 0.16 270)',
      '--primary-foreground': 'oklch(100% 0 0)',
      '--secondary': 'oklch(96% 0.01 270)',
      '--secondary-foreground': 'oklch(35% 0.02 270)',
      '--muted': 'oklch(96% 0.01 270)',
      '--muted-foreground': 'oklch(54% 0.03 270)',
      '--accent': 'oklch(72% 0.16 35)',
      '--accent-foreground': 'oklch(100% 0 0)',
      '--border': 'oklch(92% 0.01 270)',
      '--input': 'oklch(92% 0.01 270)',
      '--ring': 'oklch(58% 0.16 270)',
      '--app-shell-bg': 'oklch(98% 0.01 250)',
      '--app-sidebar-bg': 'oklch(100% 0 0)',
      '--app-sidebar-border': 'oklch(92% 0.01 270)',
    },
  },
  {
    id: 'violet',
    name: 'Violet Studio',
    description: 'Modern mor, yumuşak lila yüzeyler.',
    swatches: ['oklch(52% 0.22 295)', 'oklch(70% 0.17 325)', 'oklch(98% 0.02 305)'],
    variables: {
      '--background': 'oklch(98% 0.02 305)',
      '--foreground': 'oklch(24% 0.03 295)',
      '--card': 'oklch(100% 0 0)',
      '--card-foreground': 'oklch(24% 0.03 295)',
      '--primary': 'oklch(52% 0.22 295)',
      '--primary-foreground': 'oklch(100% 0 0)',
      '--secondary': 'oklch(95% 0.03 305)',
      '--secondary-foreground': 'oklch(32% 0.05 295)',
      '--muted': 'oklch(95% 0.03 305)',
      '--muted-foreground': 'oklch(52% 0.05 295)',
      '--accent': 'oklch(70% 0.17 325)',
      '--accent-foreground': 'oklch(100% 0 0)',
      '--border': 'oklch(90% 0.03 305)',
      '--input': 'oklch(90% 0.03 305)',
      '--ring': 'oklch(52% 0.22 295)',
      '--app-shell-bg': 'oklch(97% 0.02 305)',
      '--app-sidebar-bg': 'oklch(99% 0.01 305)',
      '--app-sidebar-border': 'oklch(90% 0.03 305)',
    },
  },
  {
    id: 'aqua',
    name: 'Temiz Su',
    description: 'Turkuaz ve ferah beyaz yüzeyler.',
    swatches: ['oklch(55% 0.14 205)', 'oklch(66% 0.13 165)', 'oklch(98% 0.02 205)'],
    variables: {
      '--background': 'oklch(98% 0.02 205)',
      '--foreground': 'oklch(25% 0.03 220)',
      '--card': 'oklch(100% 0 0)',
      '--card-foreground': 'oklch(25% 0.03 220)',
      '--primary': 'oklch(55% 0.14 205)',
      '--primary-foreground': 'oklch(100% 0 0)',
      '--secondary': 'oklch(95% 0.03 205)',
      '--secondary-foreground': 'oklch(30% 0.05 210)',
      '--muted': 'oklch(95% 0.03 205)',
      '--muted-foreground': 'oklch(50% 0.04 210)',
      '--accent': 'oklch(66% 0.13 165)',
      '--accent-foreground': 'oklch(100% 0 0)',
      '--border': 'oklch(90% 0.03 205)',
      '--input': 'oklch(90% 0.03 205)',
      '--ring': 'oklch(55% 0.14 205)',
      '--app-shell-bg': 'oklch(97% 0.02 205)',
      '--app-sidebar-bg': 'oklch(99% 0.01 205)',
      '--app-sidebar-border': 'oklch(90% 0.03 205)',
    },
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Daha sakin, koyu gri odaklı operasyon görünümü.',
    swatches: ['oklch(38% 0.03 250)', 'oklch(58% 0.12 220)', 'oklch(97% 0 0)'],
    variables: {
      '--background': 'oklch(97% 0 0)',
      '--foreground': 'oklch(22% 0.02 250)',
      '--card': 'oklch(100% 0 0)',
      '--card-foreground': 'oklch(22% 0.02 250)',
      '--primary': 'oklch(38% 0.03 250)',
      '--primary-foreground': 'oklch(100% 0 0)',
      '--secondary': 'oklch(94% 0.01 250)',
      '--secondary-foreground': 'oklch(28% 0.02 250)',
      '--muted': 'oklch(94% 0.01 250)',
      '--muted-foreground': 'oklch(48% 0.02 250)',
      '--accent': 'oklch(58% 0.12 220)',
      '--accent-foreground': 'oklch(100% 0 0)',
      '--border': 'oklch(88% 0.01 250)',
      '--input': 'oklch(88% 0.01 250)',
      '--ring': 'oklch(38% 0.03 250)',
      '--app-shell-bg': 'oklch(96% 0.01 250)',
      '--app-sidebar-bg': 'oklch(99% 0 0)',
      '--app-sidebar-border': 'oklch(88% 0.01 250)',
    },
  },
];

export function parseAppThemeConfig(raw: string | null | undefined): AppThemeConfig {
  if (!raw) return DEFAULT_APP_THEME;

  try {
    const parsed = JSON.parse(raw) as Partial<AppThemeConfig>;
    const exists = APP_THEME_PRESETS.some((preset) => preset.id === parsed.preset);
    return exists ? { preset: parsed.preset as AppThemePresetId } : DEFAULT_APP_THEME;
  } catch {
    return DEFAULT_APP_THEME;
  }
}

export function getAppThemePreset(config: AppThemeConfig): AppThemePreset {
  return APP_THEME_PRESETS.find((preset) => preset.id === config.preset) ?? APP_THEME_PRESETS[0];
}

export function getAppThemeStyle(raw: string | null | undefined): Record<string, string> {
  return getAppThemePreset(parseAppThemeConfig(raw)).variables;
}

export function stringifyAppThemeConfig(config: AppThemeConfig): string {
  return JSON.stringify({ preset: config.preset });
}
