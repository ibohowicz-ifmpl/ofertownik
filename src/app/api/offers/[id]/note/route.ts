import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getParamId, metaGet, metaPatch } from '@/lib/api-helpers';

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const id = await getParamId(ctx);
  const offer = await prisma.offer.findUnique({ where: { id }, select: { meta: true } });
  const note = metaGet<string>(offer?.meta ?? null, 'note', '');
  return NextResponse.json({ note });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const id = await getParamId(ctx);
  const body = await req.json();
  const note: string = String(body?.note ?? '');
  const cur = await prisma.offer.findUnique({ where: { id }, select: { meta: true } });
  const nextMeta = metaPatch(cur?.meta ?? null, { note });
  await prisma.offer.update({ where: { id }, data: { meta: nextMeta } });
  return NextResponse.json({ ok: true });
}
