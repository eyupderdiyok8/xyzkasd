import { BaseRepository } from './base.repository';

function generateTicketNo(): string {
  const date = new Date();
  const y = date.getFullYear().toString().slice(-2);
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  const seq = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SRV-${y}${m}${d}-${seq}`;
}

export class ServiceTicketRepository extends BaseRepository {
  // ─── List ───────────────────────────────────

  async findAll(opts?: {
    status?: string;
    technicianId?: string;
    customerId?: string;
    deviceId?: string;
    search?: string;
    showDeleted?: boolean;
  }) {
    const where: any = { ...this.tenantFilter() };
    if (!opts?.showDeleted) where.deletedAt = null;

    if (opts?.status) where.status = opts.status;
    if (opts?.technicianId) where.technicianId = opts.technicianId;
    if (opts?.customerId) where.customerId = opts.customerId;
    if (opts?.deviceId) where.deviceId = opts.deviceId;

    if (opts?.search) {
      where.OR = [
        { ticketNo: { contains: opts.search } },
        { issueDesc: { contains: opts.search } },
      ];
    }

    return this.prisma.serviceTicket.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        device: { select: { id: true, serialNo: true, brand: true, model: true } },
        technician: { select: { id: true, name: true } },
        _count: { select: { photos: true, filterChanges: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Get by ID ─────────────────────────────

  async findById(id: string, showDeleted?: boolean) {
    const where: any = { id, ...this.tenantFilter() };
    if (!showDeleted) where.deletedAt = null;

    const ticket = await this.prisma.serviceTicket.findFirst({
      where,
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true, address: true, city: true, district: true },
        },
        device: {
          select: { id: true, serialNo: true, brand: true, model: true, installDate: true, status: true },
        },
        technician: { select: { id: true, name: true, phone: true } },
        photos: { orderBy: { createdAt: 'desc' } },
        filterChanges: {
          include: { filter: { select: { id: true, name: true, stage: true, sku: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!ticket) throw new Error('NOT_FOUND');
    return ticket;
  }

  // ─── Create ─────────────────────────────────

  async create(input: {
    tenantId: string;
    customerId: string;
    deviceId: string;
    technicianId?: string;
    issueDesc: string;
    scheduledAt?: string;
  }) {
    let ticketNo = generateTicketNo();
    // Ensure uniqueness
    let attempts = 0;
    while (await this.prisma.serviceTicket.findUnique({ where: { ticketNo } })) {
      ticketNo = generateTicketNo();
      attempts++;
      if (attempts > 10) throw new Error('TicketNo generation failed');
    }

    // Resolve technicianId: UUID → Technician.id mapping for backward compat
    let resolvedTechnicianId = input.technicianId ?? null;

    if (resolvedTechnicianId) {
      // Try direct id match first (cuid)
      let tech = await this.prisma.technician.findFirst({
        where: { id: resolvedTechnicianId, tenantId: input.tenantId, deletedAt: null },
        select: { id: true },
      });

      // If not found and looks like a UUID, try by userId (Supabase auth user ID)
      if (!tech && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedTechnicianId)) {
        tech = await this.prisma.technician.findFirst({
          where: { userId: resolvedTechnicianId, tenantId: input.tenantId, deletedAt: null },
          select: { id: true },
        });
        if (tech) resolvedTechnicianId = tech.id;
      }

      if (!tech) {
        throw new Error(`Seçilen teknisyen bulunamadı (ID: ${input.technicianId}, Tenant: ${input.tenantId}).`);
      }
    }

    const ticket = await this.prisma.serviceTicket.create({
      data: {
        ticketNo,
        tenantId: input.tenantId,
        customerId: input.customerId,
        deviceId: input.deviceId,
        technicianId: resolvedTechnicianId,
        issueDesc: input.issueDesc,
        status: input.technicianId ? 'ASSIGNED' : 'PENDING',
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      },
    });

    await this.auditCreate({
      entity: 'service_ticket',
      entityId: ticket.id,
      newValues: { ticketNo: ticket.ticketNo, status: ticket.status, customerId: ticket.customerId, deviceId: ticket.deviceId, technicianId: ticket.technicianId },
    });

    return ticket;
  }

  // ─── Update (status only) ──────────────────

  async updateStatus(id: string, status: string, resolution?: string) {
    const original = await this.ensureAccess(id);
    const oldStatus = original.status;
    const data: any = { status };
    if (status === 'COMPLETED') data.completedAt = new Date();
    if (resolution) data.resolution = resolution;
    const updated = await this.prisma.serviceTicket.update({ where: { id }, data });

    await this.auditUpdate({
      entity: 'service_ticket',
      entityId: id,
      oldValues: { status: oldStatus },
      newValues: { status: updated.status, resolution: updated.resolution },
    });

    return updated;
  }

  // ─── Complete Service (main endpoint) ────────

  async completeService(
    id: string,
    data: {
      tdsBefore?: number | null;
      tdsAfter?: number | null;
      pressureBefore?: number | null;
      pressureAfter?: number | null;
      leakCheck?: boolean | null;
      leakNotes?: string | null;
      workDone?: string | null;
      customerNote?: string | null;
      signatureDataUrl?: string | null;
      signatureName?: string | null;
      resolution?: string | null;
      expenses?: string | null;
      serviceParts?: string | null;
      filterChanges?: Array<{ filterId: string; quantity?: number; notes?: string }>;
    },
  ) {
    const ticket = await this.ensureAccess(id);

    // Update the ticket fields
    const updated = await this.prisma.serviceTicket.update({
      where: { id },
      data: {
        tdsBefore: data.tdsBefore ?? null,
        tdsAfter: data.tdsAfter ?? null,
        pressureBefore: data.pressureBefore ?? null,
        pressureAfter: data.pressureAfter ?? null,
        leakCheck: data.leakCheck ?? null,
        leakNotes: data.leakNotes ?? null,
        workDone: data.workDone ?? null,
        customerNote: data.customerNote ?? null,
        signatureDataUrl: data.signatureDataUrl ?? null,
        signatureName: data.signatureName ?? null,
        resolution: data.resolution ?? null,
        expenses: data.expenses ?? null,
        serviceParts: data.serviceParts ?? null,
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    // ── Process filter changes ────────────────────
    // 1. Create FilterChange records (audit trail)
    // 2. Update DeviceFilter tracking (reset lifespan clock)
    // 3. Decrement inventory stock for changed filters
    if (data.filterChanges && data.filterChanges.length > 0) {
      const filterCatalogIds = data.filterChanges.map((fc) => fc.filterId);

      // Get filter catalog entries with inventory links
      const catalogs = await this.prisma.filterCatalog.findMany({
        where: { id: { in: filterCatalogIds }, ...this.tenantFilter() },
        select: { id: true, name: true, inventoryItemId: true },
      });
      const catalogMap = new Map(catalogs.map((c) => [c.id, c]));

      // Get existing device filter entries for this device
      const existingDeviceFilters = await this.prisma.deviceFilter.findMany({
        where: {
          deviceId: ticket.deviceId,
          filterCatalogId: { in: filterCatalogIds },
          ...this.tenantFilter(),
        },
        select: { id: true, filterCatalogId: true, expectedLifespanDays: true },
      });
      const existingByCatalog = new Map(existingDeviceFilters.map((df) => [df.filterCatalogId, df]));

      for (const fc of data.filterChanges) {
        const qty = fc.quantity ?? 1;

        // Always create the audit record
        await this.prisma.filterChange.create({
          data: {
            ticketId: id,
            filterId: fc.filterId,
            tenantId: ticket.tenantId,
            quantity: qty,
            notes: fc.notes ?? null,
          },
        });

        // Update or create DeviceFilter tracking entry to reset lifespan
        const existing = existingByCatalog.get(fc.filterId);
        const lifespan = existing?.expectedLifespanDays ?? 365;

        if (existing) {
          await this.prisma.deviceFilter.update({
            where: { id: existing.id },
            data: {
              installedAt: new Date(),
              expectedLifespanDays: lifespan,
              notes: fc.notes ?? null,
            },
          });
        } else {
          await this.prisma.deviceFilter.create({
            data: {
              deviceId: ticket.deviceId,
              filterCatalogId: fc.filterId,
              tenantId: ticket.tenantId,
              installedAt: new Date(),
              expectedLifespanDays: lifespan,
              notes: fc.notes ?? null,
            },
          });
        }

        // ── Inventory deduction ──────────────────
        const catalog = catalogMap.get(fc.filterId);
        if (catalog?.inventoryItemId) {
          // Decrement inventory quantity (don't go below 0)
          await this.prisma.inventoryItem.updateMany({
            where: { id: catalog.inventoryItemId, quantity: { gte: qty } },
            data: { quantity: { decrement: qty } },
          });

          // Record the transaction
          await this.prisma.inventoryTransaction.create({
            data: {
              itemId: catalog.inventoryItemId,
              tenantId: ticket.tenantId,
              type: 'OUT',
              quantity: qty,
              referenceType: 'SERVICE',
              referenceId: ticket.ticketNo,
              notes: `Servis #${ticket.ticketNo} — ${catalog.name}`,
            },
          });
        }
      }
    }

    // ── Process generic service parts (inventory deduction) ──
    if (data.serviceParts) {
      try {
        const parts: Array<{ name: string; quantity: number }> = JSON.parse(data.serviceParts);
        if (Array.isArray(parts) && parts.length > 0) {
          // Find matching inventory items by name (case-insensitive)
          const partNames = parts.map(p => p.name.trim()).filter(Boolean);
          if (partNames.length > 0) {
            // Fetch all tenant inventory items and fuzzy-match in JS
            const allItems = await this.prisma.inventoryItem.findMany({
              where: { ...this.tenantFilter(), quantity: { gt: 0 } },
              select: { id: true, name: true, quantity: true },
            });

            const matchingItems = allItems.filter(item => {
              const itemName = item.name.toLowerCase();
              return partNames.some(input => {
                const inp = input.toLowerCase();
                return inp === itemName || inp.includes(itemName) || itemName.includes(inp);
              });
            });

            for (const match of matchingItems) {
              const part = parts.find(p => {
                const input = p.name.trim().toLowerCase();
                const itemName = match.name.toLowerCase();
                // Exact match or fuzzy: one contains the other
                return input === itemName || input.includes(itemName) || itemName.includes(input);
              });
              if (!part || part.quantity < 1) continue;
              const qty = Math.min(part.quantity, match.quantity);

              // Decrement inventory
              await this.prisma.inventoryItem.update({
                where: { id: match.id },
                data: { quantity: { decrement: qty } },
              });

              // Record transaction
              await this.prisma.inventoryTransaction.create({
                data: {
                  itemId: match.id,
                  tenantId: ticket.tenantId,
                  type: 'OUT',
                  quantity: qty,
                  referenceType: 'SERVICE',
                  referenceId: ticket.ticketNo,
                  notes: `Servis #${ticket.ticketNo} — ${match.name}`,
                },
              });
            }
          }
        }
      } catch { /* invalid JSON — skip inventory deduction */ }
    }

    // ── Record DeviceMaintenance event ────────────
    await this.prisma.deviceMaintenance.create({
      data: {
        deviceId: ticket.deviceId,
        tenantId: ticket.tenantId,
        ticketId: id,
        maintenanceType: data.filterChanges?.length ? 'FILTER_CHANGE' : 'INSPECTION',
        description: data.workDone ?? data.resolution ?? 'Servis tamamlandı',
        completedDate: new Date(),
        notes: `Servis: ${ticket.ticketNo}`,
      },
    });

    // ── Record TDS reading on the device ──────────
    if (data.tdsAfter != null) {
      await this.prisma.tdsReading.create({
        data: {
          deviceId: ticket.deviceId,
          tenantId: ticket.tenantId,
          tdsValue: data.tdsAfter,
          inValue: data.tdsBefore ?? null,
          outValue: data.tdsAfter ?? null,
          notes: `Servis: ${ticket.ticketNo}`,
        },
      });
    }

    await this.auditUpdate({
      entity: 'service_ticket',
      entityId: id,
      oldValues: { status: ticket.status },
      newValues: { status: 'COMPLETED', workDone: data.workDone, resolution: data.resolution },
    });

    return updated;
  }

  // ─── Photos ─────────────────────────────────

  async addPhoto(input: {
    ticketId: string;
    tenantId: string;
    storagePath: string;
    fileName: string;
    mimeType: string;
    photoType?: string;
  }) {
    await this.ensureAccess(input.ticketId);
    return this.prisma.servicePhoto.create({ data: input });
  }

  async getPhotos(ticketId: string) {
    await this.ensureAccess(ticketId);
    return this.prisma.servicePhoto.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Filter Catalogs ────────────────────────

  async getFilterCatalogs(opts?: { showDeleted?: boolean }) {
    const where: any = { ...this.tenantFilter(), isActive: true };
    if (!opts?.showDeleted) where.deletedAt = null;
    return this.prisma.filterCatalog.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async getTenant(tenantId: string) {
    return this.prisma.tenant.findUnique({ where: { id: tenantId } });
  }

  async updatePdfStoragePath(ticketId: string, storagePath: string) {
    await this.ensureAccess(ticketId);
    return this.prisma.serviceTicket.update({
      where: { id: ticketId },
      data: { pdfStoragePath: storagePath },
    });
  }

  // ─── Delete (soft) ─────────────────────────

  async delete(id: string) {
    await this.ensureAccess(id);
    return this.prisma.serviceTicket.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  // ─── Helpers ────────────────────────────────

  private async ensureAccess(id: string) {
    const ticket = await this.prisma.serviceTicket.findFirst({
      where: { id, deletedAt: null, ...this.tenantFilter() },
    });
    if (!ticket) throw new Error('NOT_FOUND');
    return ticket;
  }
}
