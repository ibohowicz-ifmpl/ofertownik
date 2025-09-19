// src/app/api/offers/new/route.ts
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const offerNo = (body?.offerNo ?? "")?.toString().trim() || null;
  const title = (body?.title ?? "")?.toString().trim() || null;
  const authorInitials = (body?.authorInitials ?? "")?.toString().trim() || null;
  const contractor = (body?.contractor ?? "")?.toString().trim() || null;
  const valueNetRaw = body?.valueNet;
  const clientId = body?.clientId ? String(body.clientId) : null;
  const clientName = body?.clientName ? String(body.clientName).trim() : null;

  if (!clientId && !clientName) {
    return new Response("clientId lub clientName wymagane", { status: 400 });
  }

  // przygotuj klienta
  let client = null as null | { id: string };
  if (clientId) {
    client = await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!client) return new Response("Nie znaleziono klienta", { status: 400 });
  } else if (clientName) {
    const safeClientName = clientName.slice(0, 10); // twardy limit 10
    client =
      (await prisma.client.findFirst({ where: { name: safeClientName }, select: { id: true } })) ??
      (await prisma.client.create({ data: { name: safeClientName }, select: { id: true } }));
  }

  const valueNet =
    valueNetRaw === null || valueNetRaw === undefined || valueNetRaw === ""
      ? null
      : Number(valueNetRaw);
  if (valueNet !== null && !Number.isFinite(valueNet)) {
    return new Response("Nieprawidłowa wartość netto", { status: 400 });
  }

  const created = await prisma.offer.create({
    data: {
      clientId: client!.id,
      offerNo,
      title,
      authorInitials,
      contractor,
      valueNet: valueNet === null ? undefined : valueNet,
    },
    select: { id: true },
  });

  return Response.json({ id: created.id });
}
