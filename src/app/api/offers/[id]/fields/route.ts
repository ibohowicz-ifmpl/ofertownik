import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/offers/[id]/fields
// Body: { offerNo?, title?, authorInitials?, vendorOrderNo?, contractor?, valueNet?: number|null }
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({} as any));

  const safeStr = (v: any) => (typeof v === 'string' ? v.trim() : '');
  const title = safeStr(body?.title);
  const offerNo = safeStr(body?.offerNo);
  const valueNet = body?.valueNet == null ? undefined : Number(body.valueNet);

  // meta fields
  const vendorOrderNo = safeStr(body?.vendorOrderNo);
  const contractor = safeStr(body?.contractor);

  // wczytaj obecne meta
  const cur = await prisma.offer.findUnique({ where: { id }, select: { meta: true } });
  const meta = (cur?.meta && typeof cur.meta === 'object' && !Array.isArray(cur.meta)) ? { ...(cur!.meta as any) } : {};
  if (vendorOrderNo !== '') meta.vendorOrderNo = vendorOrderNo; else delete meta.vendorOrderNo;
  if (contractor !== '') meta.contractor = contractor; else delete meta.contractor;

  const data: any = { meta };
  if (title !== '') data.title = title;
  if (typeof valueNet === 'number' && Number.isFinite(valueNet)) data.valueNet = valueNet;
  if (offerNo !== '') data.offerNo = offerNo;

  const out = await prisma.offer.update({
    where: { id },
    data,
    select: {
      id: true, offerNo: true, title: true, valueNet: true, currency: true,
      meta: true, author: { select: { initials: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    id: out.id,
    offerNo: out.offerNo ?? null,
    title: out.title,
    valueNet: Number(out.valueNet ?? 0),
    authorInitials: out.author?.initials ?? '',
    vendorOrderNo: (out.meta as any)?.vendorOrderNo ?? '',
    contractor: (out.meta as any)?.contractor ?? '',
  });
}
