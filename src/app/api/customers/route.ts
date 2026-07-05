import { NextRequest, NextResponse } from 'next/server';
import { CustomerRepository } from '@/repositories/customer.repository';
import { requireRole } from '@/lib/supabase/require-role';
import { parsePagination } from '@/lib/api-pagination';

/**
 * GET /api/customers
 * Query params:
 *   ?search=<term>   — search by name or phone number
 *   ?showAll=true    — include soft-deleted customers
 */
export async function GET(request: NextRequest) {
  const auth = await requireRole('viewer');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new CustomerRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const showDeleted = searchParams.get('showDeleted') === 'true' || searchParams.get('showAll') === 'true';
    const includeDeleted = showDeleted && (auth.role === 'manager' || auth.role === 'tenant_admin' || auth.role === 'super_admin');

    const result = typeof (repo as any).findAllPaged === 'function'
      ? await repo.findAllPaged(search, includeDeleted, parsePagination(searchParams))
      : { data: await repo.findAll(search, includeDeleted) };
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}

/**
 * POST /api/customers
 * Body: { name, email?, notes?, tags?, phones?, addresses? }
 */
export async function POST(request: NextRequest) {
  // Require minimum technician role for creating customers
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const repo = new CustomerRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const body = await request.json();
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Müşteri adı zorunludur' } },
        { status: 400 },
      );
    }

    const customer = await repo.create({
      name: body.name.trim(),
      email: body.email?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
      tags: body.tags?.trim() || undefined,
      phones: body.phones || undefined,
      addresses: body.addresses || undefined,
      // Super admin can create customers for any tenant
      tenantId: auth.role === 'super_admin' && typeof body.tenantId === 'string'
        ? body.tenantId
        : undefined,
    });

    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message || 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}
