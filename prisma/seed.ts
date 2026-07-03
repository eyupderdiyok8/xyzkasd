// ──────────────────────────────────────────────
// Seed Script — Test verileri
// ──────────────────────────────────────────────

import "dotenv/config";
import { PrismaClient } from "@/lib/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding database...');

  // Cleanup
  await prisma.filterChange.deleteMany();
  await prisma.servicePhoto.deleteMany();
  await prisma.serviceTicket.deleteMany();
  await prisma.customerPhone.deleteMany();
  await prisma.customerAddress.deleteMany();
  await prisma.tdsReading.deleteMany();
  await prisma.devicePhoto.deleteMany();
  await prisma.device.deleteMany();
  await prisma.technician.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // Create Tenants — one per plan type for testing
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Su Arıtma A.Ş.',
      slug: 'suaritma',
      membershipType: 'YEARLY',
    },
  });
  console.log(`  ✓ Tenant: ${tenant.name} (${tenant.membershipType})`);

  const starterTenant = await prisma.tenant.create({
    data: {
      name: 'Minik Filtre Ltd.',
      slug: 'minikfiltre',
      membershipType: 'MONTHLY',
    },
  });
  console.log(`  ✓ Tenant: ${starterTenant.name} (${starterTenant.membershipType})`);

  // Create Customers
  const customer1 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Ahmet Yılmaz',
      phone: '05321234567',
      email: 'ahmet@example.com',
      notes: 'VIP müşteri, düzenli bakım',
      tags: 'VIP,kurumsal',
      addresses: {
        create: [
          {
            tenantId: tenant.id,
            label: 'Ev',
            address: 'Atatürk Cad. No:42',
            city: 'İstanbul',
            district: 'Kadıköy',
          },
          {
            tenantId: tenant.id,
            label: 'İş',
            address: 'Sanayi Mah. 123. Sok. No:5',
            city: 'İstanbul',
            district: 'Ümraniye',
          },
        ],
      },
      phones: {
        create: [
          { tenantId: tenant.id, label: 'Cep', number: '05321234567' },
          { tenantId: tenant.id, label: 'İş', number: '02161234567' },
        ],
      },
    },
  });
  console.log(`  ✓ Müşteri: ${customer1.name}`);

  const customer2 = await prisma.customer.create({
    data: {
      tenantId: tenant.id,
      name: 'Mehmet Demir',
      phone: '05449876543',
      notes: 'Yeni müşteri',
      tags: 'bireysel',
    },
  });
  console.log(`  ✓ Müşteri: ${customer2.name}`);

  // Create Devices
  const device1 = await prisma.device.create({
    data: {
      tenantId: tenant.id,
      serialNo: 'SN-2024-001',
      brand: 'Arçelik',
      model: 'RO-2000',
      customerId: customer1.id,
      status: 'ACTIVE',
    },
  });
  console.log(`  ✓ Cihaz: ${device1.serialNo}`);

  const device2 = await prisma.device.create({
    data: {
      tenantId: tenant.id,
      serialNo: 'SN-2024-002',
      brand: 'LG',
      model: 'PuriCare',
      customerId: customer2.id,
      status: 'ACTIVE',
    },
  });
  console.log(`  ✓ Cihaz: ${device2.serialNo}`);

  // Create Technician
  const tech = await prisma.technician.create({
    data: {
      tenantId: tenant.id,
      name: 'Ali Usta',
      phone: '05331112233',
    },
  });
  console.log(`  ✓ Teknisyen: ${tech.name}`);

  // ── Default Automation Rules for Survey Workflow ──

  // Rule 1: Servis tamamlanınca otomatik anket gönder
  await prisma.automationRule.create({
    data: {
      tenantId: tenant.id,
      name: 'Servis Sonrası Anket Gönder',
      description: 'Servis tamamlandığında müşteriye WhatsApp ile memnuniyet anketi linki gönderilir',
      trigger: 'service.completed',
      conditions: '[]',
      actions: JSON.stringify([
        {
          type: 'sendSurvey',
          params: {
            to: 'data.customerPhone',
            toIsContextPath: true,
          },
        },
      ]),
      isActive: true,
      priority: 100,
    },
  });
  console.log('  ✓ Kural: Servis Sonrası Anket Gönder');

  // Rule 2: Yüksek puan (>=4) → indirim kuponu oluştur + Google Review yönlendir
  await prisma.automationRule.create({
    data: {
      tenantId: tenant.id,
      name: 'Yüksek Puan — Kupon ve Google Review',
      description: 'Müşteri 4 veya 5 puan verdiğinde indirim kuponu oluşturulur ve Google Review linki gönderilir',
      trigger: 'survey.response',
      conditions: JSON.stringify([
        { field: 'data.score', operator: 'gte', value: 4 },
      ]),
      actions: JSON.stringify([
        {
          type: 'sendMessage',
          params: {
            channel: 'WHATSAPP',
            templateId: 'high-score-thanks',
            to: 'data.customerPhone',
            toIsContextPath: true,
          },
        },
      ]),
      isActive: true,
      priority: 90,
    },
  });
  console.log('  ✓ Kural: Yüksek Puan — Kupon ve Google Review');

  // Rule 3: Düşük puan (<=2) → yönetici/teknisyen bildirimi
  await prisma.automationRule.create({
    data: {
      tenantId: tenant.id,
      name: 'Düşük Puan — Yönetici Bildirimi',
      description: 'Müşteri 2 veya daha düşük puan verdiğinde yöneticiye acil bildirim gönderilir',
      trigger: 'survey.response',
      conditions: JSON.stringify([
        { field: 'data.score', operator: 'lte', value: 2 },
      ]),
      actions: JSON.stringify([
        {
          type: 'notifyTechnician',
          params: {
            message: '⚠️ DÜŞÜK PUAN UYARISI — Müşteri: {{data.customerName}}, Puan: {{data.score}}/5. Servis no: {{data.ticketNo}}. Acilen incelenmelidir.',
            technicianIdPath: 'data.technicianId',
          },
        },
      ]),
      isActive: true,
      priority: 80,
    },
  });
  console.log('  ✓ Kural: Düşük Puan — Yönetici Bildirimi');

  // Create Service Tickets
  const ticket1 = await prisma.serviceTicket.create({
    data: {
      tenantId: tenant.id,
      ticketNo: 'SRV-2024-001',
      customerId: customer1.id,
      deviceId: device1.id,
      technicianId: tech.id,
      status: 'COMPLETED',
      issueDesc: 'Filtre değişimi',
      workDone: 'Sediment ve karbon filtre değiştirildi',
      tdsBefore: 45,
      tdsAfter: 12,
      completedAt: new Date('2024-01-15'),
    },
  });
  console.log(`  ✓ Servis: ${ticket1.ticketNo}`);

  const ticket2 = await prisma.serviceTicket.create({
    data: {
      tenantId: tenant.id,
      ticketNo: 'SRV-2024-002',
      customerId: customer1.id,
      deviceId: device1.id,
      technicianId: tech.id,
      status: 'PENDING',
      issueDesc: 'Basınç düşüklüğü şikayeti',
    },
  });
  console.log(`  ✓ Servis: ${ticket2.ticketNo}`);

  console.log('\n✅ Seed complete!');
  console.log('\n📊 Test verileri:');
  console.log(`   Tenant: ${tenant.slug}`);
  console.log(`   Müşteriler: ${customer1.name}, ${customer2.name}`);
  console.log(`   Cihazlar: ${device1.serialNo}, ${device2.serialNo}`);
  console.log(`   Servis kayıtları: ${ticket1.ticketNo}, ${ticket2.ticketNo}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
