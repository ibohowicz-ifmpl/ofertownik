import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { $Enums } from '@prisma/client';

// Dozwolone kroki (PL, jak w schema.prisma)
const VALID: ReadonlyArray<$Enums.OfferMilestoneStep> = [
  'WYSLANIE',
  'AKCEPTACJA',
  'WYKONANIE',
  'PROTOKOL_WYSLANY',
  'ODBIOR_PRAC',
  'PWF',
];

// Normalizacja kluczy (np. legacy UI, różne formaty)
const normKey = (v: unknown) =>
  (typeof v === 'string' ? v.trim() : '')
    .toUpperCase()
    .replace(/[\s\-]+/g, '_');

// Legacy aliasy -> aktualne enumy (wszystko znormalizowane)
const LEGACY_MAP: Record<string, $Enums.OfferMilestoneStep> = {
  'AKCEPTACJA_ZLECENIE': 'AKCEPTACJA',
  'AKCEPTACJA_ZLECENIA': 'AKCEPTACJA',
  'AKCEPTACJA_ZAMOWIENIA': 'AKCEPTACJA',
  'AKCEPTACJA_OFERTY': 'AKCEPTACJA',
  'AKCEPTACJA': 'AKCEPTACJA', // wprost
};

type InItem = { step: string; occurredAt: string | Date | null | undefined };

const asDateUTC = (v: any): Date | null => {
  if (v === '' || v === null || v === undefined) return null;
  const s = typeof v === 'string' ? v.trim() : v;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    const z = new Date(`${s}T00:00:00Z`);
    return Number.isNaN(z.getTime()) ? null : z;
  }
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

function toEnum(value: unknown): $Enums.OfferMilestoneStep | null {
  if (typeof value !== 'string' || !value) return null;
  const key = normKey(value);
  // bezpośrednio zgodne z enumem (PL)
  if ((VALID as readonly string[]).includes(key)) return key as $Enums.OfferMilestoneStep;
  // aliasy legacy
  if (LEGACY_MAP[key]) return LEGACY_MAP[key];
  // log pomocniczy:
  console.warn('[milestones] Unknown step:', value, '→ normalized:', key, 'Allowed:', [...VALID, ...Object.keys(LEGACY_MAP)]);
  return null;
}

// Parsowanie payloadu:
// - preferuje items: [{step,occurredAt}]
// - wspiera płaski kształt: { WYSLANIE: '2025-10-01', AKCEPTACJA_ZLECENIE: '' } ('' = usuń)
function parseBody(body: any): { toCreate: Array<{ step: $Enums.OfferMilestoneStep; occurredAt: Date }>, toDelete: Array<$Enums.OfferMilestoneStep>, replace: boolean } {
  const replace = body?.replace === true;

  const flatEntries: Array<InItem> =
    body && typeof body === 'object' && !Array.isArray(body?.items)
      ? Object.entries(body)
        .filter(([k]) => typeof k === 'string') // ← zostaw wszystko, mapuje toEnum()
        .map(([k, v]) => ({ step: k, occurredAt: v as any }))
      : [];

  const arrEntries: Array<InItem> = Array.isArray(body?.items) ? (body.items as InItem[]) : [];

  const raw: InItem[] = arrEntries.length > 0 ? arrEntries : flatEntries;

  const toCreate: Array<{ step: $Enums.OfferMilestoneStep; occurredAt: Date }> = [];
  const toDelete: Array<$Enums.OfferMilestoneStep> = [];

  for (const it of raw) {
    const step = toEnum(it?.step);
    if (!step) continue;
    const dt = asDateUTC(it?.occurredAt);
    if (dt) toCreate.push({ step, occurredAt: dt });
    else toDelete.push(step); // pusty string / null = usuń ten krok
  }

  return { toCreate, toDelete, replace };
}

// GET – zwróć kroki w PL (jak w enumie)
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rows = await prisma.offerMilestone.findMany({
    where: { offerId: id },
    orderBy: { occurredAt: 'asc' },
    select: { step: true, occurredAt: true },
  });
  console.log('[milestones] GET rows:', rows);
  return NextResponse.json({
    items: rows.map(r => ({
      step: r.step,
      occurredAt: r.occurredAt.toISOString().slice(0, 10),
    })),
  });
}

// PUT/POST – replace / upsert + delete pojedynczych kroków
async function save(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  let body: any = {};
  try { body = await req.json(); } catch { /* brak body = ok */ }

  const { toCreate, toDelete, replace } = parseBody(body);
  console.log('[milestones] RAW body:', body);
  console.log('[milestones] parsed:', { replace, toCreate, toDelete });

  const url = new URL(req.url);
  const wantDebug = url.searchParams.get('debug') === '1';

  if (replace) {
    await prisma.offerMilestone.deleteMany({ where: { offerId: id } });
    if (toCreate.length > 0) {
      await prisma.offerMilestone.createMany({
        data: toCreate.map(x => ({ offerId: id, step: x.step, occurredAt: x.occurredAt })),
        skipDuplicates: true,
      });
    }
  } else {
    if (toDelete.length > 0) {
      await prisma.offerMilestone.deleteMany({
        where: { offerId: id, step: { in: toDelete } },
      });
    }
    if (toCreate.length > 0) {
      await prisma.$transaction(
        toCreate.map(x =>
          prisma.offerMilestone.upsert({
            where: { offerId_step: { offerId: id, step: x.step } }, // wymagane @@unique([offerId, step])
            update: { occurredAt: x.occurredAt },
            create: { offerId: id, step: x.step, occurredAt: x.occurredAt },
          })
        )
      );
    }
  }

  const out = await prisma.offerMilestone.findMany({
    where: { offerId: id },
    orderBy: { occurredAt: 'asc' },
    select: { step: true, occurredAt: true },
  });

  return NextResponse.json({
    ok: true,
    items: out.map(r => ({
      step: r.step,
      occurredAt: r.occurredAt.toISOString().slice(0, 10),
    })),
    ...(wantDebug ? { debug: { replace, toCreate, toDelete } } : {}),
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) { return save(req, ctx); }
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) { return save(req, ctx); }
