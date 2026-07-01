// ──────────────────────────────────────────────
// Sync Queue — Çevrimdışı kuyruk yönetimi
// db.ts'deki IndexedDB store'larını kullanır:
//   pending-forms, pending-photos, pending-payments
//
// Retry: 3 deneme, backoff 1s / 2s / 4s
// Başarılı işlemler IDB'den silinir.
// sync-complete event'i window üzerinden dispatch edilir.
// ──────────────────────────────────────────────

import {
  getPendingForms,
  deletePendingForm,
  getPendingPhotos,
  deletePendingPhoto,
  getPendingPayments,
  deletePendingPayment,
  type PendingForm,
  type PendingPhoto,
  type PendingPayment,
} from './db';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface QueueStats {
  pendingForms: number;
  pendingPhotos: number;
  pendingPayments: number;
}

export interface SyncResult {
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
  pendingForms: number;
  pendingPhotos: number;
  pendingPayments: number;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Tarayıcının çevrimiçi olup olmadığını döndürür */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

/** QueueStats nesnesindeki toplam bekleyen sayısını döndürür */
export function getTotalPending(stats: QueueStats | SyncResult): number {
  return stats.pendingForms + stats.pendingPhotos + stats.pendingPayments;
}

/** Belirtilen ms kadar bekler */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────────
// Queue stats
// ──────────────────────────────────────────────

/** Kuyruktaki bekleyen öğe sayılarını döndürür */
export async function getQueueStats(): Promise<QueueStats> {
  const [forms, photos, payments] = await Promise.all([
    getPendingForms(),
    getPendingPhotos(),
    getPendingPayments(),
  ]);
  return {
    pendingForms: forms.length,
    pendingPhotos: photos.length,
    pendingPayments: payments.length,
  };
}

// ──────────────────────────────────────────────
// Dispatch sync-complete event
// ──────────────────────────────────────────────

function dispatchSyncComplete(stats: QueueStats): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sync-complete', {
        detail: { stats },
      }),
    );
  }
}

// ──────────────────────────────────────────────
// Sync execution — retry with backoff
// ──────────────────────────────────────────────

const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];

/**
 * Verilen fetch işlemini retry mantığı ile çalıştırır.
 * Başarılı olursa true, 3 denemede de başarısız olursa false döner.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
): Promise<{ ok: boolean; error?: string }> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(30_000),
      });

      if (response.ok || response.status === 409) {
        // 409 Conflict: kaynak zaten var, başarılı say
        return { ok: true };
      }

      // Sunucu hatası — tekrar dene
      if (attempt < MAX_RETRIES - 1) {
        await delay(BACKOFF_MS[attempt]!);
      } else {
        return { ok: false, error: `${label}: HTTP ${response.status}` };
      }
    } catch (err) {
      if (attempt < MAX_RETRIES - 1) {
        await delay(BACKOFF_MS[attempt]!);
      } else {
        return {
          ok: false,
          error: `${label}: ${err instanceof Error ? err.message : 'Ağ hatası'}`,
        };
      }
    }
  }
  return { ok: false, error: `${label}: bilinmeyen hata` };
}

// ──────────────────────────────────────────────
// Photo sync helper
// ──────────────────────────────────────────────

async function syncSinglePhoto(photo: PendingPhoto): Promise<{ ok: boolean; error?: string }> {
  // 1. POST to photos endpoint to get upload URL
  const metaResult = await fetchWithRetry(
    `/api/service-tickets/${photo.ticketId}/photos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: photo.fileName,
        contentType: photo.mimeType,
        photoType: 'GENERAL',
      }),
    },
    `Fotoğraf meta ${photo.fileName}`,
  );

  if (!metaResult.ok) return metaResult;

  // 2. Upload actual file to signed URL
  //    We need to read the response to get the upload URL.
  //    Since fetchWithRetry doesn't return the response body,
  //    we do a single attempt with retry for the upload itself.
  try {
    // Re-fetch the upload URL (single attempt, optimistic)
    const metaRes = await fetch(`/api/service-tickets/${photo.ticketId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: photo.fileName,
        contentType: photo.mimeType,
        photoType: 'GENERAL',
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!metaRes.ok) {
      return { ok: false, error: `Fotoğraf meta (upload-url): HTTP ${metaRes.status}` };
    }

    const metaJson = await metaRes.json();
    const uploadUrl: string | undefined = metaJson.data?.uploadUrl;

    if (!uploadUrl) {
      // Fallback: no upload URL returned — treat as success (metadata already saved)
      return { ok: true };
    }

    // Convert base64 to Blob and upload via PUT
    const byteString = atob(photo.base64data.split(',')[1] ?? photo.base64data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: photo.mimeType });

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      body: blob,
      headers: { 'Content-Type': photo.mimeType },
      signal: AbortSignal.timeout(60_000),
    });

    if (!uploadRes.ok) {
      return { ok: false, error: `Fotoğraf yükleme: HTTP ${uploadRes.status}` };
    }

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: `Fotoğraf yükleme: ${err instanceof Error ? err.message : 'Ağ hatası'}`,
    };
  }
}

// ──────────────────────────────────────────────
// Sync all
// ──────────────────────────────────────────────

/**
 * Kuyruktaki tüm bekleyen işlemleri sırayla işler.
 * Sıralama: formlar → fotoğraflar → ödemeler
 * Başarılı olanlar IDB'den silinir.
 * İşlem tamamlanınca window'a sync-complete event'i gönderilir.
 */
