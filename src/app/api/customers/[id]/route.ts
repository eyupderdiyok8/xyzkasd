import { NextRequest, NextResponse } from 'next/server';
import { CustomerRepository } from '@/repositories/customer.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * GET /api/customers/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireRole('viewer');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new CustomerRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const customer = await repo.findById(id);
    return NextResponse.json({ data: customer });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Müşteri bulunamadı' } },
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
 * PUT /api/customers/[id]
 * Body: partial customer fields + phones/addresses
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Require minimum technician role for updating customers
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new CustomerRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const body = await request.json();
    const customer = await repo.update(id, body);
    return NextResponse.json({ data: customer });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Müşteri bulunamadı' } },
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
 * DELETE /api/customers/[id]  — soft delete
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Require minimum technician role for deleting customers
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new CustomerRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    await repo.delete(id);
    return NextResponse.json({ data: { id: id, deleted: true } });
  } catch (err: any) {
    if (err.message === 'NOT_FOUND') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Müşteri bulunamadı' } },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}
