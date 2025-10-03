// prisma/seed.js — wersja „minimal safe” pod Twój aktualny schema.prisma
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // 1) Klient — uwaga: name ma limit, używam krótkiej nazwy
    const client = await prisma.client.create({
        data: {
            name: 'Acme',                 // krótko, bo u Ciebie name miało ograniczenie
            nip: '5250000000',
            contactName: 'Anna Kontakt',
            contactEmail: 'anna.kontakt@acme.pl',
            contactPhone: '+48 123 456 789',
        },
    });

    // 2) Oferta — TYLKO pola, które pokazał Prisma jako dostępne
    //    (clientId jest wymagany; używamy też 'note' zamiast 'notes')
    const offer = await prisma.offer.create({
        data: {
            clientId: client.id,
            note: 'Oferta demo (seed)',   // 'note' istnieje; nie używamy 'status', 'currency', 'title'
        },
    });

    // 3) Przykładowy koszt — wg pól z listy (name, valueNet, updatedAt, offerId)
    await prisma.offerCost.create({
        data: {
            offerId: offer.id,
            name: 'Materiały',
            valueNet: 1234.56,
            updatedAt: new Date(),
        },
    });

    // 4) Milestone — jeśli model ma 'step' i 'occurredAt' (co wskazywały logi)
    await prisma.offerMilestone.create({
        data: {
            offerId: offer.id,
            step: 'ZAPYTANIE',
            occurredAt: new Date(),
        },
    });

    console.log('Seed OK:', { client: client.name, offerId: offer.id });
}

main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
