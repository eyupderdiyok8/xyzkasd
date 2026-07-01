import { NextResponse } from 'next/server';
import { PaymentRepository } from '@/repositories/payment.repository';
import { requireRole } from '@/lib/supabase/require-role';

/**
 * POST /api/payments
 * Body: { ticketId, customerId, amount, paymentMethod, installmentCount?, paidAt?, dueDate?, notes? }
 */
export async function POST(req: Request) {
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  let body;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } }, { status: 400 });
  }

  if (!body.ticketId || !body.customerId || body.amount == null || !body.paymentMethod) {
    return NextResponse.json({
      error: { code: 'VALIDATION_ERROR', message: 'ticketId, customerId, amount, paymentMethod zorunludur' },
    }, { status: 400 });
  }

  const validMethods = ['CASH', 'CREDIT_CARD', 'BANK_TRANSFER', 'PROMISSORY_NOTE', 'DEFERRED'];
  if (!validMethods.includes(body.paymentMethod)) {
    return NextResponse.json({
      error: { code: 'VALIDATION_ERROR', message: `paymentMethod şunlardan biri olmalı: ${validMethods.join(', ')}` },
    }, { status: 400 });
  }

  const repo = new PaymentRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    const payment = await repo.create({
      ticketId: body.ticketId,
      customerId: body.customerId,
      amount: Number(body.amount),
      paymentMethod: body.paymentMethod,
      installmentCount: body.installmentCount ?? null,
      paidAt: body.paidAt ?? null,
      dueDate: body.dueDate ?? null,
      notes: body.notes ?? null,
    });

    return NextResponse.json({ data: payment }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}

/**
 * GET /api/payments?ticketId=... or ?customerId=...
 */
export async function GET(req: Request) {
  const auth = await requireRole('technician');
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error!.status });
  }

  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get('ticketId');
  const customerId = searchParams.get('customerId');

  const repo = new PaymentRepository({ tenantId: auth.tenantId, role: auth.role!, userId: auth.userId });

  try {
    if (ticketId) {
      const payment = await repo.findByTicket(ticketId);
      return NextResponse.json({ data: payment });
    }
    if (customerId) {
      const payments = await repo.findByCustomer(customerId);
      return NextResponse.json({ data: payments });
    }
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'ticketId veya customerId gerekli' } }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: e.message } }, { status: 500 });
  }
}
