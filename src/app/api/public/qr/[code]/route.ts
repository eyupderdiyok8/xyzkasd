import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/public/qr/[code]
 * Public endpoint — no auth required.
 * Returns device info + service history by QR code.
 */
export async function GET(
  _: unknown,
  { params }: { params: { code: string } },
) {
  try {
    const device = await prisma.device.findUnique({
      where: { qrCode: params.code },
      include: {
        tenant: {
          select: { id: true, name: true, logo: true, phone: true, email: true },
        },
        serviceTickets: {
          include: {
            technician: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: { serviceTickets: true },
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Bu QR koda ait cihaz bulunamadı' } },
        { status: 404 },
      );
    }

    // Public-safe response — no PII beyond what's needed
    return NextResponse.json({
      data: {
        id: device.id,
        serialNo: device.serialNo,
        brand: device.brand,
        model: device.model,
        status: device.status,
        warrantyStart: device.warrantyStart?.toISOString() ?? null,
        warrantyEnd: device.warrantyEnd?.toISOString() ?? null,
        installDate: device.installDate?.toISOString() ?? null,
        tenant: {
          name: device.tenant.name,
          logo: device.tenant.logo,
          phone: device.tenant.phone,
          email: device.tenant.email,
        },
        serviceTickets: device.serviceTickets.map((t) => ({
          id: t.id,
          ticketNo: t.ticketNo,
          status: t.status,
          issueDesc: t.issueDesc,
          resolution: t.resolution,
          createdAt: t.createdAt.toISOString(),
          completedAt: t.completedAt?.toISOString() ?? null,
          technician: t.technician?.name ?? null,
        })),
        _count: { serviceTickets: device._count.serviceTickets },
      },
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Bir hata oluştu' } },
      { status: 500 },
    );
  }
}
