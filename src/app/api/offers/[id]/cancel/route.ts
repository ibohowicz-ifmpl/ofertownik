import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const offer = await prisma.offer.findUnique({ where: { id }, select: { cancelledAt: true, meta: true } });
  const asMeta = (v: any) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
  const cancelReason = asMeta(offer?.meta).cancelReason ?? null;
  return NextResponse.json({
    cancelledAt: offer?.cancelledAt ?? null,
    cancelReason,
  });
}

const asMeta = (v: any) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

async function setCancelled(id: string, reason?: string | null) {
  const cur = await prisma.offer.findUnique({ where: { id }, select: { meta: true } });
  const meta = asMeta(cur?.meta);
  if (reason === undefined) {
    delete meta.cancelReason;
    await prisma.offer.update({ where: { id }, data: { cancelledAt: null, meta } });
  } else {
    meta.cancelReason = reason ?? null;
    await prisma.offer.update({ where: { id }, data: { cancelledAt: new Date(), meta } });
  }
}

async function doCancel(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  // query fallback
  const url = new URL(req.url);
  const qAction = url.searchParams.get('action'); // 'cancel'|'uncancel'|null

  // body (jeśli jest)
  let body: any = {};
  try { body = await req.json(); } catch { }

  // rozpoznanie zamiaru
  let intent: 'cancel' | 'uncancel' | 'toggle' | null = null;
  if (qAction === 'cancel' || body?.action === 'cancel' || body?.cancelled === true) intent = 'cancel';
  else if (qAction === 'uncancel' || body?.action === 'uncancel' || body?.cancelled === false) intent = 'uncancel';
  else intent = 'toggle';

  if (intent === 'toggle') {
    const row = await prisma.offer.findUnique({ where: { id }, select: { cancelledAt: true } });
    intent = row?.cancelledAt ? 'uncancel' : 'cancel';
  }

  if (intent === 'cancel') {
    const reason = typeof body?.reason === 'string' ? body.reason : null;
    await setCancelled(id, reason);
  } else {
    await setCancelled(id, undefined);
  }

  const out = await prisma.offer.findUnique({ where: { id }, select: { cancelledAt: true, meta: true } });
  const reason = asMeta(out?.meta).cancelReason ?? null;
  return NextResponse.json({ ok: true, cancelledAt: out?.cancelledAt ?? null, cancelReason: reason });
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) { return doCancel(req, ctx); }
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) { return doCancel(req, ctx); }
export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  // potraktuj jak 'uncancel'
  const body = new Blob([JSON.stringify({ action: 'uncancel' })], { type: 'application/json' });
  const fakeReq = new Request(req.url, { method: 'POST', body });
  return POST(fakeReq, ctx);
}
