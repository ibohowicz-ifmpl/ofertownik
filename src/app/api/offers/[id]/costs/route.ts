import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/offers/[id]/costs
 * Zwraca koszty w stabilnej kolejności (id ASC).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const items = await prisma.offerCost.findMany({
    where: { offerId: id },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ items });
}

/**
 * PUT /api/offers/[id]/costs
 * Oczekuje: { items: { id?, name: string, valueNet: string|"X.XX"|number|null }[] }
 * Strategia: pełna wymiana listy kosztów dla oferty.
 * Po zapisie zwracamy posortowane items (id ASC), aby frontend miał stabilny baseline.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const raw = Array.isArray(body?.items) ? body.items : [];

  // Normalizacja wejścia
  const cleaned = raw
    .map((it: any) => {
      const name = String(it?.name ?? "").trim();
      if (!name) return null;

      const v = it?.valueNet;
      let valueNet: number | null = null;
      if (typeof v === "number") valueNet = Number.isFinite(v) ? v : null;
      else if (typeof v === "string") {
        const n = Number(v.replace(",", "."));
        valueNet = Number.isFinite(n) ? n : null;
      }

      return { name, valueNet };
    })
    .filter(Boolean) as { name: string; valueNet: number | null }[];

  // Pełna wymiana listy kosztów w transakcji
  await prisma.$transaction(async (tx) => {
    await tx.offerCost.deleteMany({ where: { offerId: id } });

    if (cleaned.length > 0) {
      const now = new Date();
      // Uwaga: createMany nie uzupełnia @updatedAt / @default(now())
      await tx.offerCost.createMany({
        data: cleaned.map((c) => ({
          offerId: id,
          name: c.name,
          valueNet: c.valueNet,
          createdAt: now,   // <-- wymagane gdy kolumny są NOT NULL
          updatedAt: now,   // <-- jw.
        })),
      });
    }
  });

  // Zwróć posortowane items
  const items = await prisma.offerCost.findMany({
    where: { offerId: id },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ items });
}
