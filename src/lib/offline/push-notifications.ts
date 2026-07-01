// ──────────────────────────────────────────────
// Web Push Bildirimleri — Abonelik & Gönderim
// VAPID anahtarı NEXT_PUBLIC_VAPID_PUBLIC_KEY env'den alınır.
// Tüm tarayıcı API çağrıları try/catch ile sarılmıştır;
// desteklenmeyen tarayıcılarda sessizce başarısız olur.
// ──────────────────────────────────────────────

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as BufferSource;
}

export interface PushSubscriptionInfo {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/**
 * Bildirim izni ister ve Push aboneliği oluşturur.
 * Abonelik bilgisini API'ye kaydeder.
 *
 * @returns Abonelik başarılı ise subscription objesi, değilse null
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[push] Service Worker desteklenmiyor');
    return null;
  }

  if (!('PushManager' in window)) {
    console.warn('[push] Push API desteklenmiyor');
    return null;
  }

  try {
    // 1. Bildirim izni iste
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[push] Bildirim izni reddedildi:', permission);
      return null;
    }

    // 2. Service Worker kaydını al
    const registration = await navigator.serviceWorker.ready;

    // 3. Push aboneliği oluştur
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      if (!VAPID_PUBLIC_KEY) {
        console.warn('[push] VAPID public key bulunamadı (NEXT_PUBLIC_VAPID_PUBLIC_KEY)');
        return null;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }

    // 4. Abonelik bilgisini API'ye kaydet
    const subJson = subscription.toJSON() as PushSubscriptionInfo & { expirationTime: number | null };
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        keys: subJson.keys,
      }),
    });

    return subscription;
  } catch (err) {
    console.error('[push] Abonelik hatası:', err);
    return null;
  }
}

/**
 * Push aboneliğini iptal eder.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const subJson = subscription.toJSON() as PushSubscriptionInfo;
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subJson.endpoint }),
      });
      await subscription.unsubscribe();
      return true;
    }
    return false;
  } catch (err) {
    console.error('[push] Abonelik iptal hatası:', err);
    return false;
  }
}

/**
 * Belirli bir başlık ve gövde ile push bildirimi gönder.
 * Bu fonksiyon, servis tamamlandığında veya senkronizasyon
 * bittiğinde kullanıcıya bilgi vermek için kullanılır.
 *
 * @param title Bildirim başlığı (Türkçe)
 * @param body Bildirim gövdesi (Türkçe)
 */
export async function sendPushNotification(title: string, body: string): Promise<boolean> {
  try {
    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body }),
    });
    return res.ok;
  } catch (err) {
    console.error('[push] Bildirim gönderme hatası:', err);
    return false;
  }
}

/**
 * Mevcut bildirim izni durumunu döndürür.
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}
