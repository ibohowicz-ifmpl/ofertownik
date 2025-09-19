import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/offers/[id]/milestones -> { items: [{ id, step, occurredAt }] }
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const items = await prisma.offerMilestone.findMany({
      where: { offerId: id },
      select: { id: true, step: true, occurredAt: true },
      orderBy: { occurredAt: "asc" },
    });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

// PUT /api/offers/[id]/milestones
// Body: { [stepName: string]: "YYYY-MM-DD"|null } — przy null kasujemy wpis
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();

    // Lista kroków zgodna z UI, ale akceptujemy dowolne stringi (DB-pull safe)
    const STEPS = [
      "WYSLANIE",
      "AKCEPTACJA_ZLECENIE",
      "WYKONANIE",
      "PROTOKOL_WYSLANY",
      "ODBIOR_PRAC",
      "PWF",
    ];

    await prisma.$transaction(async (tx) => {
      for (const key of STEPS) {
        const raw = body?.[key] as string | null | undefined;

        // kasujemy, jeśli null/""/undefined
        if (!raw) {
          await tx.offerMilestone.deleteMany({ where: { offerId: id, step: key } });
          continue;
        }

        // parsuj YYYY-MM-DD → Date (UTC północ)
        const iso = /^\d{4}-\d{2}-\d{2}$/.test(String(raw)) ? String(raw) : null;
        if (!iso) {
          // nieprawidłowy format – pomijamy ten krok (albo można rzucić 400)
          await tx.offerMilestone.deleteMany({ where: { offerId: id, step: key } });
          continue;
        }
        const when = new Date(`${iso}T00:00:00.000Z`);

        // Spróbuj update, a jeśli nic nie zaktualizowano – create (bez wymagania unikalnego indeksu)
        const res = await tx.offerMilestone.updateMany({
          where: { offerId: id, step: key },
          data: { occurredAt: when },
        });
        if (res.count === 0) {
          await tx.offerMilestone.create({
            data: { offerId: id, step: key, occurredAt: when },
          });
        }
      }
    });

    const items = await prisma.offerMilestone.findMany({
      where: { offerId: id },
      select: { id: true, step: true, occurredAt: true },
      orderBy: { occurredAt: "asc" },
    });
    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
