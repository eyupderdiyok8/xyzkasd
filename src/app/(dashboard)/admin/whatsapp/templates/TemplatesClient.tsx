'use client';

import { useState, useEffect, useCallback } from 'react';

interface Template {
  id: string;
  name: string;
  content: string;
  variables: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const VARIABLE_HELP = [
  { var: 'customer_name', desc: 'Müşteri adı' },
  { var: 'device_model', desc: 'Cihaz modeli' },
  { var: 'device_brand', desc: 'Cihaz markası' },
  { var: 'next_service_date', desc: 'Bir sonraki servis tarihi' },
  { var: 'company_name', desc: 'Firma adınız' },
  { var: 'phone', desc: 'Telefon numaranız' },
  { var: 'technician', desc: 'Teknisyen adı' },
  { var: 'discount_code', desc: 'İndirim kodu' },
];

const DEFAULT_TEMPLATES = [
  {
    name: 'Bakım Hatırlatma',
    content:
      'Sayın {{customer_name}}, {{device_brand}} {{device_model}} cihazınızın periyodik bakım zamanı gelmiştir. Lütfen {{company_name}} ile iletişime geçiniz.',
  },
  {
    name: 'Filtre Değişim Uyarısı',
    content:
      'Sayın {{customer_name}}, {{device_brand}} {{device_model}} cihazınızın filtre değişim zamanı {{next_service_date}} tarihine yaklaşmaktadır. Servis randevunuzu şimdi planlayın.',
  },
  {
    name: 'Gecikmiş Bakım',
    content:
      'Sayın {{customer_name}}, {{device_brand}} {{device_model}} cihazınızın bakımı gecikmiştir. Lütfen en kısa sürede {{phone}} numaralı telefondan bizimle iletişime geçiniz.',
  },
  {
    name: 'Randevu Onayı',
    content:
      'Sayın {{customer_name}}, {{device_brand}} {{device_model}} cihazınız için {{next_service_date}} tarihinde randevunuz onaylanmıştır. Teknisyen {{technician}} tarafından ziyaret edileceksiniz.',
  },
  {
    name: 'Kampanya Bildirimi',
    content:
      'Sayın {{customer_name}}, size özel {{discount_code}} indirim kodunuz hazır! {{device_brand}} {{device_model}} cihazınızın bakımını şimdi planlayın, {{next_service_date}} tarihine kadar geçerlidir.',
  },
];

export default function TemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formContent, setFormContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch('/api/message-templates?showAll=true');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Yükleme hatası');
      setTemplates(json.data ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function openNewForm() {
    setEditingId(null);
    setFormName('');
    setFormContent('');
    setError(null);
    setShowForm(true);
  }

  function openEditForm(tpl: Template) {
    setEditingId(tpl.id);
    setFormName(tpl.name);
    setFormContent(tpl.content);
    setError(null);
    setShowForm(true);
  }

  function applyDefaultTemplate(tpl: (typeof DEFAULT_TEMPLATES)[number]) {
    setFormName(tpl.name);
    setFormContent(tpl.content);
  }

  async function handleSave() {
    if (!formName.trim() || !formContent.trim()) {
      setError('Şablon adı ve metni zorunludur');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const method = editingId ? 'PATCH' : 'POST';
      const url = editingId
        ? `/api/message-templates/${editingId}`
        : '/api/message-templates';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          content: formContent.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Kaydetme hatası');

      await fetchTemplates();
      setShowForm(false);
      setEditingId(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu şablonu silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/message-templates/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Silme hatası');
      await fetchTemplates();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function insertVariable(varName: string) {
    setFormContent((prev) => prev + `{{${varName}}}`);
  }

  function previewContent(content: string): string {
    return content.replace(/\{\{(\w+)\}\}/g, (_, name) => {
      const help = VARIABLE_HELP.find((v) => v.var === name);
      return `[${help?.desc ?? name}]`;
    });
  }

  if (loading) {
    return (
      <div className="mt-8 text-center text-sm text-gray-400">
        Yükleniyor…
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Template List */}
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Şablonlar ({templates.length})
          </h2>
          <button
            onClick={openNewForm}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90"
          >
            + Yeni Şablon
          </button>
        </div>

        {templates.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">
            Henüz şablon oluşturulmamış. Hazır şablonlardan başlamak için
            aşağıdaki butonları kullanabilirsiniz.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">
                      {tpl.name}
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                      {tpl.content}
                    </p>
                    {!tpl.isActive && (
                      <span className="mt-1 inline-block rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                        Pasif
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditForm(tpl)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Düzenle
                    </button>
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Default Templates */}
      {!showForm && templates.length === 0 && (
        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Hazır Şablonlar
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Hızlı başlangıç için hazır şablonlardan birini seçin:
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {DEFAULT_TEMPLATES.map((dtpl) => (
              <button
                key={dtpl.name}
                onClick={() => {
                  openNewForm();
                  applyDefaultTemplate(dtpl);
                }}
                className="rounded-lg border border-border p-4 text-left hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <h3 className="text-sm font-medium text-foreground">
                  {dtpl.name}
                </h3>
                <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                  {dtpl.content}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="text-lg font-semibold text-foreground">
            {editingId ? 'Şablonu Düzenle' : 'Yeni Şablon'}
          </h2>

          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Şablon Adı
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Örn: Bakım Hatırlatma"
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Şablon Metni
              </label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={5}
                placeholder="Sayın {{customer_name}}, ..."
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Variable Insertion */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground">
                Değişken Ekle
              </label>
              <p className="mt-1 text-xs text-gray-500">
                İmleci metin kutusuna tıklayın, ardından eklemek istediğiniz
                değişkene tıklayın.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {VARIABLE_HELP.map((v) => (
                  <button
                    key={v.var}
                    type="button"
                    onClick={() => insertVariable(v.var)}
                    className="rounded-md border border-border bg-gray-50 px-2 py-1 text-xs text-muted-foreground hover:border-blue-300 hover:bg-blue-50"
                    title={v.desc}
                  >
                    {'{{'}
                    {v.var}
                    {'}}'}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            {formContent && (
              <div className="rounded-md bg-blue-50 p-3">
                <h4 className="text-xs font-medium text-blue-800">Önizleme</h4>
                <p className="mt-1 text-sm text-blue-700">
                  {previewContent(formContent)}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
