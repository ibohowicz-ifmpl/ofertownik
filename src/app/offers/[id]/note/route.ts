// src/app/api/offers/[id]/note/route.ts
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const offer = await prisma.offer.findUnique({ where: { id }, select: { note: true } });
  return Response.json({ note: offer?.note ?? "" }, { headers: { "content-type": "application/json; charset=utf-8" } });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  let body: any = {};
  try {
    body = await req.json();
  } catch {}
  const note = typeof body?.note === "string" ? body.note : "";
  await prisma.offer.update({ where: { id }, data: { note } });
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json; charset=utf-8" } });
}
