'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WhatsAppConnectionStatus } from '@/lib/whatsapp/waha-manager';

interface StatusData {
  status: WhatsAppConnectionStatus;
  qrData?: string;
  errorMessage?: string;
  lastConnectedAt?: string;
  autoReconnect: boolean;
}

const STATUS_LABELS: Record<WhatsAppConnectionStatus, string> = {
  CONNECTED: 'Bağlı',
  DISCONNECTED: 'Bağlı Değil',
  ERROR: 'Hata',
  SCANNING: 'QR Bekleniyor',
  STARTING: 'Başlatılıyor…',
};

const STATUS_COLORS: Record<WhatsAppConnectionStatus, string> = {
  CONNECTED: 'bg-green-100 text-green-800',
  DISCONNECTED: 'bg-gray-100 text-foreground',
  ERROR: 'bg-red-100 text-red-800',
  SCANNING: 'bg-yellow-100 text-yellow-800',
  STARTING: 'bg-blue-100 text-blue-800',
};

export default function WhatsAppSettings() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/whatsapp/status');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? 'Durum alınamadı');
        return;
      }
      setStatus(data);
      setError(null);
    } catch (err: any) {
      setError(err.message ?? 'Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQr = useCallback(async () => {
    setActionLoading('qr');
    setError(null);
    try {
      const res = await fetch('/api/whatsapp/qr');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? 'QR kod alınamadı');
      } else {
        setStatus({
          status: data.status ?? 'SCANNING',
          qrData: data.qrData,
          autoReconnect: data.autoReconnect ?? true,
        });
      }
    } catch (err: any) {
      setError(err.message ?? 'QR kod alınırken hata');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleReconnect = useCallback(async () => {
    setActionLoading('reconnect');
    setError(null);
    try {
      const res = await fetch('/api/whatsapp/reconnect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? 'Yeniden bağlanma hatası');
      } else {
        setStatus({
          status: data.status ?? 'SCANNING',
          qrData: data.qrData,
          autoReconnect: data.autoReconnect ?? true,
        });
      }
    } catch (err: any) {
      setError(err.message ?? 'Yeniden bağlanma hatası');
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (!confirm('WhatsApp bağlantısını kesmek istediğinize emin misiniz?')) return;

    setActionLoading('disconnect');
    setError(null);
    try {
      const res = await fetch('/api/whatsapp/disconnect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? 'Bağlantı kesme hatası');
      } else {
        setStatus({ status: 'DISCONNECTED', autoReconnect: false });
      }
    } catch (err: any) {
      setError(err.message ?? 'Bağlantı kesme hatası');
    } finally {
      setActionLoading(null);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll when scanning or starting
  useEffect(() => {
    if (
      status?.status === 'SCANNING' ||
      status?.status === 'STARTING'
    ) {
      pollRef.current = setInterval(() => {
        fetchStatus();
      }, 3000);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [status?.status, fetchStatus]);

  if (loading) {
    return (
      <div className="mt-8 text-center text-sm text-gray-400">
        Yükleniyor…
      </div>
    );
  }

  const statusColorClass = STATUS_COLORS[status?.status ?? 'DISCONNECTED'];
  const statusLabel = STATUS_LABELS[status?.status ?? 'DISCONNECTED'];

  return (
    <div className="mt-8 space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Status Card */}
      <div className="rounded-lg border border-border bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Bağlantı Durumu
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              WhatsApp Web oturumunuzun mevcut durumu
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusColorClass}`}
          >
            <span
              className={`mr-2 inline-block h-2 w-2 rounded-full ${
                status?.status === 'CONNECTED'
                  ? 'bg-green-500'
                  : status?.status === 'ERROR'
                  ? 'bg-red-500'
                  : status?.status === 'SCANNING' || status?.status === 'STARTING'
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-gray-400'
              }`}
            />
            {statusLabel}
          </span>
        </div>

        {status?.lastConnectedAt && (
          <p className="mt-3 text-xs text-gray-400">
            Son bağlantı:{' '}
            {new Date(status.lastConnectedAt).toLocaleString('tr-TR')}
          </p>
        )}

        {status?.errorMessage && (
          <p className="mt-2 text-xs text-red-600">
            Hata: {status.errorMessage}
          </p>
        )}

        {!status?.autoReconnect && (
          <p className="mt-2 text-xs text-yellow-600">
            Otomatik yeniden bağlanma kapalı
          </p>
        )}
      </div>

      {/* QR Code Area */}
      {(status?.status === 'SCANNING' || status?.status === 'STARTING') && (
        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="text-lg font-semibold text-foreground">
            QR Kodunu Okutun
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            WhatsApp uygulamanızdan {`"`}Cihazlara Bağlan{`"`} veya
            {`"`}WhatsApp Web{`"`} menüsünden bu kodu okutun.
          </p>

          <div className="mt-4 flex flex-col items-center gap-4">
            {status?.qrData ? (
              <div className="rounded-lg border border-border bg-white p-4">
                <QrCodeDisplay qrData={status.qrData} />
              </div>
            ) : (
              <div className="flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
                <p className="text-sm text-gray-400">QR yükleniyor…</p>
              </div>
            )}

            {status?.status === 'STARTING' && (
              <p className="text-sm text-blue-600 animate-pulse">
                Oturum başlatılıyor, lütfen bekleyin…
              </p>
            )}

            <button
              onClick={fetchQr}
              disabled={actionLoading === 'qr'}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {actionLoading === 'qr' ? 'Yükleniyor…' : 'QR Kodu Yenile'}
            </button>
          </div>
        </div>
      )}

      {/* QR (Not Scanning) */}
      {status?.status === 'DISCONNECTED' && (
        <div className="rounded-lg border border-border bg-white p-6">
          <h2 className="text-lg font-semibold text-foreground">
            WhatsApp'a Bağlan
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Henüz bir WhatsApp oturumu bağlı değil. QR kod oluşturmak için
            aşağıdaki butonu kullanın.
          </p>

          <button
            onClick={fetchQr}
            disabled={actionLoading === 'qr'}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {actionLoading === 'qr' ? 'Başlatılıyor…' : 'QR Kod Oluştur'}
          </button>
        </div>
      )}

      {/* QR (Error) */}
      {status?.status === 'ERROR' && (
        <div className="rounded-lg border border-red-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-foreground">
            Bağlantı Hatası
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            WhatsApp oturum bağlantısında bir hata oluştu.
          </p>

          <button
            onClick={handleReconnect}
            disabled={actionLoading === 'reconnect'}
            className="mt-4 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {actionLoading === 'reconnect'
              ? 'Yeniden bağlanıyor…'
              : 'Yeniden Bağlan'}
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="rounded-lg border border-border bg-white p-6">
        <h2 className="text-lg font-semibold text-foreground">İşlemler</h2>
        <p className="mt-1 text-sm text-gray-500">
          WhatsApp oturumunuzu yönetin
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {status?.status === 'CONNECTED' && (
            <>
              <button
                onClick={handleReconnect}
                disabled={actionLoading === 'reconnect'}
                className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {actionLoading === 'reconnect'
                  ? 'Yeniden bağlanıyor…'
                  : 'Oturumu Yenile'}
              </button>

              <button
                onClick={handleDisconnect}
                disabled={actionLoading === 'disconnect'}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === 'disconnect'
                  ? 'Kesiliyor…'
                  : 'Bağlantıyı Kes'}
              </button>
            </>
          )}

          <button
            onClick={fetchStatus}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50"
          >
            Durumu Kontrol Et
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="text-sm font-semibold text-blue-800">
          WhatsApp Hakkında
        </h3>
        <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-blue-700">
          <li>
            Her firma kendi WhatsApp numarasını bağlayabilir.
          </li>
          <li>
            Bağlantı koptuğunda otomatik olarak yeniden bağlanma denenir.
          </li>
          <li>
            Mesajlar yalnızca bağlı numaradan gönderilir.
          </li>
          <li>
            WAHA API sunucusu çalışmıyorsa bağlantı kurulamaz.
          </li>
        </ul>
      </div>
    </div>
  );
}

// ─── QR Code Display Component ─────────────────

function QrCodeDisplay({ qrData }: { qrData: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function renderQr() {
      if (!canvasRef.current) return;

      try {
        // Dynamically import qrcode library
        const QRCode = (await import('qrcode')).default;
        if (!mounted) return;

        await QRCode.toCanvas(canvasRef.current, qrData, {
          width: 256,
          margin: 2,
          color: {
            dark: '#1f2937',
            light: '#ffffff',
          },
        });
        setQrError(null);
      } catch {
        if (mounted) {
          setQrError('QR kod oluşturulamadı');
        }
      }
    }

    renderQr();

    return () => {
      mounted = false;
    };
  }, [qrData]);

  if (qrError) {
    return (
      <div className="text-center text-sm text-red-600">
        {qrError}
        <p className="mt-1 text-xs text-gray-400 break-all">{qrData}</p>
      </div>
    );
  }

  return <canvas ref={canvasRef} className="mx-auto" />;
}
