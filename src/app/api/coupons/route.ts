import { NextRequest, NextResponse } from 'next/server';
import { CouponRepository } from '@/repositories/coupon.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * GET /api/coupons
 * List all coupons for the tenant.
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole('manager');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new CouponRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const showDeleted = request.nextUrl.searchParams.get('showDeleted') === 'true' && (auth.role === 'tenant_admin' || auth.role === 'super_admin');
    const coupons = await repo.findAll(showDeleted);
    return NextResponse.json({ data: coupons });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}

/**
 * POST /api/coupons
 * Body: { code, discountPct, maxUses?, expiresAt?, description? }
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole('tenant_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new CouponRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const body = await request.json();

    // Validation
    if (!body.code || typeof body.code !== 'string' || body.code.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Kupon kodu zorunludur' } },
        { status: 400 },
      );
    }
    if (
      body.discountPct === undefined ||
      typeof body.discountPct !== 'number' ||
      body.discountPct <= 0 ||
      body.discountPct > 100
    ) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'İndirim yüzdesi 1-100 arasında olmalıdır' } },
        { status: 400 },
      );
    }

    const coupon = await repo.create({
      code: body.code.trim(),
      discountPct: body.discountPct,
      maxUses: body.maxUses ?? 1,
      expiresAt: body.expiresAt || null,
      description: body.description?.trim() || null,
    });

    return NextResponse.json({ data: coupon }, { status: 201 });
  } catch (err: any) {
    if (err.message === 'DUPLICATE_CODE') {
      return NextResponse.json(
        { error: { code: 'CONFLICT', message: 'Bu kupon kodu zaten mevcut' } },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}
