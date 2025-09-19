// src/app/api/dev-seed/route.ts
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";

export async function POST() {
  // 1) klient
  const client = await prisma.client.create({
    data: { name: "ACME Sp. z o.o." },
  });

  // 2) oferta
  const offer = await prisma.offer.create({
    data: {
      clientId: client.id,
      offerNo: "OF-2025-001",
      valueNet: 123456.78,
      marza: 15.2,
      notes: "Oferta testowa",
    },
  });

  // 3) pierwszy etap (bieg)
  await prisma.offerMilestone.create({
    data: {
      offerId: offer.id,
      step: "ZAPYTANIE",
      occurredAt: new Date(),
    },
  });

  return Response.json({ ok: true, client: client.name, offer: offer.offerNo });
}
