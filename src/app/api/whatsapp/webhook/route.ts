import { NextRequest, NextResponse } from 'next/server';
import { getWahaManager } from '@/lib/whatsapp/waha-manager';

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

    const manager = getWahaManager();
    await manager.handleWebhookEvent({
      session: body.session,
      event: body.event,
      payload: body.payload ?? body,
    });

    return NextResponse.json({ received: true });
  } catch (err: any) {
    // WAHA expects 200 even on errors — it will retry otherwise
    console.error('WAHA webhook hatası:', err.message);
    return NextResponse.json({ received: true, error: err.message });
  }
}
