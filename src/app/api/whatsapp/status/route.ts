import { NextResponse } from 'next/server';
import { requireFeature } from '@/lib/supabase/require-feature';
import { getWahaManager } from '@/lib/whatsapp/waha-manager';

/**
 * GET /api/whatsapp/status
 *
 * Returns the current WhatsApp connection status for the tenant.
 *
 * Response: { status: string, qrData?: string, errorMessage?: string,
 *             lastConnectedAt?: string, autoReconnect: boolean }
 */
export async function GET() {
  const auth = await requireFeature('viewer', 'whatsapp');
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.error!.status },
    );
  }

  try {
    const manager = getWahaManager();
    const status = await manager.getStatus(auth.tenantId!);
    return NextResponse.json(status);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Durum alınırken hata oluştu',
        },
      },
      { status: 500 },
    );
  }
}
