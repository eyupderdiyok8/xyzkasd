import { NextRequest, NextResponse } from 'next/server';
import { requireFeature } from '@/lib/supabase/require-feature';
import { getWahaManager } from '@/lib/whatsapp/waha-manager';

/**
 * POST /api/whatsapp/send
 *
 * Send a WhatsApp message from the tenant's connected number.
 *
 * Body: { to: string, text: string }
 *
 * Response: { success: boolean, messageId?: string, error?: string }
 */
export async function POST(request: NextRequest) {
  const auth = await requireFeature('technician', 'whatsapp');
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error!.status },
    );
  }

  try {
    const body = await request.json();

    if (!body.to || typeof body.to !== 'string') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Alıcı telefon numarası (to) zorunludur',
          },
        },
        { status: 400 },
      );
    }

    if (!body.text || typeof body.text !== 'string' || body.text.trim().length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Mesaj metni (text) zorunludur',
          },
        },
        { status: 400 },
      );
    }

    const manager = getWahaManager();
    const result = await manager.sendMessage(auth.tenantId!, body.to, body.text);

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Mesaj gönderilirken hata oluştu',
        },
      },
      { status: 500 },
    );
  }
}
