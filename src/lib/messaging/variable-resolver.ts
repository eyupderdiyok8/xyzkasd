// ──────────────────────────────────────────────
// Water Purifier Service ERP — Variable Resolver
// Multi-Tenant SaaS
// ──────────────────────────────────────────────
// Mesaj şablonlarındaki {{variable}} değişkenlerini
// veritabanından okuyarak otomatik doldurur.
//
// Kullanım:
//   resolveVariables({ customerId, deviceId, ticketId })
//   → { customer_name: "Ahmet", device_model: "AquaPure", ... }
// ──────────────────────────────────────────────

import { prisma } from '@/lib/prisma';
import type { VariableValues } from './template-engine';

export interface ResolveContext {
  customerId?: string;
  deviceId?: string;
  ticketId?: string;
  technicianId?: string;
  tenantId: string;
  /** Varsa indirim kuponu kodu (manuel girilebilir) */
  discountCode?: string;
  /** Varsa anket linki */
  surveyLink?: string;
  /** Varsa Google Review linki */
  googleReviewLink?: string;
}

/**
 * Verilen context ID'lerine göre tüm değişken değerlerini
 * veritabanından okuyarak doldurur.
 *
 * Sadece context'te bulunan entity'lerin değişkenlerini
 * doldurur, diğerlerini boş string olarak bırakır.
 */
export async function resolveVariables(context: ResolveContext): Promise<VariableValues> {
  const values: VariableValues = {};

  // ── Tenant (company_name) ─────────────────
  const tenant = await prisma.tenant.findUnique({
    where: { id: context.tenantId },
    select: { name: true },
  });
  if (tenant) {
    values.company_name = tenant.name;
  }

  // ── Customer ─────────────────────────────
  if (context.customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: context.customerId },
      select: { name: true, phone: true },
    });
    if (customer) {
      values.customer_name = customer.name;
      if (customer.phone) values.phone = customer.phone;
    }
  }

  // ── Device ───────────────────────────────
  if (context.deviceId) {
    const device = await prisma.device.findUnique({
      where: { id: context.deviceId },
      select: { brand: true, model: true },
    });
    if (device) {
      values.device_brand = device.brand;
      values.device_model = `${device.brand} ${device.model}`;
    }
  }

  // ── Ticket (next_service_date + technician) ─
  if (context.ticketId) {
    const ticket = await prisma.serviceTicket.findUnique({
      where: { id: context.ticketId },
      select: {
        scheduledAt: true,
        technicianId: true,
        technician: { select: { name: true } },
        customerId: true,
        deviceId: true,
      },
    });
    if (ticket) {
      if (ticket.scheduledAt) {
        values.next_service_date = formatDateTR(ticket.scheduledAt);
      }
      if (ticket.technician) {
        values.technician = ticket.technician.name;
      }

      // Ticket üzerinden customer/device ID alınmamışsa doldur
      if (!context.customerId && ticket.customerId) {
        const cust = await prisma.customer.findUnique({
          where: { id: ticket.customerId },
          select: { name: true, phone: true },
        });
        if (cust) {
          if (!values.customer_name) values.customer_name = cust.name;
          if (!values.phone && cust.phone) values.phone = cust.phone;
        }
      }
      if (!context.deviceId && ticket.deviceId) {
        const dev = await prisma.device.findUnique({
          where: { id: ticket.deviceId },
          select: { brand: true, model: true },
        });
        if (dev) {
          if (!values.device_brand) values.device_brand = dev.brand;
          if (!values.device_model) values.device_model = `${dev.brand} ${dev.model}`;
        }
      }
    }
  }

  // ── Technician ───────────────────────────
  if (context.technicianId && !values.technician) {
    const tech = await prisma.technician.findUnique({
      where: { id: context.technicianId },
      select: { name: true },
    });
    if (tech) {
      values.technician = tech.name;
    }
  }

  // ── Discount / Coupon code ───────────────
  if (context.discountCode) {
    values.discount_code = context.discountCode;
    values.coupon_code = context.discountCode;
  }

  // ── Links ────────────────────────────────
  if (context.surveyLink) {
    values.survey_link = context.surveyLink;
  }
  if (context.googleReviewLink) {
    values.google_review_link = context.googleReviewLink;
  }

  return values;
}

/**
 * Tarihi Türkçe formatında döndürür: "15 Mart 2025"
 */
function formatDateTR(date: Date): string {
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];
  return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
}
