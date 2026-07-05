import { randomUUID } from 'node:crypto';
import { BaseRepository } from './base.repository';
import { paginationMeta, type PaginationMeta, type PaginationParams } from '@/lib/api-pagination';
import { stockOutAllowNegative, type StockWarning } from '@/lib/inventory-stock';

function generateQrCode(): string {
  return 'QR-' + randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase();
}

function generateSaleTicketNo(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const seq = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SAT-${y}${m}${d}-${seq}`;
}

export class DeviceRepository extends BaseRepository {
  // ─── CRUD ─────────────────────────────────

  private buildListWhere(opts?: { search?: string; status?: string; showDeleted?: boolean }) {
    const where: any = {
      ...this.tenantFilter(),
    };
    // Default: exclude soft-deleted devices
    if (!opts?.showDeleted) where.deletedAt = null;

    if (opts?.status) {
      where.status = opts.status;
    }

    if (opts?.search) {
      const s = opts.search;
      where.OR = [
        { serialNo: { contains: s } },
        { brand: { contains: s } },
        { model: { contains: s } },
        { qrCode: { contains: s } },
      ];
    }
    return where;
  }

  async findAll(opts?: { search?: string; status?: string; showDeleted?: boolean }) {
    const where = this.buildListWhere(opts);
    return this.prisma.device.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true },
        },
        _count: {
          select: { tdsReadings: true, serviceTickets: true, photos: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllPaged(opts: { search?: string; status?: string; showDeleted?: boolean }, pagination: PaginationParams): Promise<{ data: any[]; meta: PaginationMeta }> {
    const where = this.buildListWhere(opts);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.device.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          _count: { select: { tdsReadings: true, serviceTickets: true, photos: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.device.count({ where }),
    ]);

    return { data, meta: paginationMeta(pagination.page, pagination.pageSize, total) };
  }

  async findById(id: string, showDeleted?: boolean) {
    const where: any = {
      id,
      ...this.tenantFilter(),
    };
    if (!showDeleted) where.deletedAt = null;

    const device = await this.prisma.device.findFirst({
      where,
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
        photos: {
          orderBy: { createdAt: 'desc' },
        },
        tdsReadings: {
          orderBy: { recordedAt: 'desc' },
          take: 20,
        },
        serviceTickets: {
          include: {
            technician: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { tdsReadings: true, serviceTickets: true, photos: true },
        },
      },
    });

    if (!device) throw new Error('NOT_FOUND');
    return device;
  }

  async create(input: {
    serialNo: string;
    brand: string;
    model: string;
    tenantId: string;
    customerId?: string;
    warrantyStart?: string | null;
    warrantyEnd?: string | null;
    installDate?: string | null;
    notes?: string | null;
    status?: string;
    sale?: {
      inventoryItemId: string;
      amount?: number | null;
      paymentMethod?: string | null;
      installmentCount?: number | null;
      dueDate?: string | null;
      notes?: string | null;
    } | null;
  }) {
    const qrCode = generateQrCode();
    if (!input.sale?.inventoryItemId) {
      const device = await this.prisma.device.create({
        data: {
          serialNo: input.serialNo,
          brand: input.brand,
          model: input.model,
          tenantId: input.tenantId,
          customerId: input.customerId ?? null,
          qrCode,
          status: input.status ?? 'ACTIVE',
          warrantyStart: input.warrantyStart ? new Date(input.warrantyStart) : null,
          warrantyEnd: input.warrantyEnd ? new Date(input.warrantyEnd) : null,
          installDate: input.installDate ? new Date(input.installDate) : null,
          notes: input.notes ?? null,
        },
      });

      await this.auditCreate({
        entity: 'device',
        entityId: device.id,
        newValues: { serialNo: device.serialNo, brand: device.brand, model: device.model, status: device.status, customerId: device.customerId },
      });

      return device;
    }

    const warnings: StockWarning[] = [];
    let saleTicket: any = null;
    let payment: any = null;

    const device = await this.prisma.$transaction(async (tx) => {
      const created = await tx.device.create({
        data: {
          serialNo: input.serialNo,
          brand: input.brand,
          model: input.model,
          tenantId: input.tenantId,
          customerId: input.customerId ?? null,
          qrCode,
          status: input.status ?? 'ACTIVE',
          warrantyStart: input.warrantyStart ? new Date(input.warrantyStart) : null,
          warrantyEnd: input.warrantyEnd ? new Date(input.warrantyEnd) : null,
          installDate: input.installDate ? new Date(input.installDate) : null,
          notes: input.notes ?? null,
        },
      });

      if (input.sale?.inventoryItemId && input.customerId) {
        let ticketNo = generateSaleTicketNo();
        let attempts = 0;
        while (await tx.serviceTicket.findUnique({ where: { ticketNo } })) {
          ticketNo = generateSaleTicketNo();
          attempts++;
          if (attempts > 10) throw new Error('TicketNo generation failed');
        }

        saleTicket = await tx.serviceTicket.create({
          data: {
            ticketNo,
            tenantId: input.tenantId,
            customerId: input.customerId,
            deviceId: created.id,
            issueDesc: 'Cihaz satışı / kurulum',
            status: 'COMPLETED',
            completedAt: new Date(),
            workDone: 'Cihaz satışı ve kurulumu kaydedildi.',
            resolution: input.sale.notes ?? null,
          },
        });

        const stockWarning = await stockOutAllowNegative(tx, {
          itemId: input.sale.inventoryItemId,
          tenantId: input.tenantId,
          quantity: 1,
          referenceType: 'SERVICE',
          referenceId: saleTicket.ticketNo,
          notes: `Cihaz satışı #${saleTicket.ticketNo} — ${created.brand} ${created.model}`,
          createdBy: this.userId,
        });
        if (stockWarning) warnings.push(stockWarning);

        const amount = Number(input.sale.amount ?? 0);
        if (amount > 0) {
          const paymentMethod = input.sale.paymentMethod || 'CASH';
          payment = await tx.servicePayment.create({
            data: {
              ticketId: saleTicket.id,
              tenantId: input.tenantId,
              customerId: input.customerId,
              amount,
              paymentMethod,
              status: paymentMethod === 'DEFERRED' ? 'PENDING' : 'PAID',
              installmentCount: input.sale.installmentCount ?? null,
              paidAt: paymentMethod === 'DEFERRED' ? null : new Date(),
              dueDate: input.sale.dueDate ? new Date(input.sale.dueDate) : null,
              notes: input.sale.notes ?? 'Cihaz satışı',
              createdBy: this.userId,
            },
          });
        }
      }

      return created;
    });

    await this.auditCreate({
      entity: 'device',
      entityId: device.id,
      newValues: { serialNo: device.serialNo, brand: device.brand, model: device.model, status: device.status, customerId: device.customerId },
    });

    return { ...device, saleTicket, payment, warnings };
  }

  async update(id: string, input: Record<string, unknown>) {
    const original = await this.findById(id);
    const oldValues = { serialNo: original.serialNo, brand: original.brand, model: original.model, status: original.status, customerId: original.customerId };

    const data: any = { ...input };
    if (typeof data.warrantyStart === 'string' || data.warrantyStart === null) {
      data.warrantyStart = data.warrantyStart ? new Date(data.warrantyStart) : null;
    }
    if (typeof data.warrantyEnd === 'string' || data.warrantyEnd === null) {
      data.warrantyEnd = data.warrantyEnd ? new Date(data.warrantyEnd) : null;
    }
    if (typeof data.installDate === 'string' || data.installDate === null) {
      data.installDate = data.installDate ? new Date(data.installDate) : null;
    }
    const updated = await this.prisma.device.update({ where: { id }, data });

    await this.auditUpdate({
      entity: 'device',
      entityId: id,
      oldValues,
      newValues: { serialNo: updated.serialNo, brand: updated.brand, model: updated.model, status: updated.status, customerId: updated.customerId },
    });

    return updated;
  }

  async delete(id: string) {
    const original = await this.findById(id);
    await this.prisma.device.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditDelete({
      entity: 'device',
      entityId: id,
      deletedValues: { serialNo: original.serialNo, brand: original.brand, model: original.model },
    });
  }

  async restore(id: string) {
    const original = await this.prisma.device.findFirst({
      where: { id, ...this.tenantFilter() },
    });
    if (!original) throw new Error('NOT_FOUND');

    const updated = await this.prisma.device.update({
      where: { id },
      data: { deletedAt: null },
    });

    await this.auditUpdate({
      entity: 'device',
      entityId: id,
      oldValues: { deletedAt: original.deletedAt?.toISOString() ?? null },
      newValues: { deletedAt: null },
    });

    return updated;
  }

  // ─── QR Code ──────────────────────────────

  async findByQrCode(code: string) {
    return this.prisma.device.findFirst({
      where: { qrCode: code, deletedAt: null, ...this.tenantFilter() },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    });
  }

  // ─── Photos ───────────────────────────────

  async getPhotos(deviceId: string) {
    await this.ensureDeviceAccess(deviceId);
    return this.prisma.devicePhoto.findMany({
      where: { deviceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPhoto(photoId: string) {
    const photo = await this.prisma.devicePhoto.findFirst({
      where: { id: photoId, deletedAt: null, ...this.tenantFilter() },
    });
    if (!photo) throw new Error('NOT_FOUND');
    return photo;
  }

  async deletePhoto(photoId: string) {
    await this.getPhoto(photoId);
    return this.prisma.devicePhoto.delete({ where: { id: photoId } });
  }

  async deleteAllPhotos(deviceId: string) {
    await this.ensureDeviceAccess(deviceId);
    return this.prisma.devicePhoto.deleteMany({
      where: { deviceId },
    });
  }

  async addPhoto(input: {
    deviceId: string;
    tenantId: string;
    storagePath: string;
    fileName: string;
    mimeType: string;
    isPrimary: boolean;
  }) {
    await this.ensureDeviceAccess(input.deviceId);
    if (input.isPrimary) {
      await this.prisma.devicePhoto.updateMany({
        where: { deviceId: input.deviceId, isPrimary: true },
        data: { isPrimary: false },
      });
    }
    return this.prisma.devicePhoto.create({ data: input });
  }

  // ─── TDS Readings ──────────────────────────

  async getTdsHistory(deviceId: string) {
    await this.ensureDeviceAccess(deviceId);
    return this.prisma.tdsReading.findMany({
      where: { deviceId, deletedAt: null },
      orderBy: { recordedAt: 'desc' },
      take: 50,
    });
  }

  async addTdsReading(input: {
    deviceId: string;
    tenantId: string;
    tdsValue: number;
    inValue?: number | null;
    outValue?: number | null;
    notes?: string | null;
    recordedBy?: string | null;
  }) {
    await this.ensureDeviceAccess(input.deviceId);
    return this.prisma.tdsReading.create({ data: input });
  }

  // ─── Helpers ──────────────────────────────

  private async ensureDeviceAccess(deviceId: string) {
    const device = await this.prisma.device.findFirst({
      where: { id: deviceId, deletedAt: null, ...this.tenantFilter() },
      select: { id: true },
    });
    if (!device) throw new Error('NOT_FOUND');
  }
}
