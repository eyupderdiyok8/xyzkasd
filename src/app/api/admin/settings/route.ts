// ──────────────────────────────────────────────
// GET /api/admin/settings?key=...
// PATCH /api/admin/settings  → { key, value }
// Super admin only
// ──────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { getSetting, setSetting } from '@/lib/system-settings';

export async function GET(req: NextRequest) {
  const auth = await requireRole('super_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const key = req.nextUrl.searchParams.get('key');
  if (!key) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'key parametresi gerekli' } },
      { status: 400 },
    );
  }

  try {
    const value = await getSetting(key);
    return NextResponse.json({ data: { key, value } });
  } catch (e: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: e.message } },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  const auth = await requireRole('super_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  let body: { key?: string; value?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } },
      { status: 400 },
    );
  }

  if (!body.key || body.value === undefined) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'key ve value zorunludur' } },
      { status: 400 },
    );
  }

  try {
    await setSetting(body.key, body.value, auth.userId ?? undefined);
    return NextResponse.json({ data: { key: body.key, value: body.value } });
  } catch (e: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: e.message } },
      { status: 500 },
    );
  }
}
