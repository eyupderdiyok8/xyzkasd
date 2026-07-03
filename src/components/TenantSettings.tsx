'use client';

import { useState, useEffect, useRef } from 'react';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Upload, X, Check, Palette } from 'lucide-react';
import {
  APP_THEME_PRESETS,
  DEFAULT_APP_THEME,
  parseAppThemeConfig,
  stringifyAppThemeConfig,
  type AppThemePresetId,
} from '@/lib/app-theme';

interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  planLabel: string;
  logo: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  reportConfig: string | null;
  themeConfig: string | null;
  googleReviewUrl: string | null;
  surveyMessage: string | null;
  mfaRequired: boolean;
}

interface ReportConfig {
  primaryColor: string;
  footerText: string;
  sections: {
    customer: boolean;
    device: boolean;
    measurements: boolean;
    filters: boolean;
    signature: boolean;
  };
}

const DEFAULT_CONFIG: ReportConfig = {
  primaryColor: '#1e40af',
  footerText: 'Bu rapor Water Purifier Service ERP sistemi tarafindan olusturulmustur.',
  sections: { customer: true, device: true, measurements: true, filters: true, signature: true },
};

const COLOR_OPTIONS = [
  { value: '#1e40af', label: 'Mavi', class: 'bg-blue-700' },
  { value: '#0d9488', label: 'Turkuaz', class: 'bg-teal-600' },
  { value: '#16a34a', label: 'Yeşil', class: 'bg-green-600' },
  { value: '#dc2626', label: 'Kırmızı', class: 'bg-red-600' },
  { value: '#ea580c', label: 'Turuncu', class: 'bg-orange-600' },
  { value: '#7c3aed', label: 'Mor', class: 'bg-purple-600' },
  { value: '#4f46e5', label: 'İndigo', class: 'bg-indigo-600' },
  { value: '#0f172a', label: 'Siyah', class: 'bg-slate-900' },
];

const SECTION_LABELS: Record<string, string> = {
  customer: 'Müşteri Bilgileri',
  device: 'Cihaz Bilgileri',
  measurements: 'Ölçüm Değerleri',
  filters: 'Değişen Filtreler',
  signature: 'İmza',
};

