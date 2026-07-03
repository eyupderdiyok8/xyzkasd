// ──────────────────────────────────────────────
// POST /api/push/send — Tüm abonelere push bildirimi gönder
//
// Admin kullanıcılar veya senkronizasyon tamamlandığında
// tetiklenir. web-push npm paketi kullanılmaz; native
// Web Push Protocol ile minimal implementasyon.
//
// VAPID: NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY env
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { getSetting } from '@/lib/system-settings';

interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userId?: string;
  createdAt: string;
}

/**
 * VAPID JWT token oluşturur (Web Push için gerekli).
 * Minimal implementation — harici kütüphane yok.
 */
async function createVapidToken(
  audience: string,
  subject: string,
  privateKey: string,
): Promise<string> {
  // Web Push, JWT ile Authorization header'ı gerektirir.
  // Node.js runtime'da crypto API kullanılır.
  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60, // 12 saat
    sub: subject,
  };

  const input = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
  const encoder = new TextEncoder();

  // PEM formatındaki private key'i import et
  const keyData = await crypto.subtle.importKey(
    'raw',
    base64UrlDecode(privateKey) as BufferSource,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    keyData,
    encoder.encode(input),
  );

  return `${input}.${base64UrlEncode(new Uint8Array(signature))}`;
}

function base64UrlEncode(data: string | Uint8Array): string {
  const str = typeof data === 'string' ? data : String.fromCharCode(...data);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): BufferSource {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '==='.slice(0, (4 - (base64.length % 4)) % 4);
  const raw = atob(padded);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output as BufferSource;
}

/**
 * Tek bir push subscription'a bildirim gönder.
 */
async function sendToOne(
  sub: PushSubscriptionRecord,
  payload: { title: string; body: string },
  vapidSubject: string,
): Promise<{ ok: boolean; endpoint: string; error?: string }> {
  try {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY ?? '';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return { ok: false, endpoint: sub.endpoint, error: 'VAPID anahtarları yapılandırılmamış' };
    }

    const audience = new URL(sub.endpoint).origin;
    const token = await createVapidToken(audience, `mailto:${vapidSubject}`, vapidPrivateKey);

    const response = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'Authorization': `WebPush ${token}`,
        'TTL': '86400',
        'Urgency': 'normal',
      },
      body: await encryptPushPayload(
        JSON.stringify({
          title: payload.title,
          body: payload.body,
          icon: '/icon-192.png',
          badge: '/icon-72.png',
        }),
        sub.keys,
      ),
      signal: AbortSignal.timeout(10_000),
    });

    if (response.ok || response.status === 201) {
      return { ok: true, endpoint: sub.endpoint };
    }

    // 404 veya 410: subscription geçersiz, kaldırılmalı
    if (response.status === 404 || response.status === 410) {
      return { ok: false, endpoint: sub.endpoint, error: 'GONE' };
    }

    return { ok: false, endpoint: sub.endpoint, error: `HTTP ${response.status}` };
  } catch (err) {
    return {
      ok: false,
      endpoint: sub.endpoint,
      error: err instanceof Error ? err.message : 'Bilinmeyen hata',
    };
  }
}

/**
 * Web Push şifreleme (aes128gcm).
 * Basitleştirilmiş versiyon — production'da web-push kullanılması önerilir.
 *
 * NOT: Gerçek akm şifrelemesi karmaşık bir protokoldür (RFC 8291).
 * Burada temel bir implementasyon yerine, push service'e düz JSON gönderiyoruz.
 * Gerçek production kullanımı için web-push npm paketi eklenmeli.
 *
 * Bu fonksiyon, push provider'ın şifreleme gerektirmediği
 * basitleştirilmiş durumlar için kullanılır.
 */
async function encryptPushPayload(
  payload: string,
  _keys: { p256dh: string; auth: string },
): Promise<BodyInit> {
  // Gerçek Web Push şifrelemesi (RFC 8291) karmaşık bir protokoldür.
  // Bu minimal implementasyon, push provider'ların her zaman
  // şifreleme talep etmediği durumlar için düz metin gönderir.
  //
  // ⚠ Production için: `web-push` npm paketi ile değiştirin.
  //   npm install web-push @types/web-push
  //   webpush.setVapidDetails(subject, publicKey, privateKey);
  //   webpush.sendNotification(subscription, payload);
  return new TextEncoder().encode(payload);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole('manager');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  let body: { title?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } },
      { status: 400 },
    );
  }

  const title = body.title ?? 'Bildirim';
  const bodyText = body.body ?? '';

  if (!bodyText) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'body zorunludur' } },
      { status: 400 },
    );
  }

  try {
    // Abonelikleri oku
    const raw = await getSetting('push_subscriptions');
    if (!raw) {
      return NextResponse.json({
        data: { sent: 0, failed: 0, message: 'Kayıtlı abonelik bulunamadı' },
      });
    }

    const subs: PushSubscriptionRecord[] = JSON.parse(raw);
    if (subs.length === 0) {
      return NextResponse.json({
        data: { sent: 0, failed: 0, message: 'Kayıtlı abonelik bulunamadı' },
      });
    }

    const vapidSubject = process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com';

    // Tüm abonelere paralel gönder
    const results = await Promise.allSettled(
      subs.map((sub) => sendToOne(sub, { title, body: bodyText }, vapidSubject)),
    );

    let sent = 0;
    let failed = 0;
    const goneEndpoints: string[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.ok) {
        sent++;
      } else {
        failed++;
        if (result.status === 'fulfilled' && result.value.error === 'GONE') {
          goneEndpoints.push(result.value.endpoint);
        }
      }
    }

    // Geçersiz (GONE) endpoint'leri temizle
    if (goneEndpoints.length > 0) {
      const cleaned = subs.filter((s) => !goneEndpoints.includes(s.endpoint));
      await (await import('@/lib/system-settings')).setSetting(
        'push_subscriptions',
        JSON.stringify(cleaned),
      );
    }

    return NextResponse.json({
      data: {
        sent,
        failed,
        total: subs.length,
        cleaned: goneEndpoints.length,
        message: `${sent} bildirim gönderildi, ${failed} başarısız${goneEndpoints.length > 0 ? `, ${goneEndpoints.length} geçersiz abonelik temizlendi` : ''}`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Bilinmeyen hata';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}
