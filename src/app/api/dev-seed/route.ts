// src/app/api/dev-seed/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Minimalny seed przez API:
 * - MPK(code3='001')
 * - User(email='seed@ifm.pl') + przypięcie do MPK (LEADER)
 * - Client(nip='0000000000')
 * - Offer (DRAFT, bez offerNo)
 * - Milestone CREATED
 */
export async function POST() {
  try {
    // 1) MPK
    const mpk = await prisma.mPK.upsert({
      where: { code3: '001' },
      update: { name: 'DEV MPK', active: true },
      create: { code3: '001', name: 'DEV MPK', active: true },
    });

    // 2) User
    const user = await prisma.user.upsert({
      where: { email: 'seed@ifm.pl' },
      update: { firstName: 'Seed', lastName: 'User', initials: 'SU', isActive: true },
      create: { email: 'seed@ifm.pl', firstName: 'Seed', lastName: 'User', initials: 'SU', isActive: true },
    });

    // 3) User ↔ MPK (LEADER)
    await prisma.userMPK.upsert({
      where: { userId_mpkId: { userId: user.id, mpkId: mpk.id } },
      update: { role: 'LEADER' as any },
      create: { userId: user.id, mpkId: mpk.id, role: 'LEADER' as any },
    });

    // 4) Client (wymagany NIP)
    const client = await prisma.client.upsert({
      where: { nip: '0000000000' },
      update: { name: 'ACME Sp. z o.o.', isActive: true },
      create: { nip: '0000000000', name: 'ACME Sp. z o.o.', isActive: true },
    });

    // 5) Offer (DRAFT, bez offerNo)
    const offer = await prisma.offer.create({
      data: {
        mpkId: mpk.id,
        clientId: client.id,
        authorUserId: user.id,
        title: 'DEV Oferta (draft)',
        status: 'DRAFT' as any,
        valueNet: 1500,
        currency: 'PLN',
      },
      select: { id: true },
    });

    // 6) Milestone CREATED
    await prisma.offerMilestone.create({
      data: { offerId: offer.id, step: 'CREATED' as any, occurredAt: new Date() },
    });

    return NextResponse.json({ ok: true, offerId: offer.id });
  } catch (e: any) {
    console.error('dev-seed error:', e);
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
