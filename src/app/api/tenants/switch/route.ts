import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * POST /api/tenants/switch
 * Body: { tenantId: string | null }  — null or "all" = tüm firmalar
 * Sets tenant_ctx cookie for super_admin tenant filtering.
 */
export async function POST(req: NextRequest) {
  const auth = await requireRole('super_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  let body: { tenantId?: string | null };
  try { body = await req.json(); } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } },
      { status: 400 },
    );
  }

  const tenantId = body.tenantId === 'all' || !body.tenantId ? null : body.tenantId;

  const res = NextResponse.json({ data: { tenantId } });

  if (tenantId) {
    res.cookies.set('tenant_ctx', tenantId, {
      path: '/',
      maxAge: 60 * 60 * 24, // 1 gün
      httpOnly: true,
      sameSite: 'lax',
    });
  } else {
    res.cookies.set('tenant_ctx', '', {
      path: '/',
      maxAge: 0, // sil
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  return res;
}
