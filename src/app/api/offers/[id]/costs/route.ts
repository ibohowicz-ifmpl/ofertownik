// src/app/api/offers/[id]/costs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CostPayload = { name: string; valueNet: number | null };

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
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

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const json = await req.json().catch(() => ({}));
  const items: CostPayload[] = (Array.isArray(json?.items) ? json.items : [])
    .map((raw: unknown): CostPayload => {
      const r = raw as { name?: unknown; valueNet?: unknown };
      const name = String(r?.name ?? "").trim();

      const v = r?.valueNet;
      let valueNet: number | null = null;

      if (typeof v === "number") {
        valueNet = Number.isFinite(v) ? Number(v.toFixed(2)) : null;
      } else if (typeof v === "string") {
        const n = Number(v.replace(",", "."));
        valueNet = Number.isFinite(n) ? Number(n.toFixed(2)) : null;
      }

      return { name, valueNet };
    })
    .filter((it: CostPayload) => it.name.length > 0 && Number.isFinite((it.valueNet as number)));

  // Idempotentny zapis listy kosztów
  await prisma.$transaction(async (tx) => {
    await tx.offerCost.deleteMany({ where: { offerId: id } });

    if (items.length > 0) {
      const now = new Date();
      const data = items.map((it) => ({
        offerId: id,
        name: it.name,
        valueNet: it.valueNet ?? 0,
        createdAt: now,
        updatedAt: now,
      }));
      await tx.offerCost.createMany({ data });
    }
  });

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
