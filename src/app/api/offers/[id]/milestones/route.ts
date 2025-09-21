// src/app/api/offers/[id]/milestones/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Step =
  | "WYSLANIE"
  | "AKCEPTACJA_ZLECENIE"
  | "WYKONANIE"
  | "PROTOKOL_WYSLANY"
  | "ODBIOR_PRAC"
  | "PWF";

const STEP_ORDER: Step[] = [
  "WYSLANIE",
  "AKCEPTACJA_ZLECENIE",
  "WYKONANIE",
  "PROTOKOL_WYSLANY",
  "ODBIOR_PRAC",
  "PWF",
];

function normDate(v: any): string | null {
  if (!v) return null;
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // YYYY-MM-DD
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

// GET: zwracamy spójnie items[]
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params; // Next 15: await!
  const rows = await prisma.offerMilestone.findMany({
    where: { offerId: id },
    select: { step: true, occurredAt: true },
    orderBy: [{ occurredAt: "asc" }],
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      step: r.step,
      occurredAt: r.occurredAt.toISOString().slice(0, 10),
    })),
  });
}

// PUT: przyjmujemy płasko (WYSLANIE: "YYYY-MM-DD" | null, ...) i/lub items[], opcjonalnie replace
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params; // Next 15: await!
  const body = await req.json().catch(() => ({} as any));

  const incoming = new Map<Step, string | null>();

  // a) items[]
  if (Array.isArray(body?.items)) {
    for (const it of body.items) {
      const step = (it?.step || it?.name || it?.code) as Step;
      if (!STEP_ORDER.includes(step)) continue;
      const when = normDate(
        it?.occurredAt ?? it?.occurred_at ?? it?.date ?? it?.occurred ?? it?.at
      );
      incoming.set(step, when);
    }
  }
  // b) płasko (nadpisuje items[] jeśli oba są)
  for (const k of STEP_ORDER) {
    if (k in body) incoming.set(k, normDate(body[k]));
  }

  if (incoming.size === 0) {
    return new NextResponse("Brak danych do zapisu", { status: 400 });
  }

  const replace = Boolean(body?.replace);

  // przygotuj create dla dat niepustych
  const toCreate = Array.from(incoming.entries())
    .filter(([_, d]) => d)
    .map(([step, d]) => ({
      offerId: id,
      step, // enum MilestoneStep
      occurredAt: new Date(String(d) + "T00:00:00.000Z"),
    }));

  await prisma.$transaction(async (tx) => {
    if (replace) {
      // pełne zastąpienie — czyści wszystko dla oferty
      await tx.offerMilestone.deleteMany({ where: { offerId: id } });
      if (toCreate.length) await tx.offerMilestone.createMany({ data: toCreate });
    } else {
      // częściowa aktualizacja — null ⇒ DELETE; data ⇒ UPSERT
      for (const [step, val] of incoming.entries()) {
        if (!val) {
          await tx.offerMilestone.deleteMany({ where: { offerId: id, step } });
        } else {
          const d = new Date(String(val) + "T00:00:00.000Z");
          await tx.offerMilestone.upsert({
            // nazwa 1:1 z @@unique(name: "OfferMilestone_offerId_step")
            where: { OfferMilestone_offerId_step: { offerId: id, step } },
            create: { offerId: id, step, occurredAt: d },
            update: { occurredAt: d },
          });
        }
      }
    }
  });

  // zwróć świeże dane
  const rows = await prisma.offerMilestone.findMany({
    where: { offerId: id },
    select: { step: true, occurredAt: true },
    orderBy: [{ occurredAt: "asc" }],
  });

  return NextResponse.json({
    items: rows.map((r) => ({
      step: r.step,
      occurredAt: r.occurredAt.toISOString().slice(0, 10),
    })),
  });
}
