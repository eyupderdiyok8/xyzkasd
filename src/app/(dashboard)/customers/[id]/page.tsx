'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { hasRole } from '@/lib/roles';
import { useDashboardSession } from '@/components/DashboardSessionProvider';

interface PhoneInfo {
  id: string;
  label: string;
  number: string;
}

interface AddressInfo {
  id: string;
  label: string;
  address: string;
  city: string;
  district: string;
}

interface DeviceInfo {
  id: string;
  serialNo: string;
  brand: string;
  model: string;
  status: string;
  installDate: string | null;
  _count: { tdsReadings: number; serviceTickets: number };
}

interface TicketInfo {
  id: string;
  ticketNo: string;
  status: string;
  issueDesc: string;
  resolution: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  device: { brand: string; model: string; serialNo: string };
  technician: { id: string; name: string } | null;
}

interface CustomerDetail {
  id: string;
  name: string;
  email: string | null;
  notes: string | null;
  tags: string;
  phone: string;
  address: string | null;
  city: string | null;
  district: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  phones: PhoneInfo[];
  addresses: AddressInfo[];
  devices: DeviceInfo[];
  serviceTickets: TicketInfo[];
  _count?: { devices: number; serviceTickets: number; addresses: number; phones: number };
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const DEVICE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PASSIVE: 'bg-gray-100 text-foreground',
  SCRAP: 'bg-red-100 text-red-800',
};

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { role } = useDashboardSession();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/customers/${params.id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) {
          setError(json.error.message);
          return;
        }
        setCustomer(json.data);
      })
      .catch(() => setError('Yüklenemedi'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleDelete = async () => {
    if (!customer) return;
    if (!confirm(`"${customer.name}" müşterisini silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/customers/${customer.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const json = await res.json();
        alert(json.error?.message || 'Silinemedi');
        return;
      }
      router.push('/customers');
    } catch {
      alert('Silinirken hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700">{error || 'Müşteri bulunamadı'}</p>
        <Link href="/customers" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Müşteri Listesine Dön
        </Link>
      </div>
    );
  }

  const canEdit = hasRole(role, 'technician');

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link href="/customers" className="inline-flex items-center text-sm text-gray-500 hover:text-muted-foreground">
        ← Müşteri Listesi
      </Link>

      {/* Customer Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{customer.name}</h1>
            {customer.tags && customer.tags.split(',').filter(Boolean).map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800"
              >
                {tag.trim()}
              </span>
            ))}
          </div>
          {customer.email && (
            <p className="mt-1 text-sm text-gray-500">{customer.email}</p>
          )}
          {customer.city && (
            <p className="text-sm text-gray-400">
              {customer.district && `${customer.district}, `}{customer.city}
              {customer.address && ` — ${customer.address}`}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Link
              href={`/customers/${customer.id}/edit`}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Düzenle
            </Link>
            <button
              onClick={handleDelete}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Sil
            </button>
          </div>
        )}
      </div>

      {/* Contact Info Card */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Phones */}
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Telefon Numaraları
          </h2>
          {customer.phones.length > 0 ? (
            <ul className="space-y-2">
              {customer.phones.map((p) => (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{p.number}</span>
                  {p.label && (
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{p.label}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Telefon numarası eklenmemiş</p>
          )}
        </div>

        {/* Addresses */}
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Adresler
          </h2>
          {customer.addresses.length > 0 ? (
            <ul className="space-y-3">
              {customer.addresses.map((a) => (
                <li key={a.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-foreground">{a.address}</p>
                      <p className="text-xs text-gray-400">
                        {a.district && `${a.district}, `}{a.city}
                      </p>
                    </div>
                    {a.label && (
                      <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{a.label}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Adres eklenmemiş</p>
          )}
        </div>
      </div>

      {/* Notes */}
      {customer.notes && (
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">Notlar</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{customer.notes}</p>
        </div>
      )}

      {/* Devices */}
      <div className="rounded-lg border border-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            Cihazlar ({customer._count?.devices ?? customer.devices.length})
          </h2>
          <Link
            href={`/devices/new?customerId=${customer.id}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            + Cihaz Ekle
          </Link>
        </div>
        {customer.devices.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {customer.devices.map((d) => (
              <div key={d.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <Link
                    href={`/devices/${d.id}`}
                    className="font-medium text-blue-600 hover:text-blue-800"
                  >
                    {d.brand} {d.model}
                  </Link>
                  <p className="text-xs text-gray-400">Seri: {d.serialNo}</p>
                  {d.installDate && (
                    <p className="text-xs text-gray-400">
                      Kurulum: {new Date(d.installDate).toLocaleDateString('tr-TR')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${DEVICE_STATUS_COLORS[d.status] ?? 'bg-gray-100 text-foreground'}`}>
                    {d.status}
                  </span>
                  <span className="text-xs text-gray-400">
                    {d._count.serviceTickets} servis
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            Bu müşteriye ait cihaz bulunmuyor
          </div>
        )}
      </div>

      {/* Service History */}
      <div className="rounded-lg border border-border bg-white shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold text-foreground">
            Servis Geçmişi ({customer._count?.serviceTickets ?? customer.serviceTickets.length})
          </h2>
        </div>
        {customer.serviceTickets.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {customer.serviceTickets.map((t) => (
              <div key={t.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div>
                    <Link
                      href={`/technician/${t.id}`}
                      className="font-medium text-blue-600 hover:text-blue-800"
                    >
                      {t.ticketNo}
                    </Link>
                    <p className="mt-0.5 text-sm text-gray-600">{t.issueDesc}</p>
                    <p className="text-xs text-gray-400">
                      {t.device.brand} {t.device.model} ({t.device.serialNo})
                      {t.technician && ` — ${t.technician.name}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-foreground'}`}>
                      {t.status}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                </div>
                {t.resolution && (
                  <p className="mt-2 rounded bg-gray-50 p-2 text-xs text-gray-600">
                    {t.resolution}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            Bu müşteriye ait servis kaydı bulunmuyor
          </div>
        )}
      </div>
    </div>
  );
}
