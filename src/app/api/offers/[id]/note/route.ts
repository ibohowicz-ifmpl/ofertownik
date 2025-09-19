import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/offers/[id]/note  -> { note: string|null }
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const offer = await prisma.offer.findUnique({
      where: { id },
      select: { note: true },
    });
    return NextResponse.json({ note: offer?.note ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

// PUT /api/offers/[id]/note  Body: { note: string|null }
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await prisma.offer.update({
      where: { id },
      data: { note: body?.note ?? null },
      select: { note: true },
    });
    return NextResponse.json({ note: updated.note ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
