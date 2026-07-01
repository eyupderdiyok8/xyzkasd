'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import QRCode from 'qrcode';

interface DeviceData {
  id: string;
  serialNo: string;
  brand: string;
  model: string;
  qrCode: string | null;
  status: string;
  customer: { id: string; name: string } | null;
  installDate: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktif',
  PASSIVE: 'Pasif',
  SCRAP: 'Hurda',
};

export default function QrStickerPage() {
  const params = useParams();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/devices/${params.id}`)
      .then((r) => r.json())
      .then(async (json) => {
        if (json.error) {
          setError(json.error.message);
          return;
        }
        const d = json.data as DeviceData;
        setDevice(d);

        if (d.qrCode) {
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const qrUrl = `${origin}/public/device/${encodeURIComponent(d.qrCode)}`;
          const dataUrl = await QRCode.toDataURL(qrUrl, {
            width: 300,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          setQrDataUrl(dataUrl);
        }
      })
      .catch(() => setError('Yüklenemedi'))
      .finally(() => setLoading(false));
  }, [params.id]);

  // Auto-print when loaded
  useEffect(() => {
    if (!loading && qrDataUrl) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, qrDataUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-red-600">{error || 'Cihaz bulunamadı'}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Print button (hidden during print) */}
      <div className="no-print fixed bottom-6 right-6 z-50 flex gap-3">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-primary/90 transition-colors"
        >
          🖨 Yazdır
        </button>
        <button
          onClick={() => window.history.back()}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-muted-foreground shadow-lg hover:bg-gray-50 transition-colors"
        >
          Geri
        </button>
      </div>

      {/* Sticker grid — prints 4 stickers per page */}
      <div className="p-4 print:p-0">
        <div className="grid grid-cols-2 gap-4 print:gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="border border-gray-300 rounded-lg p-4 print:border print:border-gray-400"
              style={{
                width: '100%',
                maxWidth: '220px',
                height: 'auto',
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
              }}
            >
              {/* QR Code */}
              {qrDataUrl && (
                <div className="flex justify-center mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt={`QR: ${device.qrCode}`}
                    className="w-28 h-28 print:w-24 print:h-24"
                  />
                </div>
              )}

              {/* Device Info */}
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-wide text-foreground print:text-[10px]">
                  {device.brand} {device.model}
                </p>
                <p className="text-[10px] font-mono text-gray-600 mt-0.5 print:text-[8px]">
                  SN: {device.serialNo}
                </p>
                {device.qrCode && (
                  <p className="text-[8px] font-mono text-gray-400 mt-0.5 print:text-[7px]">
                    QR: {device.qrCode}
                  </p>
                )}
                {device.customer && (
                  <p className="text-[9px] text-gray-500 mt-0.5 print:text-[7px]">
                    {device.customer.name}
                  </p>
                )}
                <div className="mt-1 flex justify-center gap-1">
                  <span className="inline-block rounded-full px-1.5 py-0.5 text-[8px] font-medium bg-green-100 text-green-800 print:text-[7px]">
                    {STATUS_LABELS[device.status] ?? device.status}
                  </span>
                  {device.installDate && (
                    <span className="text-[8px] text-gray-400 print:text-[7px]">
                      {new Date(device.installDate).toLocaleDateString('tr-TR')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
