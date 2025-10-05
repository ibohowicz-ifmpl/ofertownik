// src/app/api/offers/new/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type Body = {
  clientId?: string;
  clientName?: string;
  clientNip?: string;
  mpkId?: string | null;
  title?: string;
  valueNet?: number | string | null;
  currency?: string | null;
  contractor?: string | null; // trzymamy w meta
  offerNo?: string | null;    // rzadko, zwykle finalizacja nada numer
};

function safeStr(v: unknown): string {
  return (typeof v === 'string' ? v : '').trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const title = safeStr(body.title);
    if (!title) {
      return NextResponse.json({ ok: false, error: 'Brak tytułu oferty' }, { status: 400 });
    }

    // 1) Ustalenie klienta (wymagane: id albo name; NIP wymagany przy tworzeniu)
    let clientId = safeStr(body.clientId);
    if (!clientId) {
      const clientName = safeStr(body.clientName);
      if (!clientName) {
        return NextResponse.json({ ok: false, error: 'Brak klienta (clientId lub clientName)' }, { status: 400 });
      }
      const clientNip = safeStr(body.clientNip) || `0000000000-${Date.now()}`; // minimalny wymagany NIP
      const client = await prisma.client.upsert({
        where: { nip: clientNip },
        update: { name: clientName, isActive: true },
        create: { nip: clientNip, name: clientName, isActive: true },
        select: { id: true },
      });
      clientId = client.id;
    }

    // 2) Autor (na DEV: pierwszy aktywny; w produkcji – z sesji)
    const author = await prisma.user.findFirst({ where: { isActive: true }, select: { id: true } });
    if (!author) {
      return NextResponse.json({ ok: false, error: 'Brak aktywnego użytkownika do przypisania jako autor' }, { status: 500 });
    }

    // 3) Dane oferty
    const mpkId = body.mpkId ? String(body.mpkId) : undefined;
    const valueNet = Number(body.valueNet ?? 0);
    const currency = safeStr(body.currency) || 'PLN';
    const contractor = safeStr(body.contractor);
    const offerNo = safeStr(body.offerNo); // zwykle pusty – numer nada finalizacja

    const data: any = {
      clientId,
      authorUserId: author.id,
      title,
      status: 'DRAFT', // enum, ale string wystarczy
      valueNet,
      currency,
    };
    if (mpkId) data.mpkId = mpkId;
    if (contractor) data.meta = { contractor };
    if (offerNo) data.offerNo = offerNo;

    const created = await prisma.offer.create({
      data,
      select: { id: true, offerNo: true },
    });

    return NextResponse.json({ ok: true, id: created.id, offerNo: created.offerNo ?? null });
  } catch (e: any) {
    console.error('offers/new error:', e);
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
