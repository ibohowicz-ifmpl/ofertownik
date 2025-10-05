import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseFromApi,
  normStepKey,
  STEP_ORDER,
  type MilestoneKey,
  validateChronology,
  STEP_LABEL,
} from "@/lib/milestones";

// GET: zwraca kanoniczne daty (Record) oraz surowe rows
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const rows = await prisma.offerMilestone.findMany({
    where: { offerId: id },
    orderBy: { occurredAt: "asc" },
    select: { step: true, occurredAt: true },
  });

  // kanonizacja na wyjściu
  const view = parseFromApi(rows as any);
  return Response.json({ ok: true, items: rows, view }, { headers: { "content-type": "application/json; charset=utf-8" } });
}

// PUT: przyjmuje payload w dwóch formach:
//  A) { items:[{ step, occurredAt }], replace?: boolean }
//  B) legacy keyed: { WYSLANIE?: 'yyyy-mm-dd', AKCEPTACJA_ZLECENIE?: 'yyyy-mm-dd', ... }
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const json = (await req.json()) as any;

  // ujednolicenie wejścia do listy items
  const items: { step: MilestoneKey; occurredAt: string }[] = [];

  if (Array.isArray(json?.items)) {
    for (const it of json.items) {
      const key = normStepKey(it?.step);
      const occurredAt = String(it?.occurredAt ?? "").slice(0, 10);
      if (key && occurredAt) items.push({ step: key, occurredAt });
    }
  } else {
    // keyed form → lista
    for (const k of Object.keys(json ?? {})) {
      const key = normStepKey(k);
      const v = String(json[k] ?? "").slice(0, 10);
      if (key && v) items.push({ step: key, occurredAt: v });
    }
  }

  // [NOWE] Chronologia: sortuj items po occurredAt rosnąco i sprawdź kolejność
  items.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  for (let i = 1; i < items.length; ++i) {
    if (items[i].occurredAt < items[i - 1].occurredAt) {
      return new Response(
        JSON.stringify({ ok: false, errors: ["Chronologia naruszona"] }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }
  }

  // [NOWE] Dodatkowa walidacja: nie można ustawić kroku bez wcześniejszych kroków
  // oraz wcześniejsze kroki nie mogą mieć daty > daty bieżącego kroku
  const state = items.reduce<Partial<Record<MilestoneKey, string>>>((acc, it) => {
    acc[it.step] = it.occurredAt;
    return acc;
  }, {});
  for (let i = 0; i < STEP_ORDER.length; ++i) {
    const k = STEP_ORDER[i];
    const v = state[k];
    if (v) {
      // Sprawdź, czy wszystkie wcześniejsze kroki (jeśli istnieją) mają daty ≤ v
      for (let j = 0; j < i; ++j) {
        const prevK = STEP_ORDER[j];
        const prevV = state[prevK];
        if (prevV && prevV > v) {
          return new Response(
            JSON.stringify({
              ok: false,
              errors: [
                `Data kroku ${STEP_LABEL?.[k] || k} nie może być wcześniejsza niż data kroku ${STEP_LABEL?.[prevK] || prevK}`,
              ],
            }),
            { status: 400, headers: { "content-type": "application/json" } }
          );
        }
      }
      // Jeśli to nie jest WYSLANIE, a WYSLANIE nie jest ustawione
      if (i > 0 && !state["WYSLANIE"]) {
        return new Response(
          JSON.stringify({ ok: false, errors: ["Najpierw uzupełnij Wysłanie."] }),
          { status: 400, headers: { "content-type": "application/json" } }
        );
      }
    }
  }

  // walidacja chronologii po kanonizacji
  const errs = validateChronology(state);
  if (errs.length) {
    return new Response(JSON.stringify({ ok: false, errors: errs }), { status: 400, headers: { "content-type": "application/json" } });
  }

  const replace = Boolean(json?.replace);

  // --- WALIDACJA CHRONOLOGII PRZED TRANSAKCJĄ ---
  // Zbuduj mapę: step -> data (YYYY-MM-DD lub undefined)
  const dateMap: Record<MilestoneKey, string | undefined> = {} as any;
  for (const k of STEP_ORDER) dateMap[k] = undefined;
  for (const it of items) dateMap[it.step] = it.occurredAt;

  // Sprawdź, że każda kolejna data jest >= poprzedniej (jeśli obie istnieją)
  let prevDate: string | undefined = undefined;
  for (const k of STEP_ORDER) {
    const currDate = dateMap[k];
    if (currDate && prevDate && currDate < prevDate) {
      return new Response(
        JSON.stringify({ ok: false, errors: ["ChronologyError: Daty kroków muszą być rosnące wg etapów."] }),
        { status: 400, headers: { "content-type": "application/json" } }
      );
    }
    if (currDate) prevDate = currDate;
  }

  // Sprawdź, czy nie kasujemy z "środka" przy istniejących późniejszych datach
  // (czyli: jeśli krok K jest pusty, a jakikolwiek krok >K ma datę, to błąd)
  let foundEmpty = false;
  for (let i = 0; i < STEP_ORDER.length; ++i) {
    const k = STEP_ORDER[i];
    if (!dateMap[k]) foundEmpty = true;
    if (foundEmpty) {
      // jeśli po pierwszym pustym znajdziemy jakąkolwiek datę dalej, to błąd
      for (let j = i + 1; j < STEP_ORDER.length; ++j) {
        if (dateMap[STEP_ORDER[j]]) {
          return new Response(
            JSON.stringify({ ok: false, errors: ["ChronologyError: Nie można usuwać kroku, jeśli istnieją późniejsze daty."] }),
            { status: 400, headers: { "content-type": "application/json" } }
          );
        }
      }
      break;
    }
  }

  // transakcja: kasuj nieprzesłane (jeśli replace) + upsert przesłanych
  const stepsToKeep = new Set(items.map((i) => i.step));
  await prisma.$transaction(async (tx) => {
    if (replace) {
      const toDelete = STEP_ORDER.filter((k) => !stepsToKeep.has(k));
      if (toDelete.length) {
        await tx.offerMilestone.deleteMany({
          where: { offerId: id, step: { in: toDelete as any } },
        });
      }
    }
    // upsert (ON CONFLICT w Prisma: createMany → potem update? tutaj zrobimy delete+create dla prostoty)
    // aby zachować idempotencję i prostotę: delete → create
    if (items.length) {
      await tx.offerMilestone.deleteMany({
        where: { offerId: id, step: { in: items.map((i) => i.step) as any } },
      });
      await tx.offerMilestone.createMany({
        data: items.map((i) => ({
          offerId: id,
          step: i.step as any,
          occurredAt: new Date(i.occurredAt + "T00:00:00.000Z"),
        })),
        skipDuplicates: true,
      });
    }
  });

  // zwrot aktualnego stanu
  const rows = await prisma.offerMilestone.findMany({
    where: { offerId: id },
    orderBy: { occurredAt: "asc" },
    select: { step: true, occurredAt: true },
  });
  const view = parseFromApi(rows as any);

  return Response.json({ ok: true, items, view }, { headers: { "content-type": "application/json; charset=utf-8" } });
}
