import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const customers = await prisma.customer.findMany({
    include: {
      addresses: true,
      phones: true,
      _count: { select: { devices: true, serviceTickets: true } },
    },
  });

  for (const c of customers) {
    console.log(`\n📋 Müşteri: ${c.name}`);
    console.log(`   Etiketler: ${c.tags || '(yok)'}`);
    console.log(`   Not: ${c.notes || '(yok)'}`);
    console.log(`   Silindi: ${c.deletedAt ? 'Evet' : 'Hayır'}`);
    console.log(`   Adresler (${c.addresses.length}):`);
    for (const a of c.addresses) {
      console.log(`     - [${a.label}] ${a.address}, ${a.city}/${a.district}`);
    }
    console.log(`   Telefonlar (${c.phones.length}):`);
    for (const p of c.phones) {
      console.log(`     - [${p.label}] ${p.number}`);
    }
    console.log(`   Cihaz: ${c._count.devices} adet`);
    console.log(`   Servis kaydı: ${c._count.serviceTickets} adet`);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
