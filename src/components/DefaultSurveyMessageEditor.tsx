'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Check, RefreshCw } from 'lucide-react';

export default function DefaultSurveyMessageEditor() {
  const [value, setValue] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings?key=default_survey_message');
      const json = await res.json();
      const v = json.data?.value ?? '';
      setValue(v);
      setOriginal(v);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'default_survey_message', value }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? 'Kaydedilemedi');
      setOriginal(value);
      setSuccess('Varsayılan anket mesajı güncellendi');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const changed = value !== original;

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-gray-400">Yükleniyor...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-gray-600" />
          <CardTitle className="text-base">Varsayılan Anket Mesajı (Super Admin)</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
            <Check className="mr-1 inline h-3 w-3" /> {success}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            WhatsApp ile gönderilecek varsayılan anket davet mesajı
          </label>
          <textarea
            value={value}
            onChange={e => setValue(e.target.value)}
            rows={6}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none font-mono"
            maxLength={600}
          />
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-gray-400">
            <span>Kullanılabilir değişkenler:</span>
            <code className="rounded bg-gray-100 px-1">{'{{customer_name}}'}</code>
            <code className="rounded bg-gray-100 px-1">{'{{survey_url}}'}</code>
            <code className="rounded bg-gray-100 px-1">{'{{company_name}}'}</code>
          </div>
          <p className="mt-1 text-[10px] text-gray-400">
            Bu mesaj, firma kendi özel mesajını ayarlamamışsa tüm tenant&apos;lar için kullanılır.
            Firma özel mesajı (Admin → Firma Ayarları) bu mesajı ezer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving || !changed} size="sm">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
          <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className="mr-1 h-3 w-3" /> Sıfırla
          </Button>
          <span className="text-[10px] text-gray-400">{value.length}/600</span>
        </div>
      </CardContent>
    </Card>
  );
}
