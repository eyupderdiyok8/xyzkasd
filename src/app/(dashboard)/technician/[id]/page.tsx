'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  getTicket as getOfflineTicket,
  saveTicket as saveOfflineTicket,
  savePendingForm,
  savePendingPhoto,
  savePendingPayment,
} from '@/lib/offline/db';
import { isOnline } from '@/lib/offline/sync-queue';

// ─── Types ──────────────────────────────────────

interface FilterCatalog {
  id: string;
  name: string;
  sku: string | null;
  stage: string;
  sortOrder: number;
}

interface FilterChangeInfo {
  id: string;
  filterId: string;
  quantity: number;
  notes: string | null;
  filter: { id: string; name: string; stage: string; sku: string | null };
}

interface PhotoInfo {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  photoType: string;
  createdAt: string;
}

interface TicketDetail {
  id: string;
  ticketNo: string;
  status: string;
  issueDesc: string;
  workDone: string | null;
  customerNote: string | null;
  resolution: string | null;
  tdsBefore: number | null;
  tdsAfter: number | null;
  pressureBefore: number | null;
  pressureAfter: number | null;
  leakCheck: boolean | null;
  leakNotes: string | null;
  signatureDataUrl: string | null;
  signatureName: string | null;
  pdfStoragePath: string | null;
  expenses: string | null;
  completedAt: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    city: string | null;
    district: string | null;
  };
  device: {
    id: string;
    serialNo: string;
    brand: string;
    model: string;
    installDate: string | null;
    status: string;
  };
  technician: { id: string; name: string; phone: string | null } | null;
  photos: PhotoInfo[];
  filterChanges: FilterChangeInfo[];
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Nakit',
  CREDIT_CARD: 'Kredi Kartı',
  BANK_TRANSFER: 'Banka Transferi',
  PROMISSORY_NOTE: 'Senet',
  DEFERRED: 'İleri Tarihli',
};

const STAGE_LABELS: Record<string, string> = {
  SEDIMENT: 'Sediment',
  CARBON_BLOCK: 'Karbon Blok',
  GAC: 'Granül Aktif Karbon',
  MEMBRANE: 'Membran',
  POST_CARBON: 'Son Karbon',
  UV: 'UV',
  ALKALINE: 'Alkali',
  MINERAL: 'Mineral',
  OTHER: 'Diğer',
};

const supabase = createClient();

// ─── Signature Canvas Component ─────────────────

