'use client';

/**
 * Service Worker registration helper for WPS Servis ERP.
 * Registers /sw.js, listens for updates, and shows Turkish-language prompts.
 */

// Extend ServiceWorkerRegistration for Background Sync API (not in default TS lib)
interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

declare global {
  interface ServiceWorkerRegistration {
    readonly sync: SyncManager;
  }
}

let registration: ServiceWorkerRegistration | null = null;

/**
 * Shows an update notification to the user (Turkish UI).
 * Called when a new service worker is detected.
 */
function showUpdateNotification(swRegistration: ServiceWorkerRegistration): void {
  // Avoid multiple prompts
  if (document.getElementById('__sw_update_toast')) return;

  const toast = document.createElement('div');
  toast.id = '__sw_update_toast';
  toast.style.cssText = [
    'position: fixed',
    'bottom: 1rem',
    'left: 50%',
    'transform: translateX(-50%)',
    'z-index: 99999',
    'background: #1e40af',
    'color: #fff',
    'padding: 0.75rem 1.25rem',
    'border-radius: 0.75rem',
    'box-shadow: 0 4px 24px rgba(0,0,0,0.25)',
    'font-family: system-ui, sans-serif',
    'font-size: 0.875rem',
    'display: flex',
    'align-items: center',
    'gap: 0.75rem',
    'animation: sw-toast-in 0.35s ease-out',
    'max-width: calc(100vw - 2rem)',
  ].join(';');

  const text = document.createElement('span');
  text.textContent = 'Yeni sürüm mevcut. Güncellemek ister misiniz?';

  const updateBtn = document.createElement('button');
  updateBtn.textContent = 'Güncelle';
  updateBtn.style.cssText = [
    'background: #fff',
    'color: #1e40af',
    'border: none',
    'padding: 0.4rem 0.9rem',
    'border-radius: 0.5rem',
    'font-weight: 600',
    'font-size: 0.8rem',
    'cursor: pointer',
    'white-space: nowrap',
  ].join(';');
  updateBtn.addEventListener('click', () => {
    if (!swRegistration.waiting) return;
    swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    // Reload when the new SW takes over
    swRegistration.waiting.addEventListener('statechange', (e) => {
      if ((e.target as ServiceWorker)?.state === 'activated') {
        window.location.reload();
      }
    });
    toast.remove();
  });

  const dismissBtn = document.createElement('button');
  dismissBtn.textContent = '✕';
  dismissBtn.style.cssText = [
    'background: transparent',
    'color: rgba(255,255,255,0.7)',
    'border: none',
    'font-size: 1rem',
    'cursor: pointer',
    'padding: 0.2rem',
    'line-height: 1',
  ].join(';');
  dismissBtn.addEventListener('click', () => toast.remove());

  toast.appendChild(text);
  toast.appendChild(updateBtn);
  toast.appendChild(dismissBtn);
  document.body.appendChild(toast);

  // Inject keyframe animation
  if (!document.getElementById('__sw_toast_style')) {
    const style = document.createElement('style');
    style.id = '__sw_toast_style';
    style.textContent =
      '@keyframes sw-toast-in { from { opacity: 0; transform: translateX(-50%) translateY(12px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }';
    document.head.appendChild(style);
  }
}

/**
 * Registers the service worker at /sw.js.
 * Should be called once on page load from a client component.
 */
export function registerSW(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        registration = reg;
        console.log('[SW] Registered with scope:', reg.scope);

        // Check for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New SW found, show update toast
              showUpdateNotification(reg);
            }
          });
        });
      })
      .catch((err) => {
        console.error('[SW] Registration failed:', err);
      });

    // If a waiting SW exists (e.g. from a previous updatefound), prompt now
    if (registration?.waiting) {
      showUpdateNotification(registration);
    }

    // Listen for messages from SW (background sync, refresh)
    navigator.serviceWorker.addEventListener('message', (event) => {
      const { type, tag } = event.data || {};

      if (type === 'REFRESH') {
        window.location.reload();
      }

      if (type === 'BACKGROUND_SYNC') {
        window.dispatchEvent(new CustomEvent('sw:background-sync', { detail: { tag } }));
      }

      if (type === 'SYNC_TRIGGER') {
        // SW tells us to sync (e.g., when coming back online)
        import('./sync-queue').then(({ syncAll }) => {
          syncAll().then(() => console.log('[SW] Sync completed from SW trigger'));
        });
      }
    });
  });
}

// Sync when page becomes visible after being hidden (e.g., user comes back after going online)
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      import('./sync-queue').then(({ syncAll }) => {
        syncAll().catch(() => {});
      });
    }
  });
}

/**
 * Registers a background sync tag.
 * Call this when the user submits a form or captures a photo while offline.
 */
export async function registerBackgroundSync(tag: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.warn('[SW] Background Sync not supported');
    return;
  }

  const reg = await navigator.serviceWorker.ready;
  try {
    await reg.sync.register(tag);
    console.log('[SW] Background sync registered:', tag);
  } catch (err) {
    console.error('[SW] Background sync registration failed:', err);
  }
}

/**
 * Unregisters the service worker.
 * Useful in dev mode to avoid stale cache issues.
 */
export function unregisterSW(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) {
      reg.unregister();
    }
  });
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys
        .filter((key) => key.startsWith('wps-'))
        .forEach((key) => {
          caches.delete(key);
        });
    });
  }
}

/**
 * Returns the current service worker registration, if any.
 */
export function getRegistration(): ServiceWorkerRegistration | null {
  return registration;
}
