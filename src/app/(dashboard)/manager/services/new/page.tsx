'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CustomerOption {
  id: string;
  name: string;
  phone: string | null;
}
interface DeviceOption {
  id: string;
  serialNo: string;
  brand: string;
  model: string;
  status: string;
  customer: { id: string; name: string } | null;
}
interface TechnicianOption {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
}

export default function NewServiceTicketPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [devices, setDevices] = useState<DeviceOption[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [customerId, setCustomerId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');

  // Filter devices by selected customer
  const filteredDevices = customerId
    ? devices.filter((d) => d.customer?.id === customerId || !d.customer)
    : devices;

  useEffect(() => {
    const load = async () => {
      try {
        const [custRes, devRes, techRes] = await Promise.all([
          fetch('/api/customers?showAll=true'),
          fetch('/api/devices?status=ACTIVE'),
          fetch('/api/users'),
        ]);

        const custJson = await custRes.json();
        const devJson = await devRes.json();
        const techJson = await techRes.json();

        if (!custJson.error) setCustomers(custJson.data ?? []);
        if (!devJson.error) setDevices(devJson.data ?? []);
        if (!techJson.error) {
          setTechnicians(
            (techJson.data ?? []).filter(
              (u: TechnicianOption) => u.role === 'technician',
            ),
          );
        }
      } catch {
        setError('Veriler yüklenemedi');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId || !deviceId || !issueDesc.trim()) {
      setError('Müşteri, cihaz ve arıza açıklaması zorunludur.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/service-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          deviceId,
          technicianId: technicianId || undefined,
          issueDesc: issueDesc.trim(),
          scheduledAt: scheduledAt || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Kaydedilemedi');
      }

      router.push(`/manager/services`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Yeni Servis Kaydı</h1>
        <p className="mt-1 text-sm text-gray-500">
          Teknisyene atamak üzere yeni bir servis çağrısı oluşturun
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Selection */}
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Müşteri</h2>
          <select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setDeviceId(''); // Reset device when customer changes
            }}
            required
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Müşteri seçin...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Device Selection */}
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Cihaz</h2>
          {customerId && filteredDevices.length === 0 ? (
            <p className="text-sm text-gray-400">Bu müşteriye ait aktif cihaz bulunamadı.</p>
          ) : (
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="">Cihaz seçin...</option>
              {filteredDevices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.brand} {d.model} — {d.serialNo}
                  {d.customer?.name && d.customer.id !== customerId
                    ? ` (${d.customer.name})`
                    : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Technician */}
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Atanacak Teknisyen</h2>
          <select
            value={technicianId}
            onChange={(e) => setTechnicianId(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">Sonra ata...</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>
                {t.full_name || t.email || t.id}
              </option>
            ))}
          </select>
        </div>

        {/* Issue Description */}
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Arıza Açıklaması</h2>
          <textarea
            value={issueDesc}
            onChange={(e) => setIssueDesc(e.target.value)}
            required
            rows={4}
            placeholder="Müşteriden alınan arıza bilgisini yazın..."
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Scheduled Date */}
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Planlanan Tarih</h2>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? 'Oluşturuluyor...' : 'Servis Kaydı Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
}
