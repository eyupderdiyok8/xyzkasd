import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuditService } from '@/lib/audit.service';

function generateTicketNo(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const seq = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SRV-${y}${m}${d}-${seq}`;
}

/**
 * POST /api/public/service-request
 * Public endpoint — no auth required.
 * Creates a PENDING service ticket for the given device.
 * Body: { deviceId, issueDesc, customerName?, customerPhone? }
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Geçersiz JSON' } },
      { status: 400 },
    );
  }

  const deviceId = String(body.deviceId ?? '');
  const issueDesc = String(body.issueDesc ?? '').trim();

  if (!deviceId || !issueDesc) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'deviceId ve issueDesc zorunludur',
        },
      },
      { status: 400 },
    );
  }

  if (issueDesc.length < 10) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Sorun açıklaması en az 10 karakter olmalıdır',
        },
      },
      { status: 400 },
    );
  }

  try {
    // Look up device to get tenant + customer
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      select: { id: true, tenantId: true, customerId: true },
    });

    if (!device || !device.customerId) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Cihaz bulunamadı veya müşteri kaydı yok',
          },
        },
        { status: 404 },
      );
    }

    // Generate unique ticket number
    let ticketNo = generateTicketNo();
    let attempts = 0;
    while (await prisma.serviceTicket.findUnique({ where: { ticketNo } })) {
      ticketNo = generateTicketNo();
      attempts++;
      if (attempts > 10) {
        return NextResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'Ticket oluşturulamadı' } },
          { status: 500 },
        );
      }
    }

    const ticket = await prisma.serviceTicket.create({
      data: {
        ticketNo,
        tenantId: device.tenantId,
        customerId: device.customerId,
        deviceId: device.id,
        issueDesc,
        status: 'PENDING',
      },
    });

    await AuditService.logCreate({
      tenantId: device.tenantId,
      userId: null,
      entity: 'service_ticket',
      entityId: ticket.id,
      newValues: {
        ticketNo: ticket.ticketNo,
        issueDesc,
        status: 'PENDING',
        deviceId: device.id,
        customerId: device.customerId,
      },
      ipAddress: null,
    });

    return NextResponse.json(
      {
        data: {
          ticketNo: ticket.ticketNo,
          status: ticket.status,
          message: 'Servis talebiniz başarıyla alınmıştır. En kısa sürede size dönüş yapılacaktır.',
        },
      },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Servis talebi oluşturulamadı' } },
      { status: 500 },
    );
  }
}
