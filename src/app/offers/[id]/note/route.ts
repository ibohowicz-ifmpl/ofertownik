// src/app/offers/[id]/note/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getParamId, metaGet, metaPatch } from '@/lib/api-helpers';

// GET: pobiera notatkę z Offer.meta.note
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await getParamId(ctx);

  const row = await prisma.offer.findUnique({
    where: { id },
    select: { meta: true },
  });

  const note = metaGet<string>(row?.meta ?? null, 'note', '');
  return NextResponse.json({ note });
}

// POST: zapisuje notatkę do Offer.meta.note
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = await getParamId(ctx);
  const body = await req.json().catch(() => ({}));
  const note: string = String(body?.note ?? '');

  const cur = await prisma.offer.findUnique({
    where: { id },
    select: { meta: true },
  });

  const nextMeta = metaPatch(cur?.meta ?? null, { note });
  await prisma.offer.update({ where: { id }, data: { meta: nextMeta } });

  return NextResponse.json({ ok: true });
}
