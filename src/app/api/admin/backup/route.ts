// ──────────────────────────────────────────────
// GET /api/admin/backup
// Tüm tenant verisini JSON olarak dışa aktarır.
// tenant_admin+ yetkisi gerektirir.
// ──────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { prismaClient } from '@/repositories/base.repository';

const TABLES = [
  'customer',
  'device',
  'serviceTicket',
  'servicePayment',
  'technician',
  'inventoryItem',
  'inventoryTransaction',
  'deviceFilter',
  'deviceMaintenance',
  'maintenanceReminder',
  'coupon',
  'couponUsage',
  'serviceSurvey',
  'automationRule',
  'filterCatalog',
  'filterChange',
  'messageTemplate',
  'customerAddress',
  'customerPhone',
] as const;

export async function GET() {
  const auth = await requireRole('tenant_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  if (!auth.tenantId) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Tenant bulunamadı' } },
      { status: 404 },
    );
  }

  try {
    const backup: { exportedAt: string; tenantId: string; tables: Record<string, unknown> } = {
      exportedAt: new Date().toISOString(),
      tenantId: auth.tenantId,
      tables: {},
    };

    // Her tabloyu tenantId ile filtreleyip çek
    for (const table of TABLES) {
      try {
        const rows = await (prismaClient as any)[table].findMany({
          where: { tenantId: auth.tenantId },
        });
        if (rows.length > 0) {
          backup.tables[table] = rows;
        }
      } catch {
        // Tablo yoksa veya hata alırsa atla
      }
    }

    const tenant = await prismaClient.tenant.findUnique({
      where: { id: auth.tenantId },
      select: { id: true, name: true, slug: true },
    });
    const fileName = `wps-backup-${tenant?.slug ?? auth.tenantId}-${new Date().toISOString().slice(0, 10)}.json`;

    const jsonStr = JSON.stringify(backup, null, 2);

    return new NextResponse(jsonStr, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: e.message } },
      { status: 500 },
    );
  }
}
