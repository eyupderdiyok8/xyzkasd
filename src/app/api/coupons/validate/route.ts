import { NextRequest, NextResponse } from 'next/server';
import { CouponRepository } from '@/repositories/coupon.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * POST /api/coupons/validate
 * Body: { code, customerId?, ticketId? }
 *
 * Validates a coupon code and optionally consumes it.
 * Use `validateOnly: true` to check without consuming.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole('viewer');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new CouponRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const body = await request.json();

    if (!body.code || typeof body.code !== 'string' || body.code.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Kupon kodu zorunludur' } },
        { status: 400 },
      );
    }

    const code = body.code.trim().toUpperCase();

    if (body.validateOnly === true) {
      // Just validate, don't consume
      const coupon = await repo.validate(code);
      return NextResponse.json({
        data: {
          valid: true,
          code: coupon.code,
          discountPct: coupon.discountPct,
          expiresAt: coupon.expiresAt,
          currentUses: coupon.currentUses,
          maxUses: coupon.maxUses,
        },
      });
    }

    // Validate and consume
    const coupon = await repo.use(code, {
      customerId: body.customerId || undefined,
      ticketId: body.ticketId || undefined,
    });

    return NextResponse.json({
      data: {
        valid: true,
        code: coupon.code,
        discountPct: coupon.discountPct,
        used: true,
      },
    });
  } catch (err: any) {
    const errorMap: Record<string, { status: number; code: string; message: string }> = {
      NOT_FOUND: { status: 404, code: 'NOT_FOUND', message: 'Kupon kodu bulunamadı' },
      INACTIVE: { status: 400, code: 'INACTIVE', message: 'Bu kupon aktif değil' },
      EXPIRED: { status: 400, code: 'EXPIRED', message: 'Bu kuponun süresi dolmuş' },
      MAX_USES_REACHED: { status: 400, code: 'MAX_USES_REACHED', message: 'Bu kupon maksimum kullanım sayısına ulaştı' },
    };

    const mapped = errorMap[err.message];
    if (mapped) {
      return NextResponse.json({ error: mapped }, { status: mapped.status });
    }

    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}
