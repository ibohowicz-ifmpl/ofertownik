import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/offers/[id] — proste pobranie oferty
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(offer);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

// PUT /api/offers/[id] — aktualizacja „surowa” (używaj raczej /fields)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await prisma.offer.update({ where: { id }, data: body });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

// DELETE /api/offers/[id] — twarde usunięcie (relacje powinny mieć CASCADE w DB)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await prisma.offer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