export async function syncAll(): Promise<SyncResult> {
  const result: SyncResult = {
    total: 0,
    succeeded: 0,
    failed: 0,
    errors: [],
    pendingForms: 0,
    pendingPhotos: 0,
    pendingPayments: 0,
  };

  // 1. Sync forms
  const forms = await getPendingForms();
  result.total += forms.length;

  for (const form of forms) {
    if (!form.id) continue;
    const { ok, error } = await fetchWithRetry(
      `/api/service-tickets/${form.ticketId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.formData),
      },
      `Form #${form.id} (ticket: ${form.ticketId})`,
    );

    if (ok) {
      await deletePendingForm(form.id).catch(() => {});
      result.succeeded++;
    } else {
      result.failed++;
      if (error) result.errors.push(error);
    }
  }

  // 2. Sync photos
  const photos = await getPendingPhotos();
  result.total += photos.length;

  for (const photo of photos) {
    if (!photo.id) continue;
    const { ok, error } = await syncSinglePhoto(photo);

    if (ok) {
      await deletePendingPhoto(photo.id).catch(() => {});
      result.succeeded++;
    } else {
      result.failed++;
      if (error) result.errors.push(error);
    }
  }

  // 3. Sync payments
  const payments = await getPendingPayments();
  result.total += payments.length;

  for (const payment of payments) {
    if (!payment.id) continue;
    const { ok, error } = await fetchWithRetry(
      '/api/payments',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payment.paymentData),
      },
      `Ödeme #${payment.id} (ticket: ${payment.ticketId})`,
    );

    if (ok) {
      await deletePendingPayment(payment.id).catch(() => {});
      result.succeeded++;
    } else {
      result.failed++;
      if (error) result.errors.push(error);
    }
  }

  // 4. Update remaining counts
  const remaining = await getQueueStats();
  result.pendingForms = remaining.pendingForms;
  result.pendingPhotos = remaining.pendingPhotos;
  result.pendingPayments = remaining.pendingPayments;

  // 5. Dispatch sync-complete event
  dispatchSyncComplete(remaining);

  return result;
}

// ──────────────────────────────────────────────
// Sync single form
// ──────────────────────────────────────────────

/**
 * Belirtilen ID'ye sahip tek bir pending form'u senkronize eder.
 * Başarılı olursa IDB'den siler ve sync-complete event'i gönderir.
 */
export async function syncForm(formId: number): Promise<{ ok: boolean; error?: string }> {
  const forms = await getPendingForms();
  const form = forms.find((f) => f.id === formId);

  if (!form) {
    return { ok: false, error: `Form #${formId} bulunamadı` };
  }

  const { ok, error } = await fetchWithRetry(
    `/api/service-tickets/${form.ticketId}`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.formData),
    },
    `Form #${form.id} (ticket: ${form.ticketId})`,
  );

  if (ok) {
    await deletePendingForm(formId).catch(() => {});
  }

  // Dispatch sync-complete after single sync
  const remaining = await getQueueStats();
  dispatchSyncComplete(remaining);

  return { ok, error };
}
