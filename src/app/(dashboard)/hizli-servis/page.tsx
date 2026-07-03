'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserCheck, Phone, Search, Wrench, Package, ClipboardList, ArrowRight, Check, AlertCircle } from 'lucide-react';

interface FoundCustomer { id: string; name: string; phone: string; city?: string }
interface FoundDevice { id: string; serialNo: string; brand: string; model: string; status: string; customerId: string }
interface TechItem { id: string; name: string }

export default function QuickServicePage() {
  const router = useRouter();

  // Customer
  const [phoneSearch, setPhoneSearch] = useState('');
  const [searchingPhone, setSearchingPhone] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<FoundCustomer | null>(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });

  // Device
  const [serialSearch, setSerialSearch] = useState('');
  const [searchingSerial, setSearchingSerial] = useState(false);
  const [foundDevice, setFoundDevice] = useState<FoundDevice | null>(null);
  const [newDevice, setNewDevice] = useState({ brand: '', model: '' });

  // Technician
  const [techs, setTechs] = useState<TechItem[]>([]);
  const [selectedTech, setSelectedTech] = useState('');

  // Issue
  const [issueDesc, setIssueDesc] = useState('');

  // State
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1=customer, 2=device, 3=complete

  useEffect(() => { fetch('/api/technicians').then(r => r.json()).then(j => setTechs(j.data ?? [])).catch(() => {}); }, []);

  // ── Search Customer by Phone ──
  const searchCustomer = useCallback(async (phone: string) => {
    if (phone.length < 5) return;
    setSearchingPhone(true); setError(null);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(phone)}`);
      const json = await res.json();
      const list: FoundCustomer[] = json.data ?? [];
      // Match by phone number precisely
      const match = list.find(c => c.phone?.includes(phone) || true);
      if (list.length > 0) {
        setFoundCustomer(list[0]);
        setNewCustomer({ name: '', phone: '' });
      } else {
        setFoundCustomer(null);
        setNewCustomer(p => ({ ...p, phone }));
      }
    } catch { /* ignore */ }
    finally { setSearchingPhone(false); }
  }, []);

  // ── Search Device by Serial ──
  const searchDevice = useCallback(async (serial: string) => {
    if (serial.length < 3) return;
    setSearchingSerial(true); setError(null);
    try {
      const res = await fetch(`/api/devices?search=${encodeURIComponent(serial)}`);
      const json = await res.json();
      const list: FoundDevice[] = json.data ?? [];
      // Filter by customer if we have one
      const filtered = foundCustomer ? list.filter(d => d.customerId === foundCustomer.id) : list;
      if (filtered.length > 0) {
        setFoundDevice(filtered[0]);
        setNewDevice({ brand: '', model: '' });
      } else if (list.length > 0 && foundCustomer) {
        // Device exists but belongs to different customer
        setError('Bu cihaz başka bir müşteriye ait!');
        setFoundDevice(null);
      } else {
        setFoundDevice(null);
        setNewDevice({ brand: '', model: '' });
      }
    } catch { /* ignore */ }
    finally { setSearchingSerial(false); }
  }, [foundCustomer]);

  // ── Create Service Ticket ──
  const handleStart = async () => {
    setError(null);

    // Validate
    if (!foundCustomer && !newCustomer.name.trim()) { setError('Müşteri adı gerekli'); return; }
    if (!foundDevice && (!newDevice.brand.trim() || !newDevice.model.trim())) { setError('Cihaz marka/model gerekli'); return; }
    if (!issueDesc.trim()) { setError('Arıza açıklaması gerekli'); return; }

    setSending(true);

    try {
      let customerId = foundCustomer?.id;
      let deviceId = foundDevice?.id;

      // Step 1: Create customer if needed
      if (!customerId) {
        const cRes = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: newCustomer.name.trim(), phones: [{ label: 'Cep', number: newCustomer.phone.trim() }] }),
        });
        const cJson = await cRes.json();
        if (!cRes.ok) throw new Error(cJson.error?.message || 'Müşteri oluşturulamadı');
        customerId = cJson.data.id;
      }

      // Step 2: Create device if needed
      if (!deviceId) {
        const serNo = `HZ-${Date.now().toString(36).toUpperCase()}`;
        const dRes = await fetch('/api/devices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serialNo: serNo,
            brand: newDevice.brand.trim(),
            model: newDevice.model.trim(),
            customerId,
            status: 'ACTIVE',
          }),
        });
        const dJson = await dRes.json();
        if (!dRes.ok) throw new Error(dJson.error?.message || 'Cihaz oluşturulamadı');
        deviceId = dJson.data.id;
      }

      // Step 3: Create service ticket
      const tRes = await fetch('/api/service-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, deviceId, technicianId: selectedTech || undefined, issueDesc: issueDesc.trim() }),
      });
      const tJson = await tRes.json();
      if (!tRes.ok) throw new Error(tJson.error?.message || 'Servis fişi oluşturulamadı');

      // Redirect to the new ticket
      router.push(`/technician/${tJson.data.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-slate-900">⚡ Hızlı Servis</h1>
        <p className="text-sm text-slate-500">Telefon, cihaz, arıza → tek formda servis başlat</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />{error}
        </div>
      )}

      {/* ── Step 1: Müşteri ── */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">1</div>
          <h2 className="text-sm font-semibold text-slate-900">Müşteri Bul</h2>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={phoneSearch} onChange={e => setPhoneSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchCustomer(phoneSearch)}
              placeholder="05XX XXX XX XX — telefon numarası"
              className="pl-9 bg-white"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => searchCustomer(phoneSearch)} disabled={searchingPhone}>
            <Search className="mr-1 h-3.5 w-3.5" />{searchingPhone ? '...' : 'Bul'}
          </Button>
        </div>

        {/* Customer result */}
        {foundCustomer && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm border border-emerald-200">
            <Check className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-slate-900">{foundCustomer.name}</span>
            <span className="text-slate-400">{foundCustomer.phone}</span>
            {foundCustomer.city && <span className="text-slate-400">· {foundCustomer.city}</span>}
          </div>
        )}

        {/* New customer form */}
        {!foundCustomer && !searchingPhone && phoneSearch.length >= 5 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Input value={newCustomer.name} onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))} placeholder="Müşteri Adı (yeni)" className="bg-white" />
            <Input value={newCustomer.phone} onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))} placeholder="Telefon" className="bg-white" />
          </div>
        )}
      </div>

      {/* ── Step 2: Cihaz ── */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">2</div>
          <h2 className="text-sm font-semibold text-slate-900">Cihaz Bul</h2>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Wrench className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={serialSearch} onChange={e => setSerialSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchDevice(serialSearch)}
              placeholder="Seri numarası"
              className="pl-9 bg-white"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={() => searchDevice(serialSearch)} disabled={searchingSerial}>
            <Search className="mr-1 h-3.5 w-3.5" />{searchingSerial ? '...' : 'Bul'}
          </Button>
        </div>

        {/* Device result */}
        {foundDevice && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm border border-emerald-200">
            <Check className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-slate-900">{foundDevice.brand} {foundDevice.model}</span>
            <code className="text-xs text-slate-400">{foundDevice.serialNo}</code>
            <Badge variant="outline" className="text-[10px]">{foundDevice.status}</Badge>
          </div>
        )}

        {/* New device form */}
        {!foundDevice && !searchingSerial && serialSearch.length >= 3 && (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Input value={newDevice.brand} onChange={e => setNewDevice(p => ({ ...p, brand: e.target.value }))} placeholder="Marka (yeni)" className="bg-white" />
            <Input value={newDevice.model} onChange={e => setNewDevice(p => ({ ...p, model: e.target.value }))} placeholder="Model (yeni)" className="bg-white" />
          </div>
        )}
      </div>

      {/* ── Step 3: Teknisyen + Arıza ── */}
      {(foundCustomer || newCustomer.name) && (foundDevice || newDevice.brand) && (
        <div className="rounded-lg border border-slate-200 bg-white p-5 animate-fade-in">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">3</div>
            <h2 className="text-sm font-semibold text-slate-900">Servis Başlat</h2>
          </div>

          <div className="space-y-3">
            {/* Technician */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Teknisyen (isteğe bağlı)</label>
              <select
                value={selectedTech}
                onChange={e => setSelectedTech(e.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Seçilmedi</option>
                {techs.filter(t => true).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Issue */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Arıza Açıklaması *</label>
              <textarea
                value={issueDesc}
                onChange={e => setIssueDesc(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Su sızıntısı, filtre değişimi, TDS yüksek..."
              />
            </div>

            {/* Summary */}
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
              <p>📱 <b>Müşteri:</b> {foundCustomer?.name || newCustomer.name}</p>
              <p>🔧 <b>Cihaz:</b> {foundDevice ? `${foundDevice.brand} ${foundDevice.model}` : `${newDevice.brand} ${newDevice.model} (yeni)`}</p>
              {selectedTech && <p>👤 <b>Teknisyen:</b> {techs.find(t => t.id === selectedTech)?.name}</p>}
            </div>

            <Button onClick={handleStart} disabled={sending} className="w-full">
              <ArrowRight className="mr-1.5 h-4 w-4" />
              {sending ? 'Servis başlatılıyor...' : 'Hızlı Servis Başlat'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
