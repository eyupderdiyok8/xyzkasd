'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileJson, Check, AlertCircle } from 'lucide-react';

interface ImportResult {
  table: string;
  imported: number;
  skipped: number;
  errors: number;
}

export default function DataImport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setResults(null);
    setLoading(true);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'İçe aktarma başarısız');

      setResults(data.data.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-gray-600" />
          <CardTitle className="text-base">Veri İçe Aktar</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-gray-500">
          Yedekten aldığınız <code className="rounded bg-gray-100 px-1 text-[11px]">.json</code> dosyasını
          yükleyerek verilerinizi sisteme aktarın. Başka sistemden geçiş için önce yedek formatına
          dönüştürme yapmanız gerekir.
        </p>

        {error && (
          <div className="flex items-center gap-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}

        {results && (
          <div className="space-y-1 rounded border border-green-200 bg-green-50 p-3">
            <p className="flex items-center gap-1 text-xs font-medium text-green-800">
              <Check className="h-3.5 w-3.5" /> İçe aktarma tamamlandı
            </p>
            <div className="mt-2 space-y-0.5">
              {results.map((r) => (
                <div key={r.table} className="flex items-center justify-between text-[11px] text-green-700">
                  <span className="font-medium">{r.table}</span>
                  <span>
                    {r.imported} kayıt
                    {r.errors > 0 && <span className="text-red-600"> · {r.errors} hata</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleFile}
          className="hidden"
        />
        <Button
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          size="sm"
          variant="outline"
        >
          <FileJson className="mr-1.5 h-3.5 w-3.5" />
          {loading ? 'Aktarılıyor...' : fileName ? `${fileName} — Tekrar Yükle` : 'JSON Dosyası Seç ve Aktar'}
        </Button>
      </CardContent>
    </Card>
  );
}
