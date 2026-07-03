import { NextRequest, NextResponse } from 'next/server';
import { getWahaManager } from '@/lib/whatsapp/waha-manager';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';

/**
 * POST /api/whatsapp/webhook
 *
 * WAHA (WhatsApp HTTP API) webhook endpoint.
 * WAHA sends events here for session status changes, incoming messages, etc.
 *
 * Configure WAHA_WEBHOOK_URL env var to point to this endpoint.
 *
 * WAHA event types:
 *   - session.status   → QR code, connected, disconnected, failed
 *   - message.ack      → delivery/read receipt
 *   - message.received → incoming message
 *
 * Request body (WAHA format):
 *   { "event": "session.status", "session": "tenant_xxx", "payload": { ... } }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate basic structure
    if (!body.event || !body.session) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'event ve session zorunludur' } },
        { status: 400 },
      );
    }

    // Rate limit: en fazla 60 webhook çağrısı / dakika / IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown';
    const rl = checkRateLimit(ip, { keyPrefix: 'whatsapp-webhook', maxRequests: 60 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: `Çok fazla istek. ${rl.retryAfter} saniye sonra tekrar deneyin.` } },
        { status: 429 },
      );
    }

    // Verify webhook secret to prevent unauthorized event injection
    const dbSession = await prisma.whatsAppSession.findFirst({
      where: { sessionName: body.session },
      select: { webhookSecret: true, id: true },
    });

    if (!dbSession) {
      console.warn(`[webhook] Unknown session: ${body.session}`);
      return NextResponse.json({ received: true, error: 'Unknown session' });
    }

    const incomingSecret = request.headers.get('x-webhook-secret')
      ?? request.headers.get('x-waha-webhook-secret');

    if (dbSession.webhookSecret && incomingSecret !== dbSession.webhookSecret) {
      console.warn(`[webhook] Secret mismatch for session ${body.session}`);
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Geçersiz webhook secret' } },
        { status: 401 },
      );
    }

    const manager = getWahaManager();
    await manager.handleWebhookEvent({
      session: body.session,
      event: body.event,
      payload: body.payload ?? body,
    });

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Bilinmeyen webhook hatası';
    console.error('[webhook] WAHA webhook hatası:', message);
    // Return 200 so WAHA doesn't retry, but include the error for observability
    return NextResponse.json({ received: true, error: message });
  }
}
