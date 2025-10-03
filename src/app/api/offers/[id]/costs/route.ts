// src/app/api/offers/[id]/costs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getParamId } from '@/lib/api-helpers';

type AnyItem = Record<string, any>;

function parseItems(raw: any): AnyItem[] {
  if (!raw) return [];
  // możliwe kontenery
  const candidates = Array.isArray(raw?.items) ? raw.items
    : Array.isArray(raw?.costs) ? raw.costs
      : Array.isArray(raw?.data) ? raw.data
        : Array.isArray(raw) ? raw
          : [raw];
  return candidates.filter(Boolean);
}

function mapToOfferCost(id: string, r: AnyItem) {
  // aliasy pól
  const posted = r.postedAt ?? r.date ?? r.createdAt;
  const amount = r.amountNet ?? r.valueNet ?? r.kwota ?? r.amount;
  const vendor = r.vendor ?? r.supplier ?? r.kontrahent ?? r.name ?? '';
  const invoice = r.invoiceNo ?? r.nrFv ?? r.docNo ?? r.numer ?? '';
  const category = r.category ?? r.kategoria ?? 'INNE';

  return {
    offerId: id,
    postedAt: posted ? new Date(posted) : new Date(),
    category: String(category),
    vendor: String(vendor),
    invoiceNo: String(invoice),
    amountNet: Number(amount ?? 0),
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const id = await getParamId(ctx);
  const rows = await prisma.offerCost.findMany({
    where: { offerId: id },
    orderBy: [{ postedAt: "asc" }, { id: "asc" }],
    select: { id: true, vendor: true, amountNet: true },
  });
  return NextResponse.json({
    items: rows.map(r => ({
      id: r.id,
      name: r.vendor ?? '',
      valueNet: Number(r.amountNet ?? 0),
    })),
  });
}

async function upsertCosts(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  let json: any = {};
  try { json = await req.json(); } catch { }

  const simpleItems = Array.isArray(json?.items) && json.items.every(
    (it: any) => typeof it?.name === 'string' && ('valueNet' in it)
  );
  const replace = json?.replace === true;

  if (replace && simpleItems) {
    // wyczyść stare koszty oferty
    await prisma.offerCost.deleteMany({ where: { offerId: id } });

    // zbuduj nowe rekordy
    const data = (json.items as any[]).map((c) => ({
      offerId: id,
      postedAt: new Date(),
      category: 'INNE',
      vendor: String(c.name ?? ''),
      invoiceNo: '',
      amountNet: Number(c.valueNet ?? 0),
    })).filter(d => d.vendor.length > 0 && Number.isFinite(d.amountNet));

    if (data.length > 0) {
      await prisma.offerCost.createMany({ data, skipDuplicates: true });
    }

    // odczyt po zapisie i zwrotka w prostym formacie
    const rows = await prisma.offerCost.findMany({
      where: { offerId: id },
      orderBy: [{ postedAt: 'asc' }, { id: 'asc' }],
      select: { id: true, vendor: true, amountNet: true },
    });
    return NextResponse.json({
      ok: true,
      items: rows.map(r => ({ id: r.id, name: r.vendor ?? '', valueNet: Number(r.amountNet ?? 0) })),
    });
  }

  // ...w przeciwnym razie zostaw istniejący elastyczny parser i return jak dotychczas...
  const arr = parseItems(json);
  const data = arr.map((r) => mapToOfferCost(id, r))
    .filter((x) => Number.isFinite(x.amountNet));

  if (data.length === 0) {
    return NextResponse.json({
      ok: true,
      inserted: 0,
      hint: 'Brak rozpoznanych pozycji. Oczekiwane pola: postedAt/date, amountNet/valueNet/amount, vendor/name, invoiceNo/nrFv, category.'
    });
  }
  await prisma.offerCost.createMany({ data, skipDuplicates: true });
  return NextResponse.json({ ok: true, inserted: data.length });
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return upsertCosts(req, ctx);
}

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  return upsertCosts(req, ctx);
}