function SignaturePad({
  onSave,
  onClear,
  dataUrl,
  canvasRef,
}: {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
  dataUrl?: string | null;
  canvasRef?: React.RefObject<HTMLCanvasElement>;
}) {
  const internalRef = useRef<HTMLCanvasElement>(null!);
  const canvasRefUsed = canvasRef ?? internalRef;
  const [hasDrawn, setHasDrawn] = useState(false);
  const isDrawingRef = useRef(false);
  const setIsDrawing = (v: boolean) => { isDrawingRef.current = v; };

  // ── Load existing signature ──────────────
  useEffect(() => {
    const canvas = canvasRefUsed.current;
    if (!canvas || !dataUrl) return;

    const img = new Image();
    const draw = () => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHasDrawn(true);
    };
    if (img.complete) { draw(); } else { img.onload = draw; }
    img.src = dataUrl;
    return () => { img.onload = null; };
  }, [dataUrl]);

  // ── Native touch listeners (non‑passive) ─
  useEffect(() => {
    const canvas = canvasRefUsed.current;
    if (!canvas) return;

    const getPos = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const pos = getPos(touch.clientX, touch.clientY);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      setIsDrawing(true);
      setHasDrawn(true);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (!isDrawingRef.current) return;
      const touch = e.touches[0];
      if (!touch) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const pos = getPos(touch.clientX, touch.clientY);
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#000';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const onTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      setIsDrawing(false);
    };

    canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // ── Mouse drawing (desktop fallback) ─────
  const getMousePos = (e: React.MouseEvent) => {
    const canvas = canvasRefUsed.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent) => {
    e.preventDefault();
    const ctx = canvasRefUsed.current?.getContext('2d');
    if (!ctx) return;
    const pos = getMousePos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isDrawingRef.current) return;
    const ctx = canvasRefUsed.current?.getContext('2d');
    if (!ctx) return;
    const pos = getMousePos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleSave = () => {
    const canvas = canvasRefUsed.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  const handleClear = () => {
    const canvas = canvasRefUsed.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onClear();
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRefUsed}
        width={400}
        height={120}
        className="w-full rounded-lg border border-gray-300 bg-white"
        style={{ maxWidth: '100%', touchAction: 'none' }}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasDrawn}
          className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          İmzayı Kaydet
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="rounded bg-gray-200 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-gray-300"
        >
          Temizle
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────

export default function ServiceRecordPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [offlineSaved, setOfflineSaved] = useState(false);

  // Available filters from catalog
  const [filterCatalog, setFilterCatalog] = useState<FilterCatalog[]>([]);

  // ── Form Fields ─────────────────────────────
  const [tdsBefore, setTdsBefore] = useState('');
  const [tdsAfter, setTdsAfter] = useState('');
  const [pressureBefore, setPressureBefore] = useState('');
  const [pressureAfter, setPressureAfter] = useState('');
  const [leakCheck, setLeakCheck] = useState<boolean | null>(null);
  const [leakNotes, setLeakNotes] = useState('');
  const [workDone, setWorkDone] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [resolution, setResolution] = useState('');

  // Filter changes
  const [selectedFilters, setSelectedFilters] = useState<
    Array<{ filterId: string; quantity: number; notes: string }>
  >([]);

  // Signature
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [signatureName, setSignatureName] = useState('');
  const signatureCanvasRef = useRef<HTMLCanvasElement>(null!);

  // Photos
  const [uploading, setUploading] = useState(false);
  const [photoType, setPhotoType] = useState('GENERAL');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Payment
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [installmentCount, setInstallmentCount] = useState('');
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [existingPayment, setExistingPayment] = useState<{
    id: string; amount: number; paymentMethod: string;
    status: string; installmentCount: number | null;
    dueDate: string | null; notes: string | null;
  } | null>(null);
  const [paymentSaving, setPaymentSaving] = useState(false);

  // ── Load Data ───────────────────────────────
  useEffect(() => {
    if (!ticketId) return;

    const load = async () => {
      try {
        const [ticketRes, filterRes] = await Promise.all([
          fetch(`/api/service-tickets/${ticketId}`),
          fetch('/api/filters'),
        ]);

        const ticketJson = await ticketRes.json();
        if (ticketJson.error) {
          // API returned error — try IndexedDB cache
          const cached = await getOfflineTicket(ticketId);
          if (cached) {
            setTicket(cached.data as TicketDetail);
            populateForm(cached.data as TicketDetail);
            const fj = await filterRes.json();
            if (!fj.error) setFilterCatalog(fj.data ?? []);
            setLoading(false);
            return;
          }
          setError(ticketJson.error.message);
          return;
        }
        const d = ticketJson.data as TicketDetail;
        setTicket(d);
        populateForm(d);

        // Cache ticket in IndexedDB for offline access
        try { await saveOfflineTicket(d as unknown as Record<string, unknown>); } catch { /* best-effort */ }

        const filterJson = await filterRes.json();
        if (!filterJson.error) {
          setFilterCatalog(filterJson.data ?? []);
        }

        // Load existing payment if any
        try {
          const payRes = await fetch(`/api/payments?ticketId=${ticketId}`);
          const payJson = await payRes.json();
          if (payJson.data) {
            const p = payJson.data;
            setExistingPayment(p);
            setPaymentAmount(String(p.amount));
            setPaymentMethod(p.paymentMethod);
            if (p.installmentCount) setInstallmentCount(String(p.installmentCount));
            if (p.dueDate) setPaymentDueDate(p.dueDate.split('T')[0]);
            if (p.notes) setPaymentNotes(p.notes);
          }
        } catch { /* payment load is optional */ }
      } catch {
        // Network error — try IndexedDB fallback
        const cached = await getOfflineTicket(ticketId);
        if (cached) {
          setTicket(cached.data as TicketDetail);
          populateForm(cached.data as TicketDetail);
        } else {
          setError('Veriler yüklenemedi. İnternet bağlantınızı kontrol edin.');
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [ticketId]);

  // ── Populate form fields from ticket data ──
  function populateForm(d: TicketDetail) {
    if (d.tdsBefore != null) setTdsBefore(String(d.tdsBefore));
    if (d.tdsAfter != null) setTdsAfter(String(d.tdsAfter));
    if (d.pressureBefore != null) setPressureBefore(String(d.pressureBefore));
    if (d.pressureAfter != null) setPressureAfter(String(d.pressureAfter));
    if (d.leakCheck != null) setLeakCheck(d.leakCheck);
    if (d.leakNotes) setLeakNotes(d.leakNotes);
    if (d.workDone) setWorkDone(d.workDone);
    if (d.customerNote) setCustomerNote(d.customerNote);
    if (d.resolution) setResolution(d.resolution);
    if (d.signatureDataUrl) setSignatureDataUrl(d.signatureDataUrl);
    if (d.signatureName) setSignatureName(d.signatureName);
    if (d.pdfStoragePath) {
      const { data } = supabase.storage.from('service-reports').getPublicUrl(d.pdfStoragePath);
      setPdfUrl(data.publicUrl);
    }
    if (d.filterChanges?.length > 0) {
      setSelectedFilters(
        d.filterChanges.map((fc: FilterChangeInfo) => ({
          filterId: fc.filterId,
          quantity: fc.quantity,
          notes: fc.notes ?? '',
        })),
      );
    }
  }

  // ── Filter Selection ────────────────────────
  const toggleFilter = (filterId: string) => {
    setSelectedFilters((prev) => {
      const exists = prev.find((f) => f.filterId === filterId);
      if (exists) return prev.filter((f) => f.filterId !== filterId);
      return [...prev, { filterId, quantity: 1, notes: '' }];
    });
  };

  const updateFilterQty = (filterId: string, quantity: number) => {
    setSelectedFilters((prev) =>
      prev.map((f) => (f.filterId === filterId ? { ...f, quantity: Math.max(1, quantity) } : f)),
    );
  };

  // ── Photo Upload ────────────────────────────
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !ticket) return;

    setUploading(true);

    // If offline, store as base64 in IndexedDB
    if (!isOnline()) {
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64data = reader.result as string;
          try {
            await savePendingPhoto({
              ticketId: ticket.id,
              fileName: file.name,
              base64data,
              mimeType: file.type,
            });
            setSuccess('📷 Fotoğraf kaydedildi, internet gelince gönderilecek.');
          } catch {
            setError('Fotoğraf kaydedilemedi.');
          }
        };
        reader.onerror = () => setError('Fotoğraf okunamadı.');
        reader.readAsDataURL(file);
      } catch (err: any) {
        setError(err.message || 'Fotoğraf kaydedilemedi');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
      return;
    }

    // Online — normal flow
    try {
      const metaRes = await fetch(`/api/service-tickets/${ticket.id}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, photoType }),
      });
      if (!metaRes.ok) {
        const err = await metaRes.json();
        throw new Error(err.error?.message || 'Fotoğraf kaydedilemedi');
      }
      const { data } = await metaRes.json();
      const { error: uploadErr } = await supabase.storage
        .from('service-photos')
        .upload(data.photo.storagePath, file, { contentType: file.type, upsert: true });
      if (uploadErr) throw uploadErr;
      const res = await fetch(`/api/service-tickets/${ticket.id}`);
      const json = await res.json();
      if (!json.error) setTicket(json.data);
    } catch (err: any) {
      alert(err.message || 'Yükleme başarısız');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Save ticket to IndexedDB ────────────────
  const cacheTicket = async () => {
    if (!ticket) return;
    try { await saveOfflineTicket(ticket as unknown as Record<string, unknown>); } catch { /* best-effort */ }
  };

  // ── Complete Service ────────────────────────
  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;

    // Auto-capture signature from canvas if not saved yet
    let sigUrl = signatureDataUrl;
    if (!sigUrl && signatureCanvasRef.current) {
      const canvas = signatureCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (imageData) {
        const hasContent = imageData.data.some((v, i) => i % 4 === 3 && v > 0);
        if (hasContent) sigUrl = canvas.toDataURL('image/png');
      }
    }

    const payAmount = paymentAmount ? Number(paymentAmount) : 0;
    const body: Record<string, unknown> = {
      tdsBefore: tdsBefore ? Number(tdsBefore) : null,
      tdsAfter: tdsAfter ? Number(tdsAfter) : null,
      pressureBefore: pressureBefore ? Number(pressureBefore) : null,
      pressureAfter: pressureAfter ? Number(pressureAfter) : null,
      leakCheck,
      leakNotes: leakNotes || null,
      workDone: workDone || null,
      customerNote: customerNote || null,
      resolution: resolution || null,
      signatureDataUrl: sigUrl,
      signatureName: signatureName || null,
      filterChanges: selectedFilters.map((f) => ({
        filterId: f.filterId, quantity: f.quantity, notes: f.notes || null,
      })),
    };

    if (payAmount <= 0) {
      setError('Lütfen tahsilat tutarını girin. Ücretsiz servis ise 0 girebilirsiniz.');
      return;
    }

    const confirmMsg = payAmount > 0
      ? `${payAmount.toLocaleString('tr-TR')}₺ - ${METHOD_LABELS[paymentMethod] ?? paymentMethod} ile tahsilat yapılacak. Servisi tamamlamak istediğinize emin misiniz?`
      : 'Ücretsiz servis olarak tamamlanacak. Emin misiniz?';

    if (!confirm(confirmMsg)) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    setOfflineSaved(false);

    // ── OFFLINE MODE ──────────────────────────────
    if (!isOnline()) {
      try {
        await cacheTicket();
        await savePendingForm({ ticketId: ticket.id, formData: body });
        if (payAmount > 0 && !existingPayment) {
          await savePendingPayment({
            ticketId: ticket.id,
            paymentData: {
              ticketId: ticket.id,
              customerId: ticket.customer.id,
              amount: payAmount,
              paymentMethod,
              installmentCount: installmentCount ? Number(installmentCount) : null,
              dueDate: paymentDueDate || null,
              notes: paymentNotes || null,
            },
          });
        }
        setOfflineSaved(true);
        setSuccess('📋 Form kaydedildi, internet gelince gönderilecek.');
        setTicket({
          ...ticket,
          status: 'COMPLETED',
          tdsBefore: tdsBefore ? Number(tdsBefore) : null,
          tdsAfter: tdsAfter ? Number(tdsAfter) : null,
          pressureBefore: pressureBefore ? Number(pressureBefore) : null,
          pressureAfter: pressureAfter ? Number(pressureAfter) : null,
          leakCheck,
          leakNotes: leakNotes || null,
          workDone: workDone || null,
          customerNote: customerNote || null,
          resolution: resolution || null,
          signatureDataUrl: sigUrl,
          signatureName: signatureName || null,
          completedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        setError(err.message || 'Çevrimdışı kayıt sırasında bir hata oluştu');
      } finally {
        setSaving(false);
        setPaymentSaving(false);
      }
      return;
    }

    // ── ONLINE MODE ───────────────────────────────
    try {
      await cacheTicket();

      if (payAmount > 0 && !existingPayment) {
        setPaymentSaving(true);
        const payRes = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticketId: ticket.id,
            customerId: ticket.customer.id,
            amount: payAmount,
            paymentMethod,
            installmentCount: installmentCount ? Number(installmentCount) : null,
            dueDate: paymentDueDate || null,
            notes: paymentNotes || null,
          }),
        });
        if (!payRes.ok) {
          const payErr = await payRes.json();
          throw new Error(payErr.error?.message || 'Tahsilat kaydedilemedi');
        }
        setPaymentSaving(false);
      }

      const res = await fetch(`/api/service-tickets/${ticket.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Kaydedilemedi');

      setTicket(json.data);
      setSuccess(
        payAmount > 0
          ? `✅ Servis tamamlandı, ${payAmount.toLocaleString('tr-TR')}₺ tahsilat kaydedildi!`
          : '✅ Servis başarıyla tamamlandı!',
      );
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setSaving(false);
      setPaymentSaving(false);
    }
  };

  // ── Generate PDF Report ─────────────────────
  const handleGeneratePdf = async () => {
    if (!ticket) return;
    setGeneratingPdf(true);
    setError(null);
    try {
      const res = await fetch(`/api/service-tickets/${ticket.id}/report`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'PDF oluşturulamadı');
      setPdfUrl(json.data.publicUrl);
      const ticketRes = await fetch(`/api/service-tickets/${ticket.id}`);
      const ticketJson = await ticketRes.json();
      if (!ticketJson.error) setTicket(ticketJson.data);
      window.open(json.data.publicUrl, '_blank');
    } catch (err: any) {
      setError(err.message || 'PDF oluşturulurken hata');
    } finally {
      setGeneratingPdf(false);
    }
  };

  // ── Render States ────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm text-gray-400">Yükleniyor...</p>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 tap-44">
          ← Geri
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!ticket) return null;

  const isCompleted = ticket.status === 'COMPLETED';
  const getPhotoUrl = (p: PhotoInfo) => {
    const { data } = supabase.storage.from('service-photos').getPublicUrl(p.storagePath);
    return data.publicUrl;
  };

  // ── Render ────────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Servis Kaydı</h1>
          <p className="mt-1 font-mono text-sm text-blue-600">{ticket.ticketNo}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            isCompleted ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {isCompleted ? 'Tamamlandı' : 'Aktif'}
        </span>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className={`rounded-lg border p-4 text-sm ${
          offlineSaved ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-green-200 bg-green-50 text-green-700'
        }`}>
          {success}
        </div>
      )}

      {/* Customer & Device Info */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Müşteri</h2>
          {ticket.customer ? (
            <>
              <p className="mt-2 text-lg font-medium text-foreground">{ticket.customer.name}</p>
              {ticket.customer.phone && <p className="mt-1 text-sm text-gray-500">📞 {ticket.customer.phone}</p>}
              {ticket.customer.email && <p className="text-sm text-gray-500">✉️ {ticket.customer.email}</p>}
              {(ticket.customer.address || ticket.customer.district) && (
                <p className="mt-1 text-sm text-gray-400">
                  {[ticket.customer.district, ticket.customer.city, ticket.customer.address].filter(Boolean).join(', ')}
                </p>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm text-gray-400">Müşteri bilgisi bulunamadı (silinmiş olabilir)</p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-white p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Cihaz</h2>
          {ticket.device ? (
            <>
              <p className="mt-2 text-lg font-medium text-foreground">{ticket.device.brand} {ticket.device.model}</p>
              <p className="mt-1 text-sm text-gray-500">
                Seri No: <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">{ticket.device.serialNo}</code>
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-gray-400">Cihaz bilgisi bulunamadı (silinmiş olabilir)</p>
          )}
          {ticket.technician && <p className="mt-1 text-sm text-gray-500">Teknisyen: {ticket.technician.name}</p>}
          <p className="mt-1 text-xs text-gray-400">Arıza: {ticket.issueDesc}</p>
        </div>
      </div>

      {!isCompleted ? (
        /* ── Service Form ─────────────────────────── */
        <form onSubmit={handleComplete} className="space-y-6">
          {/* TDS & Pressure */}
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Ölçüm Değerleri</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { label: 'TDS Öncesi', val: tdsBefore, set: setTdsBefore, placeholder: '0-5000', min: 0, max: 5000 },
                { label: 'TDS Sonrası', val: tdsAfter, set: setTdsAfter, placeholder: '0-5000', min: 0, max: 5000 },
                { label: 'Basınç Öncesi (bar)', val: pressureBefore, set: setPressureBefore, placeholder: '0.0', step: '0.1' as const },
                { label: 'Basınç Sonrası (bar)', val: pressureAfter, set: setPressureAfter, placeholder: '0.0', step: '0.1' as const },
              ].map((f) => (
                <div key={f.label}>
                  <label className="block text-sm font-medium text-muted-foreground">{f.label}</label>
                  <input
                    type="number"
                    value={f.val}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    step={f.step}
                    min={f.min}
                    max={f.max}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Leak Check */}
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Kaçak Kontrolü</h2>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input type="radio" name="leak" checked={leakCheck === true} onChange={() => setLeakCheck(true)} className="text-blue-600" />
                <span className="text-sm text-muted-foreground">Kaçak Var</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" name="leak" checked={leakCheck === false} onChange={() => setLeakCheck(false)} className="text-blue-600" />
                <span className="text-sm text-muted-foreground">Kaçak Yok</span>
              </label>
            </div>
            <input
              type="text" value={leakNotes} onChange={(e) => setLeakNotes(e.target.value)}
              placeholder="Kaçak ile ilgili notlar..."
              className="mt-3 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Filter Replacement */}
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Değişen Filtreler</h2>
            {filterCatalog.length === 0 ? (
              <p className="text-sm text-gray-400">Filtre kataloğu bulunamadı.</p>
            ) : (
              <div className="space-y-2">
                {filterCatalog.map((filter) => {
                  const selected = selectedFilters.find((f) => f.filterId === filter.id);
                  return (
                    <div key={filter.id} className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${selected ? 'border-blue-400 bg-blue-50' : 'border-border'}`}>
                      <input type="checkbox" checked={!!selected} onChange={() => toggleFilter(filter.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{filter.name}</p>
                        <p className="text-xs text-gray-500">{STAGE_LABELS[filter.stage] || filter.stage}{filter.sku ? ` (${filter.sku})` : ''}</p>
                      </div>
                      {selected && (
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-500">Adet:</label>
                          <input
                            type="number"
                            min="1"
                            value={selected.quantity}
                            onChange={(e) => updateFilterQty(filter.id, Number(e.target.value))}
                            className="w-16 rounded border border-gray-300 px-2 py-1 text-sm text-center"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Work Done & Resolution */}
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Yapılan İşlemler
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Yapılan İşlem</label>
                <textarea value={workDone} onChange={(e) => setWorkDone(e.target.value)} rows={3}
                  placeholder="Serviste yapılan işlemleri açıklayın..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Çözüm Açıklaması</label>
                <textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={2}
                  placeholder="Sorunun çözümü..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Müşteri Notu</label>
                <textarea value={customerNote} onChange={(e) => setCustomerNote(e.target.value)} rows={2}
                  placeholder="Müşteri tarafından belirtilen ek notlar..."
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Photos */}
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Fotoğraflar</h2>
            <div className="mb-3 flex items-center gap-3">
              <select value={photoType} onChange={(e) => setPhotoType(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                <option value="BEFORE">Öncesi</option>
                <option value="AFTER">Sonrası</option>
                <option value="GENERAL">Genel</option>
              </select>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment"
                onChange={handlePhotoUpload} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
                {uploading ? 'Yükleniyor...' : '📷 Fotoğraf Çek'}
              </button>
            </div>
            {(ticket.photos?.length ?? 0) > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {ticket.photos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <img src={getPhotoUrl(photo)} alt={photo.fileName} className="h-24 w-full rounded-lg object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                      {photo.photoType === 'BEFORE' ? 'Öncesi' : photo.photoType === 'AFTER' ? 'Sonrası' : 'Genel'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customer Signature */}
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Müşteri İmzası</h2>
            <SignaturePad dataUrl={signatureDataUrl} canvasRef={signatureCanvasRef}
              onSave={(url) => setSignatureDataUrl(url)}
              onClear={() => { setSignatureDataUrl(null); setSignatureName(''); }}
            />
            {signatureDataUrl && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-muted-foreground">İmzalayan Adı Soyadı</label>
                <input type="text" value={signatureName} onChange={(e) => setSignatureName(e.target.value)}
                  placeholder="Ad Soyad"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Payment / Tahsilat */}
          <div className="rounded-lg border-2 border-emerald-300 bg-gradient-to-r from-emerald-50 to-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-lg">💰</span>
              <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Tahsilat (Zorunlu)</h2>
              {existingPayment && (
                <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Kaydedildi</span>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-emerald-900">Tutar (₺) <span className="text-red-500">*</span></label>
                <input type="number" step="0.01" min="0" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00" disabled={!!existingPayment}
                  className="mt-1 block w-full rounded-lg border-2 border-emerald-200 px-3 py-2.5 text-sm font-medium shadow-sm focus:border-emerald-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-emerald-900">Ödeme Yöntemi</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} disabled={!!existingPayment}
                  className="mt-1 block w-full rounded-lg border-2 border-emerald-200 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400">
                  <option value="CASH">💵 Nakit</option>
                  <option value="CREDIT_CARD">💳 Kredi Kartı</option>
                  <option value="BANK_TRANSFER">🏦 Banka Transferi</option>
                  <option value="PROMISSORY_NOTE">📝 Senet</option>
                  <option value="DEFERRED">📅 İleri Tarihli Ödeme</option>
                </select>
              </div>
              {paymentMethod === 'CREDIT_CARD' && (
                <div>
                  <label className="block text-sm font-semibold text-emerald-900">Taksit</label>
                  <select value={installmentCount} onChange={(e) => setInstallmentCount(e.target.value)} disabled={!!existingPayment}
                    className="mt-1 block w-full rounded-lg border-2 border-emerald-200 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400">
                    <option value="">Tek Çekim</option>
                    {[2,3,4,5,6,7,8,9,10,11,12].map(n => <option key={n} value={n}>{n} Taksit</option>)}
                  </select>
                </div>
              )}
              {paymentMethod === 'CREDIT_CARD' && !installmentCount && (
                <div className="flex items-center">
                  <span className="text-xs text-emerald-600 font-medium">💳 Tek çekim — komisyon avantajlı</span>
                </div>
              )}
              {(paymentMethod === 'PROMISSORY_NOTE' || paymentMethod === 'DEFERRED') && (
                <div>
                  <label className="block text-sm font-semibold text-emerald-900">Vade Tarihi</label>
                  <input type="date" value={paymentDueDate} onChange={(e) => setPaymentDueDate(e.target.value)} disabled={!!existingPayment}
                    className="mt-1 block w-full rounded-lg border-2 border-emerald-200 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-emerald-900">Not</label>
                <input type="text" value={paymentNotes} onChange={(e) => setPaymentNotes(e.target.value)} disabled={!!existingPayment}
                  placeholder="Ödeme ile ilgili not (opsiyonel)..."
                  className="mt-1 block w-full rounded-lg border-2 border-emerald-200 px-3 py-2.5 text-sm shadow-sm focus:border-emerald-500 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                />
              </div>
            </div>
            {!existingPayment && (
              <p className="mt-3 text-xs text-emerald-600">
                ⚠️ Tutar girmeden servis tamamlanamaz. Ücretsiz servis ise "0" girin.
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
            <button type="button" onClick={() => router.back()}
              className="w-full sm:w-auto rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-muted-foreground hover:bg-gray-50 tap-44">
              Geri
            </button>
            <button type="submit" disabled={saving}
              className="w-full sm:w-auto rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 tap-44">
              {paymentSaving ? '💳 Tahsilat kaydediliyor...' : saving ? 'Kaydediliyor...' : '✅ Servisi Tamamla'}
            </button>
          </div>
        </form>
      ) : (
        /* ── Completed View ──────────────────────── */
        <div className="space-y-6">
          {/* Back button */}
          <button type="button" onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 tap-44">
            ← Geri
          </button>

          {/* Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="TDS Giriş/Çıkış"
              value={ticket.tdsBefore != null && ticket.tdsAfter != null ? `${ticket.tdsBefore} → ${ticket.tdsAfter}` : '—'} />
            <SummaryCard label="Basınç Giriş/Çıkış"
              value={ticket.pressureBefore != null && ticket.pressureAfter != null ? `${ticket.pressureBefore} → ${ticket.pressureAfter} bar` : '—'} />
            <SummaryCard label="Kaçak"
              value={ticket.leakCheck == null ? '—' : ticket.leakCheck ? 'Kaçak Var' : 'Kaçak Yok'} />
            <SummaryCard label="Değişen Filtre"
              value={`${ticket.filterChanges?.length ?? 0} adet`} />
          </div>

          {/* Payment Info */}
          {(existingPayment || paymentAmount) && (
            <div className="rounded-lg border-2 border-emerald-200 bg-emerald-50/50 p-5">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-lg">💰</span>
                <h2 className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Tahsilat Bilgisi</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Tutar</p>
                  <p className="text-lg font-bold text-emerald-900 tabular-nums">
                    {existingPayment
                      ? `${Number(existingPayment.amount).toLocaleString('tr-TR')}₺`
                      : `${Number(paymentAmount).toLocaleString('tr-TR')}₺`}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Yöntem</p>
                  <p className="text-lg font-semibold text-emerald-900">
                    {METHOD_LABELS[existingPayment?.paymentMethod ?? paymentMethod] ?? paymentMethod}
                    {((existingPayment?.installmentCount) ?? (installmentCount ? Number(installmentCount) : null))
                      ? ` (${existingPayment?.installmentCount ?? installmentCount} Taksit)`
                      : ''}
                  </p>
                </div>
                {(existingPayment?.dueDate || paymentDueDate) && (
                  <div>
                    <p className="text-xs text-emerald-600 font-medium">Vade</p>
                    <p className="text-sm font-semibold text-emerald-900">
                      {existingPayment?.dueDate
                        ? new Date(existingPayment.dueDate).toLocaleDateString('tr-TR')
                        : new Date(paymentDueDate).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Durum</p>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    (existingPayment?.status ?? 'PAID') === 'PAID' ? 'bg-emerald-100 text-emerald-700'
                      : (existingPayment?.status ?? 'PAID') === 'PENDING' ? 'bg-amber-100 text-amber-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {existingPayment?.status === 'PAID' ? '✅ Tahsil Edildi'
                      : existingPayment?.status === 'PENDING' ? '⏳ Bekliyor'
                      : existingPayment?.status === 'OVERDUE' ? '⚠️ Gecikmiş'
                      : '✅ Tahsil Edildi'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Work Done */}
          {ticket.workDone && (
            <div className="rounded-lg border border-border bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Yapılan İşlem</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.workDone}</p>
            </div>
          )}

          {/* Expenses — editable after completion */}
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">🧾 Masraflar</h2>
            <EditableExpenses ticketId={ticket.id} initialExpenses={ticket.expenses} />
          </div>

          {/* Photos */}
          {(ticket.photos?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-border bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Fotoğraflar</h2>
              <div className="grid grid-cols-3 gap-3">
                {ticket.photos.map((photo) => (
                  <img key={photo.id} src={getPhotoUrl(photo)} alt={photo.fileName} className="h-32 w-full rounded-lg object-cover" />
                ))}
              </div>
            </div>
          )}

          {/* Signature */}
          {signatureDataUrl && (
            <div className="rounded-lg border border-border bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Müşteri İmzası</h2>
              <img src={signatureDataUrl} alt="Müşteri imzası" className="h-20 rounded border border-border" />
              {signatureName && <p className="mt-2 text-sm text-gray-600">İmzalayan: {signatureName}</p>}
            </div>
          )}

          {/* PDF Report */}
          <div className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Servis Raporu PDF</h2>
            {pdfUrl ? (
              <div className="flex items-center gap-3">
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
                  📄 PDF Raporu Aç
                </a>
                <button type="button" onClick={handleGeneratePdf} disabled={generatingPdf}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-gray-50 disabled:opacity-50">
                  {generatingPdf ? 'Oluşturuluyor...' : '🔄 PDF\'i Yeniden Oluştur'}
                </button>
              </div>
            ) : (
              <div>
                <button type="button" onClick={handleGeneratePdf} disabled={generatingPdf}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50">
                  {generatingPdf ? 'Oluşturuluyor...' : '📄 PDF Raporu Oluştur'}
                </button>
                <p className="mt-2 text-xs text-gray-400">
                  Servis tamamlandıktan sonra PDF raporu oluşturabilirsiniz.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

interface Expense { type: string; amount: number; description: string; }

const EXPENSE_TYPES = [
  { key: 'travel', label: 'Yol / Ulaşım' },
  { key: 'parking', label: 'Park / Otopark' },
  { key: 'meal', label: 'Yemek' },
  { key: 'material', label: 'Malzeme / Sarf' },
  { key: 'other', label: 'Diğer' },
];

function EditableExpenses({ ticketId, initialExpenses }: { ticketId: string; initialExpenses: string | null }) {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    try { return initialExpenses ? JSON.parse(initialExpenses) : []; }
    catch { return []; }
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (newExpenses: Expense[]) => {
    setExpenses(newExpenses);
    setSaving(true);
    await fetch(`/api/service-tickets/${ticketId}/expenses`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenses: JSON.stringify(newExpenses) }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const add = () => save([...expenses, { type: 'travel', amount: 0, description: '' }]);
  const remove = (i: number) => save(expenses.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof Expense, value: string | number) => {
    const next = [...expenses];
    next[i] = { ...next[i], [field]: value };
    save(next);
  };

  const total = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <div className="space-y-3">
      {saved && <div className="text-xs text-emerald-600">✓ Kaydedildi</div>}
      {expenses.length === 0 && <p className="text-sm text-gray-400">Henüz masraf eklenmedi.</p>}
      {expenses.map((e, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-gray-50">
          <select value={e.type} onChange={(ev) => update(i, 'type', ev.target.value)}
            className="flex-1 min-w-[100px] rounded border border-gray-200 px-2 py-1.5 text-xs">
            {EXPENSE_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
          <input type="number" min="0" step="0.01" value={e.amount || ''} onChange={(ev) => update(i, 'amount', parseFloat(ev.target.value) || 0)}
            placeholder="0₺" className="w-24 rounded border border-gray-200 px-2 py-1.5 text-xs" />
          <input type="text" value={e.description} onChange={(ev) => update(i, 'description', ev.target.value)}
            placeholder="Açıklama" className="flex-1 min-w-[120px] rounded border border-gray-200 px-2 py-1.5 text-xs" />
          <button type="button" onClick={() => remove(i)} disabled={saving}
            className="rounded p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600">✕</button>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <button type="button" onClick={add} disabled={saving}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Masraf Ekle</button>
        {total > 0 && <span className="text-sm font-bold text-red-600 font-mono">{total.toFixed(2)} ₺</span>}
      </div>
    </div>
  );
}