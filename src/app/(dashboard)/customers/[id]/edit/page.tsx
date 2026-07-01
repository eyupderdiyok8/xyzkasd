'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CustomerForm from '@/components/CustomerForm';
import Link from 'next/link';

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const [initialData, setInitialData] = useState<any>(null);
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
        const c = json.data;
        setInitialData({
          name: c.name,
          email: c.email ?? '',
          notes: c.notes ?? '',
          tags: c.tags ?? '',
          phones: (c.phones ?? []).map((p: any) => ({
            id: p.id,
            label: p.label,
            number: p.number,
          })),
          addresses: (c.addresses ?? []).map((a: any) => ({
            id: a.id,
            label: a.label,
            address: a.address,
            city: a.city,
            district: a.district,
          })),
        });
      })
      .catch(() => setError('Müşteri bilgileri yüklenemedi'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  if (error || !initialData) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-700">{error || 'Müşteri bulunamadı'}</p>
        <Link href="/customers" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Müşteri Listesine Dön
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Müşteri Düzenle</h1>
        <p className="mt-1 text-sm text-gray-500">
          Müşteri bilgilerini güncelleyin
        </p>
      </div>
      <CustomerForm initialData={initialData} customerId={params.id as string} />
    </div>
  );
}
