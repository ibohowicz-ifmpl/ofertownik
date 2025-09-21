import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/offers/:id/costs -> { items: [{id,name,valueNet}] }
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params; // Next 15: await!
  const rows = await prisma.offerCost.findMany({
    where: { offerId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      valueNet: Number(r.valueNet),
    })),
  });
}

// PUT /api/offers/:id/costs
// body: { items: [{ name: string, valueNet: number|string }] }
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params; // Next 15: await!
  const body = await req.json().catch(() => ({} as any));
  const items = Array.isArray(body?.items) ? body.items : [];

  // Normalizacja i walidacja
  const clean = items
    .map((it: any) => {
      const name = String(it?.name ?? "").trim();
      const valueRaw = String(it?.valueNet ?? "0").replace(",", ".");
      const valueNet = Number(valueRaw);
      return { name, valueNet };
    })
    .filter((it) => it.name.length > 0 && Number.isFinite(it.valueNet));

  // Zapis idempotentny: czyścimy stare, wstawiamy nowe (z timestampami)
  await prisma.$transaction(async (tx) => {
    await tx.offerCost.deleteMany({ where: { offerId: id } });

    const now = new Date();
    for (const it of clean) {
      await tx.offerCost.create({
        data: {
          offerId: id,
          name: it.name,
          valueNet: it.valueNet,
          createdAt: now,
          updatedAt: now,
        },
      });
    }
  });

  // Zwrot świeżych danych
  const rows = await prisma.offerCost.findMany({
    where: { offerId: id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      id: r.id,
      name: r.name,
      valueNet: Number(r.valueNet),
    })),
  });
}
