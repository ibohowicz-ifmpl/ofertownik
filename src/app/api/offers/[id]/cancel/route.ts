import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// w Next 15 dynamic params są asynchroniczne
type RouteParams = { params: Promise<{ id: string }> };

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

export async function GET(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) return bad("Missing id");

  const offer = await prisma.offer.findUnique({
    where: { id },
    select: { cancelledAt: true, cancelReason: true },
  });
  if (!offer) return bad("Offer not found", 404);

  return NextResponse.json({
    isCancelled: Boolean(offer.cancelledAt),
    cancelledAt: offer.cancelledAt ? offer.cancelledAt.toISOString() : null,
    reason: offer.cancelReason ?? null,
  });
}

/**
 * Anulowanie dozwolone TYLKO gdy:
 *  - brak jakichkolwiek dat etapów, LUB
 *  - ustawione wyłącznie 'WYSLANIE'.
 * (UI i tak ukrywa przycisk, ale to zabezpieczenie serwerowe.)
 */
export async function POST(req: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) return bad("Missing id");

  const { reason } = (await req.json().catch(() => ({}))) as { reason?: string | null };

  const offer = await prisma.offer.findUnique({ where: { id }, select: { id: true } });
  if (!offer) return bad("Offer not found", 404);

  const milestones = await prisma.offerMilestone.findMany({
    where: { offerId: id },
    select: { step: true },
  });
  const steps = new Set(milestones.map((m) => String(m.step)));
  const hasAny = steps.size > 0;
  const onlyWyslanie = steps.size === 1 && steps.has("WYSLANIE");

  if (hasAny && !onlyWyslanie) {
    return NextResponse.json(
      {
        error:
          "Anulowanie niedozwolone. Ofertę można anulować tylko gdy brak dat lub ustawiono wyłącznie 'Wysłanie'.",
        code: "CANCEL_NOT_ALLOWED",
      },
      { status: 422 }
    );
  }

  const updated = await prisma.offer.update({
    where: { id },
    data: {
      cancelledAt: new Date(),
      cancelReason: (reason ?? "").trim() || null,
    },
    select: { cancelledAt: true, cancelReason: true },
  });

  return NextResponse.json({
    isCancelled: true,
    cancelledAt: updated.cancelledAt?.toISOString() ?? null,
    reason: updated.cancelReason ?? null,
  });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) return bad("Missing id");

  const offer = await prisma.offer.findUnique({ where: { id }, select: { id: true } });
  if (!offer) return bad("Offer not found", 404);

  const updated = await prisma.offer.update({
    where: { id },
    data: { cancelledAt: null, cancelReason: null },
    select: { cancelledAt: true, cancelReason: true },
  });

  return NextResponse.json({
    isCancelled: false,
    cancelledAt: updated.cancelledAt ? updated.cancelledAt.toISOString() : null,
    reason: updated.cancelReason ?? null,
  });
}
