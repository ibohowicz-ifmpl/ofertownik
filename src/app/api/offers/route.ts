// src/app/api/offers/route.ts
export const runtime = "nodejs";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const rows = await prisma.offer.findMany({
    select: {
      id: true,
      offerNo: true,
      client: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(rows);
}
