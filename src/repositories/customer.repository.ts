import { BaseRepository } from './base.repository';
import { paginationMeta, type PaginationMeta, type PaginationParams } from '@/lib/api-pagination';

/** Phone with optional id — id is stripped before create */
interface PhoneInput {
  id?: string;
  label: string;
  number: string;
}

/** Address with optional id — id is stripped before create */
interface AddressInput {
  id?: string;
  label: string;
  address: string;
  city: string;
  district: string;
}

interface CreateCustomerInput {
  name: string;
  tenantId?: string; // override for SUPER_ADMIN
  email?: string | null;
  notes?: string | null;
  tags?: string; // non-nullable in schema (default "")
  phones?: PhoneInput[];
  addresses?: AddressInput[];
}

interface UpdateCustomerInput {
  name?: string;
  email?: string | null;
  notes?: string | null;
  tags?: string;
  phones?: PhoneInput[];
  addresses?: AddressInput[];
}

export class CustomerRepository extends BaseRepository {
  // ─── List ───────────────────────────────────

  private buildListWhere(search?: string, showAll?: boolean) {
    const where: any = this.tenantFilter();
    if (!showAll) where.deletedAt = null;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { phones: { some: { number: { contains: search } } } },
      ];
    }
    return where;
  }

  async findAll(search?: string, showAll?: boolean) {
    const where = this.buildListWhere(search, showAll);
    return this.prisma.customer.findMany({
      where,
      include: {
        phones: {
          where: { deletedAt: null },
          select: { id: true, label: true, number: true },
          orderBy: { label: 'asc' },
        },
        _count: { select: { devices: true, serviceTickets: true, addresses: true, phones: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAllPaged(search: string | undefined, showAll: boolean | undefined, pagination: PaginationParams): Promise<{ data: any[]; meta: PaginationMeta }> {
    const where = this.buildListWhere(search, showAll);
    const [data, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        include: {
          phones: {
            where: { deletedAt: null },
            select: { id: true, label: true, number: true },
            orderBy: { label: 'asc' },
          },
          _count: { select: { devices: true, serviceTickets: true, addresses: true, phones: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, meta: paginationMeta(pagination.page, pagination.pageSize, total) };
  }

  // ─── Get by ID ─────────────────────────────

  async findById(id: string) {
    const c = await this.prisma.customer.findFirst({
      where: { id, ...this.tenantFilter() },
      include: {
        phones: {
          where: { deletedAt: null },
          select: { id: true, label: true, number: true },
          orderBy: { label: 'asc' },
        },
        addresses: {
          where: { deletedAt: null },
          select: { id: true, label: true, address: true, city: true, district: true },
          orderBy: { label: 'asc' },
        },
        devices: {
          select: {
            id: true,
            serialNo: true,
            brand: true,
            model: true,
            status: true,
            installDate: true,
            _count: { select: { tdsReadings: true, serviceTickets: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        serviceTickets: {
          select: {
            id: true,
            ticketNo: true,
            status: true,
            issueDesc: true,
            resolution: true,
            scheduledAt: true,
            completedAt: true,
            createdAt: true,
            device: { select: { brand: true, model: true, serialNo: true } },
            technician: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { devices: true, serviceTickets: true, addresses: true, phones: true } },
      },
    });
    if (!c) throw new Error('NOT_FOUND');
    return c;
  }

  // ─── Create ─────────────────────────────────

  async create(input: CreateCustomerInput) {
    const { phones, addresses, tenantId: explicitTenantId, ...fields } = input;
    const tenantId = explicitTenantId ?? this.tenantId;
    if (!tenantId) throw new Error('Tenant gerekli');

    const customer = await this.prisma.customer.create({
      data: {
        ...fields,
        tenantId,
        // Legacy fields for backward compatibility
        phone: phones?.[0]?.number ?? '',
        address: addresses?.[0]?.address ?? null,
        city: addresses?.[0]?.city ?? null,
        district: addresses?.[0]?.district ?? null,
        // Nested creates — strip id to let Prisma auto-generate
        ...(phones && phones.length > 0
          ? { phones: { create: phones.map(({ id: _id, ...p }) => ({ ...p, tenantId })) } }
          : {}),
        ...(addresses && addresses.length > 0
          ? { addresses: { create: addresses.map(({ id: _id, ...a }) => ({ ...a, tenantId })) } }
          : {}),
      },
      include: {
        phones: { where: { deletedAt: null }, select: { id: true, label: true, number: true } },
        addresses: { where: { deletedAt: null }, select: { id: true, label: true, address: true, city: true, district: true } },
      },
    });

    await this.auditCreate({
      entity: 'customer',
      entityId: customer.id,
      newValues: { name: customer.name, email: customer.email, phone: customer.phone, tags: customer.tags },
    });

    return customer;
  }

  // ─── Update ─────────────────────────────────

  async update(id: string, input: UpdateCustomerInput) {
    const original = await this.findById(id);
    const { phones, addresses, ...fields } = input;
    const tenantId = original.tenantId;

    const oldValues = { name: original.name, email: original.email, phone: original.phone, tags: original.tags };

    const updated = await this.prisma.$transaction(async (tx) => {
      // Update customer fields + legacy fields
      const data: any = { ...fields };
      if (phones && phones.length > 0) {
        data.phone = phones[0].number;
      }
      if (addresses && addresses.length > 0) {
        const first = addresses[0];
        data.address = first.address || null;
        data.city = first.city || null;
        data.district = first.district || null;
      }

      await tx.customer.update({ where: { id }, data });

      // Replace phones: soft-delete existing, create new
      if (phones !== undefined) {
        await tx.customerPhone.updateMany({
          where: { customerId: id, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        for (const { id: _id, ...p } of phones) {
          await tx.customerPhone.create({
            data: { ...p, customerId: id, tenantId },
          });
        }
      }

      // Replace addresses: soft-delete existing, create new
      if (addresses !== undefined) {
        await tx.customerAddress.updateMany({
          where: { customerId: id, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        for (const { id: _id, ...a } of addresses) {
          await tx.customerAddress.create({
            data: { ...a, customerId: id, tenantId },
          });
        }
      }

      // Return updated customer with relations
      const updated = await tx.customer.findFirst({
        where: { id },
        include: {
          phones: { where: { deletedAt: null }, select: { id: true, label: true, number: true } },
          addresses: {
            where: { deletedAt: null },
            select: { id: true, label: true, address: true, city: true, district: true },
          },
        },
      });
      return updated;
    });

    await this.auditUpdate({
      entity: 'customer',
      entityId: id,
      oldValues,
      newValues: { name: updated?.name, email: updated?.email, phone: updated?.phone, tags: updated?.tags },
    });

    return updated;
  }

  // ─── Delete (soft) ──────────────────────────

  async delete(id: string) {
    const original = await this.findById(id);
    await this.prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditDelete({
      entity: 'customer',
      entityId: id,
      deletedValues: { name: original.name, email: original.email },
    });
  }
}
