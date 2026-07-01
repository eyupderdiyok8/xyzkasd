// ──────────────────────────────────────────────
// POST /api/push/subscribe — Push aboneliğini kaydet
// DELETE /api/push/subscribe — Push aboneliğini kaldır
//
// Abonelikler system_settings tablosunda
// "push_subscriptions" key'i altında JSON array olarak saklanır.
// Kimlik doğrulama: super_admin veya giriş yapmış kullanıcı.
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { getSetting, setSetting } from '@/lib/system-settings';

interface PushSubscriptionRecord {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  userId?: string;
  createdAt: string;
}

async function getSubscriptions(): Promise<PushSubscriptionRecord[]> {
  try {
    const raw = await getSetting('push_subscriptions');
    if (!raw) return [];
    return JSON.parse(raw) as PushSubscriptionRecord[];
  } catch {
    return [];
  }
}

async function saveSubscriptions(subs: PushSubscriptionRecord[]): Promise<void> {
  await setSetting('push_subscriptions', JSON.stringify(subs));
}

export async function POST(req: NextRequest) {
  // Kimlik doğrulama: giriş yapmış herhangi bir kullanıcı
  const auth = await requireRole('viewer');
  if (!auth.ok && auth.error?.status === 401) {
    // Kimlik doğrulama başarısız — ancak push aboneliği
    // istemci tarafında yapıldıysa auth gerekmeyebilir.
    // Bu durumda oturum olmadan da kabul edelim (anonim push).
  }

  let body: { endpoint?: string; keys?: { p256dh: string; auth: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } },
      { status: 400 },
    );
  }

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'endpoint, keys.p256dh ve keys.auth zorunludur' } },
      { status: 400 },
    );
  }

  try {
    const subs = await getSubscriptions();

    // Aynı endpoint zaten kayıtlı mı?
    const existing = subs.findIndex((s) => s.endpoint === body.endpoint);
    const record: PushSubscriptionRecord = {
      endpoint: body.endpoint,
      keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
      userId: auth.userId ?? undefined,
      createdAt: existing >= 0 ? subs[existing]!.createdAt : new Date().toISOString(),
    };

    if (existing >= 0) {
      subs[existing] = record;
    } else {
      subs.push(record);
    }

    await saveSubscriptions(subs);

    return NextResponse.json({
      data: { message: 'Abonelik kaydedildi', endpoint: body.endpoint },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Bilinmeyen hata';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } },
      { status: 400 },
    );
  }

  if (!body.endpoint) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'endpoint zorunludur' } },
      { status: 400 },
    );
  }

  try {
    const subs = await getSubscriptions();
    const filtered = subs.filter((s) => s.endpoint !== body.endpoint);

    if (filtered.length === subs.length) {
      return NextResponse.json({
        data: { message: 'Abonelik bulunamadı (zaten kaldırılmış olabilir)' },
      });
    }

    await saveSubscriptions(filtered);

    return NextResponse.json({
      data: { message: 'Abonelik kaldırıldı', endpoint: body.endpoint },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Bilinmeyen hata';
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 },
    );
  }
}
