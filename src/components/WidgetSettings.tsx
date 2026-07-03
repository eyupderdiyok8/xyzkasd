'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Code, Copy, Check, Eye } from 'lucide-react';

const COLOR_PRESETS = [
  '#1e40af', '#0d9488', '#16a34a', '#dc2626',
  '#ea580c', '#7c3aed', '#4f46e5', '#0f172a',
  '#2563eb', '#0891b2', '#059669', '#d97706',
];

export default function WidgetSettings() {
  const [tenantId, setTenantId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [primary, setPrimary] = useState('#1e40af');
  const [bg, setBg] = useState('#ffffff');
  const [text, setText] = useState('#1e293b');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(`/widget/damacana?tenant=${tenantId}`);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    fetch('/api/admin/plan')
      .then(r => {
        if (r.status === 404) return null; // tenant bağlı değil
        return r.json();
      })
      .then(j => {
        if (j && j.data) {
          setTenantId(j.data.id);
          setTenantName(j.data.name);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Debounce preview URL — 500ms gecikmeyle güncelle
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const url = `/widget/damacana?tenant=${tenantId}&primary=${encodeURIComponent(primary)}&bg=${encodeURIComponent(bg)}&text=${encodeURIComponent(text)}`;
      setPreviewUrl(url);
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [primary, bg, text, tenantId]);

  const embedCode = `<script 
  src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget/damacana.js"
  data-tenant="${tenantId}"
  data-primary="${primary}"
  data-bg="${bg}"
  data-text="${text}">
</script>`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-gray-400">
          Yükleniyor...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-indigo-600" />
          <CardTitle className="text-base">Widget Ayarları</CardTitle>
        </div>
        <p className="text-xs text-muted-foreground">
          Damacana tasarruf hesaplayıcı widget'ını sitenize ekleyin.
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Renk seçimi */}
        <div>
          <label className="block text-xs font-medium mb-2">Renk Paleti</label>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[10px] text-muted-foreground">Ana Renk</label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type="color"
                  value={primary}
                  onChange={e => setPrimary(e.target.value)}
                  className="h-8 w-12 cursor-pointer border-0 p-0"
                />
                <Input
                  value={primary}
                  onChange={e => setPrimary(e.target.value)}
                  className="h-8 flex-1 font-mono text-xs"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {COLOR_PRESETS.map(c => (
                  <button
                    key={c}
                    onClick={() => setPrimary(c)}
                    className="h-6 w-6 rounded-full border border-gray-300 transition-transform hover:scale-110"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-muted-foreground">Arka Plan</label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type="color"
                  value={bg}
                  onChange={e => setBg(e.target.value)}
                  className="h-8 w-12 cursor-pointer border-0 p-0"
                />
                <Input
                  value={bg}
                  onChange={e => setBg(e.target.value)}
                  className="h-8 flex-1 font-mono text-xs"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {['#ffffff', '#f8fafc', '#f1f5f9', '#0f172a'].map(c => (
                  <button
                    key={c}
                    onClick={() => setBg(c)}
                    className="h-6 w-6 rounded-full border border-gray-300 transition-transform hover:scale-110"
                    style={{ background: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Canlı önizleme */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            <label className="text-xs font-medium">Önizleme</label>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <iframe
              src={previewUrl}
              className="w-full"
              style={{ height: '520px', border: 'none' }}
              title="Widget önizleme"
            />
          </div>
        </div>

        {/* Embed kodu */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Code className="h-3.5 w-3.5 text-muted-foreground" />
            <label className="text-xs font-medium">Embed Kodu</label>
          </div>
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-green-300 font-mono leading-relaxed">
              {embedCode}
            </pre>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="absolute right-2 top-2 h-7 text-xs"
            >
              {copied ? (
                <Check className="mr-1 h-3 w-3 text-green-500" />
              ) : (
                <Copy className="mr-1 h-3 w-3" />
              )}
              {copied ? 'Kopyalandı' : 'Kopyala'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
