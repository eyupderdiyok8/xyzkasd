import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { prismaClient } from '@/repositories/base.repository';

/**
 * GET /api/tenants
 * Returns the list of all active tenants — super_admin only.
 */
export async function GET() {
  const auth = await requireRole('super_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const tenants = await prismaClient.tenant.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, plan: true, isActive: true },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ data: tenants });
}

/**
 * POST /api/tenants
 * Body: { name, slug, plan? }
 * Creates a new tenant — super_admin only.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRole('super_admin');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  let body: { name: string; slug: string; plan?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } },
      { status: 400 },
    );
  }

  if (!body.name || !body.slug) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'name ve slug zorunludur' } },
      { status: 400 },
    );
  }

  try {
    const tenant = await prismaClient.tenant.create({
      data: {
        name: body.name.trim(),
        slug: body.slug.trim().toLowerCase(),
        plan: (body.plan as any) ?? 'STARTER',
        isActive: true,
      },
    });

    return NextResponse.json({ data: tenant }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 },
    );
  }
}
