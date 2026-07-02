'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Database } from 'lucide-react';

export default function BackupExport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/admin/backup');
      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: { message: 'Bilinmeyen hata' } }));
        throw new Error(json.error?.message || 'Yedekleme başarısız');
      }

      // Download as file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="?(.+?)"?$/);
      a.download = match?.[1] ?? `wps-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-gray-600" />
          <CardTitle className="text-base">Veri Yedekleme</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-500">
          Tüm müşteri, cihaz, servis kaydı, ödeme ve diğer verilerinizi JSON formatında dışa aktarın.
          Bu dosyayı yedek olarak saklayabilir veya başka sisteme geçişte kullanabilirsiniz.
        </p>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}
        {success && (
          <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
            ✅ Yedekleme başarıyla indirildi
          </div>
        )}

        <Button onClick={handleExport} disabled={loading} size="sm" variant="outline">
          <Download className="mr-1.5 h-3.5 w-3.5" />
          {loading ? 'Hazırlanıyor...' : 'Yedekle (JSON İndir)'}
        </Button>
      </CardContent>
    </Card>
  );
}
