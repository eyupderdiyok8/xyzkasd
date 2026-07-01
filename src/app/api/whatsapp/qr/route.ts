import { NextResponse } from 'next/server';
import { requireFeature } from '@/lib/supabase/require-feature';
import { getWahaManager } from '@/lib/whatsapp/waha-manager';

/**
 * GET /api/whatsapp/qr
 *
 * Returns QR code data for the current tenant's WhatsApp session.
 * If no session exists, starts one.
 *
 * Response: { qrData?: string, status: string, error?: string }
 */
export async function GET() {
  const auth = await requireFeature('tenant_admin', 'whatsapp');
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error!.status },
    );
  }

  try {
    const manager = getWahaManager();

    // Health check first
    const health = await manager.healthCheck();
    if (!health) {
      return NextResponse.json(
        {
          error: {
            code: 'WAHA_UNAVAILABLE',
            message:
              'WAHA sunucusuna erişilemiyor. Lütfen WAHA Docker container\'ının çalıştığından emin olun.',
          },
        },
        { status: 503 },
      );
    }

    const result = await manager.getOrCreateSession(auth.tenantId!);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'QR kod alınırken hata oluştu',
        },
      },
      { status: 500 },
    );
  }
}
