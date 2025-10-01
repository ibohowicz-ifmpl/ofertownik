import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Next 15: dynamic params są asynchroniczne
type RouteParams = { params: Promise<{ id: string }> };

const ORDER = [
  "WYSLANIE",
  "AKCEPTACJA_ZLECENIE",
  "WYKONANIE",
  "PROTOKOL_WYSLANY",
  "ODBIOR_PRAC",
  "PWF",
] as const;

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code, headers: { "Cache-Control": "no-store" } });
}

function parseYMD(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) return bad("Missing id");

  const ms = await prisma.offerMilestone.findMany({
    where: { offerId: id },
    select: { step: true, occurredAt: true },
    orderBy: { occurredAt: "asc" },
  });

  return NextResponse.json(
    {
      items: ms.map((m) => ({
        step: String(m.step),
        occurredAt: m.occurredAt ? m.occurredAt.toISOString().slice(0, 10) : null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(req: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) return bad("Missing id");

  const body = await req.json().catch(() => ({}));

  // Zbierz stan docelowy z formatu płaskiego i items[]
  const map: Record<string, string | null> = {};
  for (const k of ORDER) {
    if (Object.prototype.hasOwnProperty.call(body, k)) map[k] = body[k];
  }
  if (Array.isArray(body?.items)) {
    for (const it of body.items as Array<any>) {
      const step = String(it?.step || "");
      const when = it?.occurredAt ?? it?.date ?? it?.at ?? null;
      if (ORDER.includes(step as any)) map[step] = when;
    }
  }

  // Walidacja ciągłości i monotoniczności (>=)
  type Err = { step: string; msg: string };
  const errors: Err[] = [];
  let prevDate: Date | null = null;

  for (let i = 0; i < ORDER.length; i++) {
    const step = ORDER[i];
    const raw = map[step] ?? null;
    const dt = parseYMD(raw);

    if (i > 0) {
      const prevStep = ORDER[i - 1];
      const prevRaw = map[prevStep] ?? null;
      const prev = parseYMD(prevRaw);
      if (dt && !prev) {
        errors.push({
          step,
          msg: `Nie można ustawić „${step}” bez wcześniejszego etapu „${prevStep}”.`,
        });
      }
    }

    if (dt && prevDate && dt < prevDate) {
      errors.push({
        step,
        msg: `Data etapu „${step}” nie może być wcześniejsza niż poprzedni etap.`,
      });
    }

    if (dt) prevDate = dt;
  }

  if (errors.length) {
    return NextResponse.json({ errors }, { status: 422, headers: { "Cache-Control": "no-store" } });
  }

  // Zbuduj finalną listę rekordów do utworzenia (tylko kroki z datą)
  const createItems = ORDER
    .map((step) => {
      const dt = parseYMD(map[step] ?? null);
      return dt ? { offerId: id, step: step as any, occurredAt: dt } : null;
    })
    .filter(Boolean) as Array<{ offerId: string; step: any; occurredAt: Date }>;

  // **Uproszczenie – ZAWSZE REPLACE**:
  // 1) usuń wszystkie milestone’y tej oferty
  // 2) utwórz od zera tylko te, które przyszły
  await prisma.$transaction([
    prisma.offerMilestone.deleteMany({ where: { offerId: id } }),
    ...(createItems.length ? [prisma.offerMilestone.createMany({ data: createItems })] : []),
  ]);

  // Zwróć świeży stan
  const ms = await prisma.offerMilestone.findMany({
    where: { offerId: id },
    select: { step: true, occurredAt: true },
    orderBy: { occurredAt: "asc" },
  });

  return NextResponse.json(
    {
      mode: "replace", // debug: zawsze replace
      items: ms.map((m) => ({
        step: String(m.step),
        occurredAt: m.occurredAt ? m.occurredAt.toISOString().slice(0, 10) : null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
