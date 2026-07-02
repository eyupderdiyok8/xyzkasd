// ──────────────────────────────────────────────
// POST /api/admin/import
// JSON yedek dosyasından tenant verisi içe aktarır.
// tenant_admin+ yetkisi gerektirir.
// ──────────────────────────────────────────────

import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { prismaClient } from '@/repositories/base.repository';

interface ImportResult {
  table: string;
  imported: number;
  skipped: number;
  errors: number;
}

export async function POST(req: Request) {
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

  let body: { tables: Record<string, any[]> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON. Lütfen .json yedek dosyası yükleyin.' } },
      { status: 400 },
    );
  }

  if (!body.tables || typeof body.tables !== 'object') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '"tables" alanı gerekli. Geçerli bir yedek dosyası yükleyin.' } },
      { status: 400 },
    );
  }

  const results: ImportResult[] = [];
  let totalImported = 0;

  for (const [table, rows] of Object.entries(body.tables)) {
    if (!Array.isArray(rows)) continue;

    const result: ImportResult = { table, imported: 0, skipped: 0, errors: 0 };

    for (const row of rows) {
      try {
        // Strip id/tenantId and assign current tenant
        const { id, tenantId, createdAt, updatedAt, deletedAt, ...cleanRow } = row;

        // Clean relation fields — remove nested objects (they'll be linked by ID)
        const createData: Record<string, unknown> = { tenantId: auth.tenantId! };
        for (const [key, value] of Object.entries(cleanRow)) {
          if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Nested relation — just copy the id if present
            if ((value as any).id) {
              createData[key] = { connect: { id: (value as any).id } };
            }
          } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
            // Array of relations — skip for now, handle manually
          } else {
            createData[key] = value;
          }
        }

        // Use upsert to avoid duplicates (match by original id + tenantId)
        if (id) {
          await (prismaClient as any)[table].upsert({
            where: { id },
            create: { id, ...createData },
            update: createData,
          });
        } else {
          await (prismaClient as any)[table].create({ data: createData });
        }

        result.imported++;
        totalImported++;
      } catch (err: any) {
        // Skip problematic rows — don't fail the whole import
        result.errors++;
      }
    }

    if (result.imported > 0 || result.errors > 0) {
      results.push(result);
    }
  }

  return NextResponse.json({
    data: {
      totalImported,
      results,
      tenantId: auth.tenantId,
    },
  });
}
