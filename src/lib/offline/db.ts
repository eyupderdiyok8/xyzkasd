// ─── Offline IndexedDB Wrapper ────────────────────────────
// Uses vanilla IndexedDB API — no external dependency.
// DB name: wps-offline, version 1.
// Stores: tickets, pending-forms, pending-photos, pending-payments

const DB_NAME = 'wps-offline';
const DB_VERSION = 1;

// ─── Store schemas ─────────────────────────────────────────

export interface StoredTicket {
  ticketId: string;
  data: unknown;
  cachedAt: number; // Date.now()
}

export interface PendingForm {
  id?: number; // auto-increment
  ticketId: string;
  formData: unknown;
  timestamp: number;
}

export interface PendingPhoto {
  id?: number;
  ticketId: string;
  fileName: string;
  base64data: string;
  mimeType: string;
  timestamp: number;
}

export interface PendingPayment {
  id?: number;
  ticketId: string;
  paymentData: unknown;
  timestamp: number;
}

// ─── DB helpers ────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // tickets store — keyed by ticketId
      if (!db.objectStoreNames.contains('tickets')) {
        db.createObjectStore('tickets', { keyPath: 'ticketId' });
      }

      // pending-forms store — auto-increment
      if (!db.objectStoreNames.contains('pending-forms')) {
        db.createObjectStore('pending-forms', { autoIncrement: true });
      }

      // pending-photos store — auto-increment
      if (!db.objectStoreNames.contains('pending-photos')) {
        db.createObjectStore('pending-photos', { autoIncrement: true });
      }

      // pending-payments store — auto-increment
      if (!db.objectStoreNames.contains('pending-payments')) {
        db.createObjectStore('pending-payments', { autoIncrement: true });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject(new Error(`IndexedDB open failed: ${(event.target as IDBOpenDBRequest).error?.message}`));
    };
  });
}

function getDB(): Promise<IDBDatabase> {
  // Always get a fresh connection — IndexedDB connections auto-close
  return openDB();
}

// ─── Tickets ───────────────────────────────────────────────

export async function getTicket(ticketId: string): Promise<StoredTicket | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tickets', 'readonly');
    const store = tx.objectStore('tickets');
    const request = store.get(ticketId);

    request.onsuccess = () => {
      resolve(request.result ?? null);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get ticket ${ticketId}: ${request.error?.message}`));
    };
  });
}

export async function saveTicket(ticket: Record<string, unknown>): Promise<void> {
  const db = await getDB();
  const ticketId = ticket.id as string;
  const entry: StoredTicket = {
    ticketId,
    data: ticket,
    cachedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('tickets', 'readwrite');
    const store = tx.objectStore('tickets');
    store.put(entry);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(`Failed to save ticket ${ticketId}: ${tx.error?.message}`));
  });
}

export async function getAllTickets(): Promise<StoredTicket[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('tickets', 'readonly');
    const store = tx.objectStore('tickets');
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result ?? []);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get all tickets: ${request.error?.message}`));
    };
  });
}

// ─── Pending Forms ─────────────────────────────────────────

export async function savePendingForm(
  form: Omit<PendingForm, 'id' | 'timestamp'>,
): Promise<number> {
  const db = await getDB();
  const entry: Omit<PendingForm, 'id'> = {
    ticketId: form.ticketId,
    formData: form.formData,
    timestamp: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-forms', 'readwrite');
    const store = tx.objectStore('pending-forms');
    const request = store.add(entry);

    request.onsuccess = () => {
      resolve(request.result as number);
    };

    request.onerror = () => {
      reject(new Error(`Failed to save pending form: ${request.error?.message}`));
    };
  });
}

export async function getPendingForms(): Promise<PendingForm[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-forms', 'readonly');
    const store = tx.objectStore('pending-forms');
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result ?? []);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get pending forms: ${request.error?.message}`));
    };
  });
}

export async function deletePendingForm(id: number): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-forms', 'readwrite');
    const store = tx.objectStore('pending-forms');
    store.delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(`Failed to delete pending form ${id}: ${tx.error?.message}`));
  });
}

// ─── Pending Photos ────────────────────────────────────────

export async function savePendingPhoto(
  photo: Omit<PendingPhoto, 'id' | 'timestamp'>,
): Promise<number> {
  const db = await getDB();
  const entry: Omit<PendingPhoto, 'id'> = {
    ticketId: photo.ticketId,
    fileName: photo.fileName,
    base64data: photo.base64data,
    mimeType: photo.mimeType,
    timestamp: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-photos', 'readwrite');
    const store = tx.objectStore('pending-photos');
    const request = store.add(entry);

    request.onsuccess = () => {
      resolve(request.result as number);
    };

    request.onerror = () => {
      reject(new Error(`Failed to save pending photo: ${request.error?.message}`));
    };
  });
}

export async function getPendingPhotos(ticketId?: string): Promise<PendingPhoto[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-photos', 'readonly');
    const store = tx.objectStore('pending-photos');
    const request = store.getAll();

    request.onsuccess = () => {
      const all = request.result ?? [];
      if (ticketId) {
        resolve(all.filter((p: PendingPhoto) => p.ticketId === ticketId));
      } else {
        resolve(all);
      }
    };

    request.onerror = () => {
      reject(new Error(`Failed to get pending photos: ${request.error?.message}`));
    };
  });
}

// Legacy alias — kept for backward compatibility
export async function getPendingPhotosForTicket(ticketId: string): Promise<PendingPhoto[]> {
  return getPendingPhotos(ticketId);
}

export async function deletePendingPhoto(id: number): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-photos', 'readwrite');
    const store = tx.objectStore('pending-photos');
    store.delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(`Failed to delete pending photo ${id}: ${tx.error?.message}`));
  });
}

// ─── Pending Payments ──────────────────────────────────────

export async function savePendingPayment(
  payment: Omit<PendingPayment, 'id' | 'timestamp'>,
): Promise<number> {
  const db = await getDB();
  const entry: Omit<PendingPayment, 'id'> = {
    ticketId: payment.ticketId,
    paymentData: payment.paymentData,
    timestamp: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-payments', 'readwrite');
    const store = tx.objectStore('pending-payments');
    const request = store.add(entry);

    request.onsuccess = () => {
      resolve(request.result as number);
    };

    request.onerror = () => {
      reject(new Error(`Failed to save pending payment: ${request.error?.message}`));
    };
  });
}

export async function getPendingPayments(): Promise<PendingPayment[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-payments', 'readonly');
    const store = tx.objectStore('pending-payments');
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result ?? []);
    };

    request.onerror = () => {
      reject(new Error(`Failed to get pending payments: ${request.error?.message}`));
    };
  });
}

export async function deletePendingPayment(id: number): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pending-payments', 'readwrite');
    const store = tx.objectStore('pending-payments');
    store.delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(new Error(`Failed to delete pending payment ${id}: ${tx.error?.message}`));
  });
}
