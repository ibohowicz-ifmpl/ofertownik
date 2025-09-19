import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/offers/[id]/fields
// Body: { offerNo?, title?, authorInitials?, vendorOrderNo?, contractor?, valueNet?: number|null }
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const b = await req.json();
    const valueNet =
      b?.valueNet == null || b?.valueNet === ""
        ? null
        : Number(String(b.valueNet).replace(",", "."));

    const data: any = {
      offerNo: b?.offerNo ?? null,
      title: b?.title ?? null,
      authorInitials: b?.authorInitials ?? null,
      vendorOrderNo: b?.vendorOrderNo ?? null,
      contractor: b?.contractor ?? null,
      valueNet: Number.isFinite(valueNet) ? valueNet : null,
    };

    const updated = await prisma.offer.update({
      where: { id },
      data,
      select: {
        id: true,
        offerNo: true,
        title: true,
        authorInitials: true,
        vendorOrderNo: true,
        contractor: true,
        valueNet: true,
      },
    });

    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
