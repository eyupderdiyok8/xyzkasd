'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

// ─── Types ───────────────────────────────────────

interface PublicTicket {
  id: string;
  ticketNo: string;
  status: string;
  issueDesc: string;
  resolution: string | null;
  createdAt: string;
  completedAt: string | null;
  technician: string | null;
}

interface TenantInfo {
  name: string;
  logo: string | null;
  phone: string | null;
  email: string | null;
}

interface PublicDevice {
  id: string;
  serialNo: string;
  brand: string;
  model: string;
  status: string;
  warrantyStart: string | null;
  warrantyEnd: string | null;
  installDate: string | null;
  tenant: TenantInfo;
  serviceTickets: PublicTicket[];
  _count: { serviceTickets: number };
}

// ─── Helpers ─────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Aktif',
  PASSIVE: 'Pasif',
  SCRAP: 'Hurda',
};

const STATUS_BADGES: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  PASSIVE: 'bg-gray-100 text-gray-600',
  SCRAP: 'bg-red-100 text-red-700',
};

const TICKET_BADGES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const TICKET_LABELS: Record<string, string> = {
  PENDING: 'Bekliyor',
  ASSIGNED: 'Atandı',
  IN_PROGRESS: 'İşlemde',
  COMPLETED: 'Tamamlandı',
  CANCELLED: 'İptal',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function isWarrantyActive(endDate: string | null): boolean | null {
  if (!endDate) return null;
  return new Date(endDate) > new Date();
}

// ─── Page ────────────────────────────────────────

export default function PublicDevicePage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [device, setDevice] = useState<PublicDevice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Service request modal state
  const [showForm, setShowForm] = useState(false);
  const [issueDesc, setIssueDesc] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch device data
  const fetchDevice = useCallback(async () => {
    if (!code) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/qr/${encodeURIComponent(code)}`);
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error?.message || 'Cihaz bilgileri alınamadı');
        return;
      }
      setDevice(json.data);
    } catch {
      setError('Sunucuya bağlanılamadı');
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchDevice();
  }, [fetchDevice]);

  // Submit service request
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!device) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch('/api/public/service-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: device.id,
          issueDesc: issueDesc.trim(),
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        setSubmitError(json.error?.message || 'Talep gönderilemedi');
        return;
      }

      setSubmitSuccess(json.data.message);
      setIssueDesc('');
      setCustomerName('');
      setCustomerPhone('');
    } catch {
      setSubmitError('Sunucu hatası');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render states ───────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="mt-4 text-sm text-gray-500">Cihaz bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-50">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">Cihaz Bulunamadı</h2>
          <p className="mt-2 text-sm text-gray-500">
            {error || 'Bu QR koduna ait cihaz kaydı bulunamadı.'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            QR kodun geçerli olduğundan emin olun veya servis sağlayıcınıza başvurun.
          </p>
        </div>
      </div>
    );
  }

  const warrantyActive = isWarrantyActive(device.warrantyEnd);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      {/* ── Header / Tenant ──────────────────── */}
      <header className="border-b border-white/20 bg-white/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          {device.tenant.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={device.tenant.logo}
              alt={device.tenant.name}
              className="h-10 w-10 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              {device.tenant.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-base font-semibold text-foreground">{device.tenant.name}</h1>
            {device.tenant.phone && (
              <p className="text-xs text-gray-500">{device.tenant.phone}</p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {/* ── Device Card ────────────────────── */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-foreground">
                  {device.brand} {device.model}
                </h2>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    STATUS_BADGES[device.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {STATUS_LABELS[device.status] ?? device.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Seri No: <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs">{device.serialNo}</code>
              </p>
            </div>
          </div>

          {/* Device Info Grid */}
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Kurulum</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {device.installDate ? formatDate(device.installDate) : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Garanti Başlangıç</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {device.warrantyStart ? formatDate(device.warrantyStart) : '—'}
              </p>
            </div>
            <div className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Garanti Bitiş</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {device.warrantyEnd ? formatDate(device.warrantyEnd) : '—'}
              </p>
            </div>
          </div>

          {/* Warranty Status */}
          {warrantyActive !== null && (
            <div className="mt-4">
              {warrantyActive ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Garanti kapsamı devam ediyor</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-3 text-sm text-orange-700">
                  <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="font-medium">Garanti süresi dolmuş</span>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Service History ────────────────── */}
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Servis Geçmişi
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({device._count.serviceTickets})
              </span>
            </h2>
          </div>

          {device.serviceTickets.length > 0 ? (
            <div className="mt-4 space-y-3">
              {device.serviceTickets.map((ticket) => {
                const isCompleted = ticket.status === 'COMPLETED';
                return (
                  <div
                    key={ticket.id}
                    className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-foreground">
                            {ticket.ticketNo}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              TICKET_BADGES[ticket.status] ?? 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {TICKET_LABELS[ticket.status] ?? ticket.status}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-muted-foreground">{ticket.issueDesc}</p>
                        {ticket.resolution && (
                          <div className="mt-2 rounded-lg border border-green-100 bg-green-50/50 px-3 py-2 text-xs text-gray-600">
                            <span className="font-medium text-green-700">Çözüm:</span>{' '}
                            {ticket.resolution}
                          </div>
                        )}
                        {ticket.technician && (
                          <p className="mt-1.5 text-xs text-gray-400">
                            Teknisyen: {ticket.technician}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <time className="whitespace-nowrap text-xs text-gray-400">
                          {formatDate(ticket.createdAt)}
                        </time>
                        {isCompleted && ticket.completedAt && (
                          <time className="whitespace-nowrap text-xs text-gray-400">
                            ✓ {formatDate(ticket.completedAt)}
                          </time>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 py-8 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="mt-3 text-sm text-gray-400">Bu cihaza ait servis kaydı bulunmuyor</p>
            </div>
          )}
        </section>

        {/* ── Service Request Button ─────────── */}
        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setSubmitSuccess(null);
              setSubmitError(null);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-200 transition-all hover:bg-primary/90 hover:shadow-xl active:scale-[0.98]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
            Servis Talep Et
          </button>
          <p className="mt-2 text-xs text-gray-400">
            Cihazınızla ilgili bir sorun mu var? Servis talebi oluşturun.
          </p>
        </div>

        {/* ── Service Request Modal ──────────── */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowForm(false)}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Servis Talebi</h3>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Device summary */}
              <div className="mb-4 rounded-xl bg-gray-50 p-3 text-sm">
                <p className="font-medium text-foreground">
                  {device.brand} {device.model}
                </p>
                <p className="text-xs text-gray-500">Seri No: {device.serialNo}</p>
              </div>

              {submitSuccess ? (
                <div className="rounded-xl bg-emerald-50 p-6 text-center">
                  <svg
                    className="mx-auto h-12 w-12 text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-3 text-sm font-medium text-emerald-800">{submitSuccess}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setSubmitSuccess(null);
                    }}
                    className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
                  >
                    Kapat
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="issueDesc" className="block text-sm font-medium text-muted-foreground">
                      Sorun Açıklaması *
                    </label>
                    <textarea
                      id="issueDesc"
                      rows={4}
                      required
                      minLength={10}
                      value={issueDesc}
                      onChange={(e) => setIssueDesc(e.target.value)}
                      placeholder="Cihazınızla ilgili sorunu detaylıca açıklayın..."
                      className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      En az 10 karakter
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="customerName" className="block text-sm font-medium text-muted-foreground">
                        Adınız
                      </label>
                      <input
                        id="customerName"
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Adınız Soyadınız"
                        className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="customerPhone" className="block text-sm font-medium text-muted-foreground">
                        Telefon
                      </label>
                      <input
                        id="customerPhone"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="05XX XXX XX XX"
                        className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {submitError && (
                    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                      {submitError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Gönderiliyor...
                      </span>
                    ) : (
                      'Servis Talebini Gönder'
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-400">
                    Talebiniz alındıktan sonra en kısa sürede size dönüş yapılacaktır.
                  </p>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/20 bg-white/30 py-6 text-center">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} {device.tenant.name}
        </p>
      </footer>
    </div>
  );
}
