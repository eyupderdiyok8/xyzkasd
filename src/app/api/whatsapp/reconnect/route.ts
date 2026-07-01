import { NextResponse } from 'next/server';
import { requireFeature } from '@/lib/supabase/require-feature';
import { getWahaManager } from '@/lib/whatsapp/waha-manager';

/**
 * POST /api/whatsapp/reconnect
 *
 * Disconnects the current session and starts a fresh one.
 * Returns new QR code for scanning.
 *
 * Response: { success: boolean, qrData?: string, status: string, error?: string }
 */
export async function POST() {
  const auth = await requireFeature('tenant_admin', 'whatsapp');
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error!.status },
    );
  }

  try {
    const manager = getWahaManager();

    const health = await manager.healthCheck();
    if (!health) {
      return NextResponse.json(
        {
          error: {
            code: 'WAHA_UNAVAILABLE',
            message: 'WAHA sunucusuna erişilemiyor.',
          },
        },
        { status: 503 },
      );
    }

    const result = await manager.reconnect(auth.tenantId!);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Yeniden bağlanırken hata oluştu',
        },
      },
      { status: 500 },
    );
  }
}
