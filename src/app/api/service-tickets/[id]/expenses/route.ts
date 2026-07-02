import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/supabase/require-role';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/service-tickets/:id/expenses — Update expenses after service completion
 * Body: { expenses: "[{\"type\":\"travel\",\"amount\":150,\"description\":\"...\"}]" }
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireRole('technician');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.error!.status });

  let b;
  try { b = await req.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 });
  }

  const expenses = b.expenses as string | undefined;
  if (expenses == null) return NextResponse.json({ error: { code: 'VALIDATION_ERROR' } }, { status: 400 });

  try {
    const ticket = await prisma.serviceTicket.update({
      where: { id, tenantId: auth.tenantId! },
      data: { expenses },
    });
    return NextResponse.json({ data: { expenses: ticket.expenses } });
  } catch {
    return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
  }
}