function parseConfig(raw: string | null): ReportConfig {
  if (!raw) return { ...DEFAULT_CONFIG };
  try {
    const parsed = JSON.parse(raw);
    return {
      primaryColor: parsed.primaryColor ?? DEFAULT_CONFIG.primaryColor,
      footerText: parsed.footerText ?? DEFAULT_CONFIG.footerText,
      sections: {
        customer: parsed.sections?.customer ?? true,
        device: parsed.sections?.device ?? true,
        measurements: parsed.sections?.measurements ?? true,
        filters: parsed.sections?.filters ?? true,
        signature: parsed.sections?.signature ?? true,
      },
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

const MAX_LOGO_SIZE = 256; // max width/height in pixels

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > MAX_LOGO_SIZE || height > MAX_LOGO_SIZE) {
          const ratio = Math.min(MAX_LOGO_SIZE / width, MAX_LOGO_SIZE / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => reject(new Error('Görsel yüklenemedi'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Dosya okunamadı'));
    reader.readAsDataURL(file);
  });
}

export default function TenantSettings() {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [logoChanged, setLogoChanged] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Report config state
  const [config, setConfig] = useState<ReportConfig>({ ...DEFAULT_CONFIG });
  const [configChanged, setConfigChanged] = useState(false);

  // App theme state
  const [appTheme, setAppTheme] = useState<AppThemePresetId>(DEFAULT_APP_THEME.preset);
  const [appThemeChanged, setAppThemeChanged] = useState(false);

  // Survey settings state
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [surveyMessage, setSurveyMessage] = useState('');

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);

  const fetchTenant = async () => {
    setLoading(true);
    try {
      setEmptyMessage(null);
      const res = await fetch('/api/admin/plan');
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          setError(null);
          setTenant(null);
          setLoading(false);
          return;
        }
        throw new Error(json.error?.message ?? 'Yüklenemedi');
      }
      if (!json.data) {
        setError(null);
        setTenant(null);
        setEmptyMessage(json.meta?.message ?? null);
        setLoading(false);
        return;
      }
      setTenant(json.data);
      setName(json.data.name ?? '');
      setPhone(json.data.phone ?? '');
      setEmail(json.data.email ?? '');
      setAddress(json.data.address ?? '');
      setLogo(json.data.logo ?? null);
      setLogoChanged(false);
      setConfig(parseConfig(json.data.reportConfig));
      setConfigChanged(false);
      setAppTheme(parseAppThemeConfig(json.data.themeConfig).preset);
      setAppThemeChanged(false);
      setGoogleReviewUrl(json.data.googleReviewUrl ?? '');
      setSurveyMessage(json.data.surveyMessage ?? '');
      setMfaRequired(json.data.mfaRequired ?? false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTenant(); }, []);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      setLogo(dataUrl);
      setLogoChanged(true);
    } catch (err: any) {
      setError(err.message);
    }
    // Reset input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveLogo = () => {
    setLogo(null);
    setLogoChanged(true);
  };

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    const updates: Record<string, unknown> = {};
    if (name.trim() !== tenant.name) updates.name = name.trim();
    if (phone.trim() !== (tenant.phone ?? '')) updates.phone = phone.trim() || null;
    if (email.trim() !== (tenant.email ?? '')) updates.email = email.trim() || null;
    if (address.trim() !== (tenant.address ?? '')) updates.address = address.trim() || null;
    if (logoChanged) updates.logo = logo;
    if (configChanged) updates.reportConfig = JSON.stringify(config);
    if (appThemeChanged) updates.themeConfig = stringifyAppThemeConfig({ preset: appTheme });
    if (googleReviewUrl.trim() !== (tenant.googleReviewUrl ?? '')) updates.googleReviewUrl = googleReviewUrl.trim() || null;
    if (surveyMessage.trim() !== (tenant.surveyMessage ?? '')) updates.surveyMessage = surveyMessage.trim() || null;
    if (mfaRequired !== (tenant.mfaRequired ?? false)) updates.mfaRequired = mfaRequired;

    if (Object.keys(updates).length === 0) {
      setError('Değişiklik yapılmadı');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Kaydedilemedi');

      setSuccess('Firma bilgileri güncellendi');
      setLogoChanged(false);
      setAppThemeChanged(false);
      fetchTenant();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center text-sm text-gray-400 py-8">Firma bilgileri yükleniyor…</div>;
  }

  if (!tenant) {
    if (error) {
      return <div className="text-center text-sm text-red-500 py-8">{error}</div>;
    }
    return (
      <div className="rounded-lg border border-blue-100 bg-blue-50 p-6 text-center">
        <p className="text-sm text-blue-700">
          {emptyMessage ?? 'Super admin olarak tüm firmaları yönetebilirsiniz. Firma ayarlarını düzenlemek için bir firma seçin.'}
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-gray-600" />
          <CardTitle className="text-base">Firma Ayarları</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
            <Check className="mr-1 inline h-3 w-3" /> {success}
          </div>
        )}

        {/* Logo */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-2">Firma Logosu</label>
          <div className="flex items-start gap-4">
            {/* Preview */}
            <div className="flex h-20 w-40 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 overflow-hidden">
              {logo ? (
                <NextImage src={logo} alt="Logo" width={160} height={80} className="max-h-full max-w-full object-contain" unoptimized />
              ) : (
                <span className="text-xs text-gray-400">Logo yok</span>
              )}
            </div>
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleLogoSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-1 h-3 w-3" />
                Logo Yükle
              </Button>
              {logo && (
                <Button type="button" variant="ghost" size="sm" onClick={handleRemoveLogo} className="text-red-600">
                  <X className="mr-1 h-3 w-3" />
                  Kaldır
                </Button>
              )}
              <p className="text-[10px] text-gray-400">PNG, JPEG veya WebP. Otomatik küçültülür.</p>
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Firma Adı</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Firma adı" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Telefon</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+90 555 123 4567" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">E-posta</label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="info@firma.com" type="email" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Adres</label>
            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Tam adres" />
          </div>
        </div>

        {/* Anket Ayarları */}
        <div className="border-t pt-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">📋 Anket Ayarları</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Google Review Linki
              </label>
              <Input
                value={googleReviewUrl}
                onChange={e => setGoogleReviewUrl(e.target.value)}
                placeholder="https://g.page/r/..."
                type="url"
              />
              <p className="mt-1 text-[10px] text-gray-400">
                Müşteri 4+ yıldız verdiğinde gönderilecek Google yorum linki. Boş bırakılırsa gönderilmez.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Özel Anket Davet Mesajı
              </label>
              <textarea
                value={surveyMessage}
                onChange={e => setSurveyMessage(e.target.value)}
                rows={4}
                placeholder="Varsayılan mesaj kullanılacak..."
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                maxLength={500}
              />
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-gray-400">
                <span>Kullanılabilir değişkenler:</span>
                <code className="rounded bg-gray-100 px-1">{'{{customer_name}}'}</code>
                <code className="rounded bg-gray-100 px-1">{'{{survey_url}}'}</code>
                <code className="rounded bg-gray-100 px-1">{'{{company_name}}'}</code>
              </div>
              <p className="mt-1 text-[10px] text-gray-400">
                Boş bırakılırsa varsayılan mesaj kullanılır: "Sayın {'{müşteri}'}, servis işleminiz başarıyla tamamlandı..."
              </p>
            </div>
          </div>
        </div>

        {/* Uygulama Teması */}
        <div className="border-t pt-5">
          <div className="mb-4 flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Uygulama Teması</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {APP_THEME_PRESETS.map((preset) => {
              const selected = appTheme === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setAppTheme(preset.id);
                    setAppThemeChanged(true);
                  }}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    selected
                      ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                      : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-foreground">{preset.name}</span>
                    {selected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="mb-3 flex h-8 overflow-hidden rounded-md border border-border">
                    {preset.swatches.map((color) => (
                      <span key={color} className="flex-1" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* PDF Tasarım Ayarları */}
        <div className="border-t pt-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">PDF Rapor Tasarımı</h3>

          {/* Color */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-muted-foreground mb-2">Başlık Rengi</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => { setConfig(prev => ({ ...prev, primaryColor: c.value })); setConfigChanged(true); }}
                  className={`w-8 h-8 rounded-full border-2 ${c.class} ${
                    config.primaryColor === c.value ? 'border-foreground ring-2 ring-offset-2 ring-foreground/30' : 'border-transparent'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Alt Bilgi (Footer)</label>
            <Input
              value={config.footerText}
              onChange={e => { setConfig(prev => ({ ...prev, footerText: e.target.value })); setConfigChanged(true); }}
              placeholder="Footer metni"
            />
          </div>

          {/* Section toggles */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Gösterilecek Bölümler</label>
            <div className="space-y-2">
              {Object.entries(SECTION_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.sections[key as keyof typeof config.sections] ?? true}
                    onChange={e => {
                      setConfig(prev => ({
                        ...prev,
                        sections: { ...prev.sections, [key]: e.target.checked },
                      }));
                      setConfigChanged(true);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-muted-foreground">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* MFA / Güvenlik */}
        <div className="border-t pt-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">🔐 Güvenlik</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={mfaRequired}
              onChange={e => setMfaRequired(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <span className="text-sm font-medium text-foreground">İki Adımlı Doğrulama Zorunlu</span>
              <p className="text-xs text-muted-foreground">
                Tüm kullanıcılar girişte authenticator kodu girmek zorunda kalır. Kullanıcılar önce profillerinden 2FA kurulumu yapmalıdır.
              </p>
            </div>
          </label>
        </div>

        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? 'Kaydediliyor...' : 'Kaydet'}
        </Button>
      </CardContent>
    </Card>
  );
}
