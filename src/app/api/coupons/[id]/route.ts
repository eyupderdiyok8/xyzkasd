import { NextRequest, NextResponse } from 'next/server';
import { CouponRepository } from '@/repositories/coupon.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * GET /api/coupons/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireRole('manager');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new CouponRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const coupon = await repo.findById(id);
    return NextResponse.json({ data: coupon });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Kupon bulunamadı' } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/coupons/[id]
 * Body: partial coupon fields
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireRole('tenant_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new CouponRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const body = await request.json();
    const coupon = await repo.update(id, body);
    return NextResponse.json({ data: coupon });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Kupon bulunamadı' } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/coupons/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireRole('tenant_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new CouponRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    await repo.delete(id);
    return NextResponse.json({ data: { id: id, deleted: true } });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Kupon bulunamadı' } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}
