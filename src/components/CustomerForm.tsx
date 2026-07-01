'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TenantSelect from '@/components/TenantSelect';
import { Plus, X, Save, AlertCircle } from 'lucide-react';

interface PhoneEntry {
  id?: string;
  label: string;
  number: string;
}

interface AddressEntry {
  id?: string;
  label: string;
  address: string;
  city: string;
  district: string;
}

interface CustomerFormData {
  name: string;
  email: string;
  notes: string;
  tags: string;
  phones: PhoneEntry[];
  addresses: AddressEntry[];
}

interface CustomerFormProps {
  initialData?: CustomerFormData;
  customerId?: string;
}

const emptyForm: CustomerFormData = {
  name: '', email: '', notes: '', tags: '',
  phones: [{ label: 'Cep', number: '' }],
  addresses: [{ label: 'Ev', address: '', city: '', district: '' }],
};

const LABEL_CLASS = 'block text-xs font-medium text-muted-foreground mb-1.5';

export default function CustomerForm({ initialData, customerId }: CustomerFormProps) {
  const router = useRouter();
  // Merge initialData defensively in case edit API returns partial data
  const [form, setForm] = useState<CustomerFormData>({
    ...emptyForm,
    ...initialData,
    phones: initialData?.phones?.length ? initialData.phones : emptyForm.phones,
    addresses: initialData?.addresses?.length ? initialData.addresses : emptyForm.addresses,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const isEdit = !!customerId;

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(j => {
        if (j.data?.role === 'super_admin') setIsSuperAdmin(true);
      })
      .catch(() => {});
  }, []);

  const updateField = (field: keyof CustomerFormData, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updatePhone = (index: number, field: keyof PhoneEntry, value: string) => {
    setForm((prev) => {
      const phones = [...prev.phones];
      phones[index] = { ...phones[index], [field]: value };
      return { ...prev, phones };
    });
  };

  const addPhone = () => setForm(p => ({ ...p, phones: [...p.phones, { label: '', number: '' }] }));
  const removePhone = (i: number) => setForm(p => ({ ...p, phones: p.phones.filter((_, idx) => idx !== i) }));

  const updateAddress = (index: number, field: keyof AddressEntry, value: string) => {
    setForm((prev) => {
      const addresses = [...prev.addresses];
      addresses[index] = { ...addresses[index], [field]: value };
      return { ...prev, addresses };
    });
  };

  const addAddress = () => setForm(p => ({ ...p, addresses: [...p.addresses, { label: '', address: '', city: '', district: '' }] }));
  const removeAddress = (i: number) => setForm(p => ({ ...p, addresses: p.addresses.filter((_, idx) => idx !== i) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Müşteri adı zorunludur'); return; }
    if (isSuperAdmin && !tenantId) { setError('Süper admin olarak bir firma seçmelisiniz'); return; }
    setSaving(true); setError(null);
    try {
      const url = isEdit ? `/api/customers/${customerId}` : '/api/customers';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim() || undefined,
          notes: form.notes.trim() || undefined,
          tags: form.tags.trim() || undefined,
          phones: form.phones.filter((p) => p.number.trim()),
          addresses: form.addresses.filter((a) => a.address.trim()),
          tenantId: isSuperAdmin ? tenantId || undefined : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error?.message || 'Kaydedilirken hata oluştu'); return; }
      router.push(`/customers/${json.data.id}`);
      router.refresh();
    } catch { setError('Sunucuya bağlanılamadı'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      )}

      {/* Super admin tenant selector */}
      {isSuperAdmin && !isEdit && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Firma Seçimi</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              Süper admin olarak müşteriyi hangi firmaya eklemek istediğinizi seçin.
            </p>
            <TenantSelect value={tenantId} onChange={setTenantId} />
          </CardContent>
        </Card>
      )}

      {/* Basic Info */}
      <Card>
        <CardHeader className="pb-4"><CardTitle className="text-base">Temel Bilgiler</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className={LABEL_CLASS}>Müşteri Adı <span className="text-destructive">*</span></label>
            <Input value={form.name} onChange={e => updateField('name', e.target.value)} placeholder="Ad Soyad" required />
          </div>
          <div>
            <label className={LABEL_CLASS}>E-posta</label>
            <Input type="email" value={form.email} onChange={e => updateField('email', e.target.value)} placeholder="ornek@email.com" />
          </div>
          <div>
            <label className={LABEL_CLASS}>Etiketler</label>
            <Input value={form.tags} onChange={e => updateField('tags', e.target.value)} placeholder="VIP, bayi (virgülle ayırın)" />
          </div>
          <div>
            <label className={LABEL_CLASS}>Notlar</label>
            <textarea
              value={form.notes} onChange={e => updateField('notes', e.target.value)} rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-placeholder focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Müşteri ile ilgili notlar..."
            />
          </div>
        </CardContent>
      </Card>

      {/* Phones */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Telefon Numaraları</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={addPhone}>
              <Plus className="mr-1 h-3.5 w-3.5" />Telefon Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {form.phones.map((phone, i) => (
            <div key={i} className="flex gap-2 items-start">
              <select
                value={phone.label}
                onChange={e => updatePhone(i, 'label', e.target.value)}
                className="h-10 w-24 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Cep">Cep</option>
                <option value="İş">İş</option>
                <option value="Ev">Ev</option>
                <option value="">Diğer</option>
              </select>
              <Input
                type="tel" value={phone.number}
                onChange={e => updatePhone(i, 'number', e.target.value)}
                placeholder="05XX XXX XX XX" className="flex-1"
              />
              {form.phones.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => removePhone(i)} className="shrink-0 text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Addresses */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Adresler</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={addAddress}>
              <Plus className="mr-1 h-3.5 w-3.5" />Adres Ekle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.addresses.map((addr, i) => (
            <div key={i} className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="flex items-start justify-between mb-3">
                <select
                  value={addr.label}
                  onChange={e => updateAddress(i, 'label', e.target.value)}
                  className="h-9 w-24 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="Ev">Ev</option>
                  <option value="İş">İş</option>
                  <option value="Yazlık">Yazlık</option>
                  <option value="">Diğer</option>
                </select>
                {form.addresses.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeAddress(i)} className="text-muted-foreground hover:text-destructive">
                    <X className="mr-1 h-3.5 w-3.5" />Kaldır
                  </Button>
                )}
              </div>
              <Input
                value={addr.address}
                onChange={e => updateAddress(i, 'address', e.target.value)}
                placeholder="Mahalle, Sokak, No: ..." className="mb-2"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input value={addr.city} onChange={e => updateAddress(i, 'city', e.target.value)} placeholder="İl" />
                <Input value={addr.district} onChange={e => updateAddress(i, 'district', e.target.value)} placeholder="İlçe" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()}>İptal</Button>
        <Button type="submit" disabled={saving}>
          <Save className="mr-1.5 h-4 w-4" />
          {saving ? 'Kaydediliyor...' : isEdit ? 'Güncelle' : 'Müşteri Ekle'}
        </Button>
      </div>
    </form>
  );
}
