import { NextResponse } from 'next/server';
import { requireFeature } from '@/lib/supabase/require-feature';
import { getWahaManager } from '@/lib/whatsapp/waha-manager';

/**
 * POST /api/whatsapp/disconnect
 *
 * Disconnects and logs out the WhatsApp session permanently.
 *
 * Response: { success: boolean }
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
    const result = await manager.disconnect(auth.tenantId!);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: err.message || 'Bağlantı kesilirken hata oluştu',
        },
      },
      { status: 500 },
    );
  }
}
