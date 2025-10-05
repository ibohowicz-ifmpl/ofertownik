// src/app/offers/page.tsx
import { prisma } from "@/lib/prisma";
import OffersTableClient from "./OffersTableClient";
import type { OfferRow } from "./OffersTableClient";
import { parseFromApi } from "@/lib/milestones"; // DODAJ import

export const dynamic = "force-dynamic";


// ---------- Walidacja parametrów ----------
function safeMonth(v?: string) {
  return v && /^\d{4}-\d{2}$/.test(v) ? v : undefined;
}
function safeDir(v?: string): "asc" | "desc" {
  return v === "asc" || v === "desc" ? v : "desc";
}
function safeDateDir(v?: string): "asc" | "desc" {
  return v === "asc" || v === "desc" ? v : "desc";
}
const STEP_LABEL: Record<string, string> = {
  WYSLANIE: "Wysłanie",
  AKCEPTACJA_ZLECENIE: "Akceptacja",
  WYKONANIE: "Wykonanie",
  PROTOKOL_WYSLANY: "Protokół",
  ODBIOR_PRAC: "Odbiór prac",
  PWF: "PWF",
};
const STEP_ORDER = Object.keys(STEP_LABEL);
function safeStep(v?: string) {
  return v && STEP_ORDER.includes(v) ? v : undefined;
}
function safeYMD(v?: string) {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
}
function ymdToUtcStart(ymd: string) {
  return new Date(`${ymd}T00:00:00.000Z`);
}
function ymdToUtcEnd(ymd: string) {
  return new Date(`${ymd}T23:59:59.999Z`);
}
function withParams(base: string, params: Record<string, string | undefined>) {
  const u = new URL(base, "http://dummy");
  for (const [k, v] of Object.entries(params)) {
    if (v && v.length > 0) u.searchParams.set(k, v);
    else u.searchParams.delete(k);
  }
  const qs = u.searchParams.toString();
  return qs ? `${base}?${qs}` : base;
}
function safeCancelled(v?: string) {
  return v === "1" || v === "true";
}

const toNum = (v: unknown) => (v == null ? 0 : Number(v));
const toYMD = (d: unknown) => {
  if (!d) return '';
  const t = typeof d === 'string' ? new Date(d) : (d as Date);
  return Number.isFinite(t.getTime()) ? t.toISOString().slice(0, 10) : '';
};


// Załóżmy sygnaturę server componentu:
export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  // WSPÓLNA PACZKA PARAMS DO LINKÓW (zachowujemy obecne filtry)
  const common = {
    q: sp.q as string | undefined,
    step: sp.step as string | undefined,
    dir: sp.dir as "asc" | "desc" | undefined,
    dateDir: sp.dateDir as "asc" | "desc" | undefined,
    from: sp.from as string | undefined,
    to: sp.to as string | undefined,
    mpk: sp.mpk as string | undefined,
    page: sp.page as string | undefined,
    show: sp.show as string | undefined,
    offerMonth: sp.offerMonth as string | undefined,
    dateFrom: sp.dateFrom as string | undefined,
    dateTo: sp.dateTo as string | undefined,
    milestone: sp.milestone as string | undefined,
    status: sp.status as string | undefined,
  };

  const selectedMonth = safeMonth(sp?.offerMonth as string | undefined);
  const dir = safeDir(sp?.dir as string | undefined);
  const selStep = safeStep(sp?.step as string | undefined);
  const selFrom = safeYMD(sp?.dateFrom as string | undefined);
  const selTo = safeYMD(sp?.dateTo as string | undefined);
  const dateDir = safeDateDir(sp?.dateDir as string | undefined);
  const showCancelled = safeCancelled(sp?.cancelled as string | undefined);

  const tableKey = JSON.stringify({ selectedMonth, dir, selStep, selFrom, selTo, dateDir, showCancelled });

  // DISTINCT miesiące (YYYY-MM)
  type MonthRow = { offerMonth: string };
  const monthRows = await prisma.$queryRaw<MonthRow[]>`
    SELECT DISTINCT
      CASE
        WHEN "offerNo" IS NOT NULL
          THEN split_part("offerNo", '/', 2) || '-' || split_part("offerNo", '/', 3)
        ELSE to_char("createdAt", 'YYYY-MM')
      END AS "offerMonth"
    FROM "Offer"
    ORDER BY 1 DESC
  `;
  const months = monthRows.map((m) => m.offerMonth);

  // WHERE
  // Usuwamy where.offerMonth, bo nie ma takiej kolumny
  let offers: any[] = [];
  if (selectedMonth) {
    // Faza 1: znajdź ID ofert pasujących miesiącem (offerNo lub createdAt)
    const idRows = await prisma.$queryRaw<{ id: string }[]>`
      SELECT o."id"
      FROM "Offer" o
      WHERE (
        CASE
          WHEN o."offerNo" IS NOT NULL
            THEN split_part(o."offerNo", '/', 2) || '-' || split_part(o."offerNo", '/', 3)
          ELSE to_char(o."createdAt", 'YYYY-MM')
        END
      ) = ${selectedMonth}
      ${showCancelled ? 'AND o."cancelledAt" IS NOT NULL' : 'AND o."cancelledAt" IS NULL'}
      ORDER BY ${showCancelled ? 'o."cancelledAt" DESC' : 'o."offerNo" ' + dir.toUpperCase()}
    `;
    const ids = idRows.map(r => r.id);
    if (ids.length === 0) {
      offers = [];
    } else {
      // Faza 2: doładuj pełne rekordy Prisma z relacjami
      offers = await prisma.offer.findMany({
        where: { id: { in: ids } },
        include: { client: true, milestones: true, costs: true },
        // opcjonalnie: posortuj lokalnie wg kolejności 'ids'
      } as any);
      // utrzymaj kolejność wg 'ids':
      const pos = new Map(ids.map((id, i) => [id, i]));
      offers.sort((a: any, b: any) => (pos.get(a.id) ?? 0) - (pos.get(b.id) ?? 0));
    }
  } else {
    // Oryginalne pobieranie, bez filtra po miesiącu
    offers = await prisma.offer.findMany({
      where: {
        ...(showCancelled ? { cancelledAt: { not: null } } : { cancelledAt: null }),
        ...(selStep || selFrom || selTo
          ? {
            milestones: {
              some: {
                ...(selStep ? { step: selStep } : {}),
                ...(selFrom || selTo
                  ? {
                    occurredAt: {
                      ...(selFrom ? { gte: ymdToUtcStart(selFrom) } : {}),
                      ...(selTo ? { lte: ymdToUtcEnd(selTo) } : {}),
                    },
                  }
                  : {}),
              },
            },
          }
          : {}),
      },
      include: { client: true, milestones: true, costs: true as any },
      orderBy: showCancelled ? { cancelledAt: "desc" as any } : { offerNo: dir as any },
    } as any);
  }

  // (opcjonalnie) sort po MIN(occurredAt) dla wybranego kroku (gdy nie tryb anulowanych)
  const offerMinDate = new Map<string, Date | null>();
  if (!showCancelled && selStep) {
    const params: any[] = [selStep];
    let whereSql = `WHERE ("step"::text) = $1`;
    if (selFrom) {
      params.push(ymdToUtcStart(selFrom));
      whereSql += ` AND "occurredAt" >= $${params.length}`;
    }
    if (selTo) {
      params.push(ymdToUtcEnd(selTo));
      whereSql += ` AND "occurredAt" <= $${params.length}`;
    }
    if (selectedMonth) {
      params.push(selectedMonth);
      whereSql += `
        AND "offerId" IN (
          SELECT "id" FROM "Offer"
          WHERE (
            CASE
              WHEN "offerNo" IS NOT NULL
                THEN split_part("offerNo", '/', 2) || '-' || split_part("offerNo", '/', 3)
              ELSE to_char("createdAt", 'YYYY-MM')
            END
          ) = $${params.length}
        )
      `;
    }
    if (!showCancelled) {
      // tylko aktywne
      whereSql += ` AND "offerId" IN (SELECT "id" FROM "Offer" WHERE "cancelledAt" IS NULL)`;
    }

    const rows = await prisma.$queryRawUnsafe<{ offerId: string; minAt: Date }[]>(
      `SELECT "offerId", MIN("occurredAt") AS "minAt"
       FROM "OfferMilestone"
       ${whereSql}
       GROUP BY "offerId"`,
      ...params
    );
    for (const r of rows) offerMinDate.set(String(r.offerId), r.minAt ?? null);

    offers.sort((a: any, b: any) => {
      const da = offerMinDate.get(String(a.id)) ?? null;
      const db = offerMinDate.get(String(b.id)) ?? null;
      if (da && db) return dateDir === "asc" ? +da - +db : +db - +da;
      if (da && !db) return -1;
      if (!da && db) return 1;
      return 0;
    });
  }

  // DTO do tabeli (CSR) - tylko prymitywy i daty w YYYY-MM-DD
  const rows: OfferRow[] = offers.map((o: any) => {
    // Uproszczone: milestones zawsze przez parseFromApi
    const milestones = parseFromApi(o.milestones ?? []);
    return {
      id: o.id,
      offerNo: o.offerNo ?? '',
      title: o.title,
      clientName: o.client?.name ?? '',
      valueNet: toNum(o.valueNet),
      costsSumNet: toNum(o.costsSumNet),
      currency: o.currency,
      status: o.status,
      createdAt: toYMD(o.createdAt),
      finalizedAt: toYMD(o.finalizedAt),
      cancelledAt: toYMD(o.cancelledAt),
      sentAt: milestones.WYSLANIE ?? "",
      acceptedAt: milestones.AKCEPTACJA ?? "",
      executedAt: milestones.WYKONANIE ?? "",
      protocolAt: milestones.PROTOKOL_WYSLANY ?? "",
      handoverAt: milestones.ODBIOR_PRAC ?? "",
      pwfAt: milestones.PWF ?? "",
      contractor: (o.meta && typeof o.meta === 'object') ? String((o.meta as any).contractor ?? '') : '',
      vendorOrderNo: (o.meta && typeof o.meta === 'object') ? String((o.meta as any).vendorOrderNo ?? '') : '',
    };
  });

  // Link przełącznika anulowanych
  const linkCancelledOn = withParams("/offers", { ...common, cancelled: "1" });
  const linkCancelledOff = withParams("/offers", { ...common, cancelled: undefined });

  // UI stałe
  const ROW1_TOP = 0;
  const ROW2_TOP = 40;
  const HEADER_BG = "#CFF5F7";
  const ROW_ACCENT = "#B9EEF2";

  return (
    <main className="h-screen flex flex-col">
      {/* Pasek górny */}
      <div className="sticky top-0 z-40 border-b" style={{ backgroundColor: "#5FD3DA", borderColor: "#34BFC8" }}>
        <div className="px-4 py-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="rounded-xl border-2 border-white bg-white px-2 py-1">
              <img src="/offers/logo.svg" alt="Logo" className="h-9 w-auto" />
            </div>
            <h1 className="text-xl font-semibold">Lista ofert</h1>
          </div>

          {/* Filtry + sorty + Dodaj + Anulowane */}
          <div className="flex items-center gap-3">
            <form method="GET" action="/offers" className="flex items-center gap-2 flex-wrap">
              {/* Miesiąc */}
              <span className="text-white/90 text-sm">Miesiąc:</span>
              <div className="relative">
                <select
                  className="appearance-none rounded-xl bg-white text-[#009CA6] border-2 border-white px-3 pr-8 py-2 text-[14px]"
                  name="offerMonth"
                  defaultValue={selectedMonth ?? ""}
                >
                  <option value="">(wszystkie)</option>
                  {months.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#009CA6]">▾</span>
              </div>

              {/* Rodzaj daty */}
              <span className="text-white/90 text-sm ml-2">Data:</span>
              <div className="relative">
                <select
                  className="appearance-none rounded-xl bg-white text-[#009CA6] border-2 border-white px-3 pr-8 py-2 text-[14px]"
                  name="step"
                  defaultValue={selStep ?? ""}
                  title="Wybierz rodzaj daty do filtrowania"
                >
                  <option value="">(dowolna)</option>
                  {STEP_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {STEP_LABEL[s]}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#009CA6]">▾</span>
              </div>

              {/* Zakres dat */}
              <input
                type="date"
                name="dateFrom"
                defaultValue={selFrom ?? ""}
                className="rounded-xl bg-white text-[#009CA6] border-2 border-white px-3 py-2 text-[14px]"
                title="Data od"
              />
              <span className="opacity-80">–</span>
              <input
                type="date"
                name="dateTo"
                defaultValue={selTo ?? ""}
                className="rounded-xl bg-white text-[#009CA6] border-2 border-white px-3 py-2 text-[14px]"
                title="Data do"
              />

              {/* zachowaj bieżące sorty i tryb anulowanych */}
              <input type="hidden" name="dir" value={dir} />
              <input type="hidden" name="dateDir" value={dateDir} />
              {showCancelled && <input type="hidden" name="cancelled" value="1" />}

              <button
                type="submit"
                className="ml-1 inline-block rounded-xl px-3 py-2 border-2 border-white text-[14px]
                           bg-white text-[#009CA6] hover:bg-[#E6FBFC] transition-colors"
                title="Zastosuj filtr"
              >
                Filtruj
              </button>
              {(selectedMonth || selStep || selFrom || selTo) && (
                <a
                  href={withParams("/offers", { dir, dateDir, cancelled: showCancelled ? "1" : undefined })}
                  className="inline-block rounded-xl px-3 py-2 border-2 border-white text-[14px]
                             bg-transparent text-white hover:bg-white/10 transition-colors"
                  title="Wyczyść filtr"
                >
                  Wyczyść
                </a>
              )}
            </form>

            {/* Sort po numerze */}
            <div className="flex items-center gap-1 ml-2">
              <a
                href={withParams("/offers", { offerMonth: selectedMonth, step: selStep, dateFrom: selFrom, dateTo: selTo, dateDir, cancelled: showCancelled ? "1" : undefined, dir: "asc" })}
                className={`inline-block rounded-xl px-3 py-2 border-2 border-white text-[14px] ${dir === "asc" ? "bg-white text-[#009CA6]" : "bg-transparent text-white hover:bg-white/10"
                  }`}
                title="Sortuj rosnąco po numerze oferty"
              >
                A→Z
              </a>
              <a
                href={withParams("/offers", { offerMonth: selectedMonth, step: selStep, dateFrom: selFrom, dateTo: selTo, dateDir, cancelled: showCancelled ? "1" : undefined, dir: "desc" })}
                className={`inline-block rounded-xl px-3 py-2 border-2 border-white text-[14px] ${dir === "desc" ? "bg-white text-[#009CA6]" : "bg-transparent text-white hover:bg-white/10"
                  }`}
                title="Sortuj malejąco po numerze oferty"
              >
                Z→A
              </a>
            </div>

            {/* Sort po dacie (po wybraniu kroku) — tylko w widoku aktywnych */}
            {!showCancelled && selStep && (
              <div className="flex items-center gap-1 ml-1">
                <a
                  href={withParams("/offers", { offerMonth: selectedMonth, step: selStep, dateFrom: selFrom, dateTo: selTo, dir, cancelled: showCancelled ? "1" : undefined, dateDir: "asc" })}
                  className={`inline-block rounded-xl px-3 py-2 border-2 border-white text-[14px] ${dateDir === "asc" ? "bg-white text-[#009CA6]" : "bg-transparent text-white hover:bg-white/10"
                    }`}
                  title={`Sortuj rosnąco po dacie: ${STEP_LABEL[selStep]}`}
                >
                  ▲ data
                </a>
                <a
                  href={withParams("/offers", { offerMonth: selectedMonth, step: selStep, dateFrom: selFrom, dateTo: selTo, dir, cancelled: showCancelled ? "1" : undefined, dateDir: "desc" })}
                  className={`inline-block rounded-xl px-3 py-2 border-2 border-white text-[14px] ${dateDir === "desc" ? "bg-white text-[#009CA6]" : "bg-transparent text-white hover:bg-white/10"
                    }`}
                  title={`Sortuj malejąco po dacie: ${STEP_LABEL[selStep]}`}
                >
                  ▼ data
                </a>
              </div>
            )}

            {/* Przełącznik: Pokaż anulowane / Pokaż aktywne */}
            <div className="flex items-center gap-1 ml-2">
              {!showCancelled ? (
                <a
                  href={linkCancelledOn}
                  className="inline-block rounded-xl px-3 py-2 border-2 border-white text-[14px]
                             bg-transparent text-white hover:bg-white/10 transition-colors"
                  title="Pokaż tylko oferty anulowane"
                >
                  Pokaż anulowane
                </a>
              ) : (
                <a
                  href={linkCancelledOff}
                  className="inline-block rounded-xl px-3 py-2 border-2 border-white text-[14px]
                             bg-white text-[#009CA6] hover:bg-[#E6FBFC] transition-colors"
                  title="Wróć do listy aktywnych"
                >
                  Pokaż aktywne
                </a>
              )}
            </div>

            {/* Dodaj ofertę */}
            <a
              href="/offers/new"
              className="inline-block rounded-xl px-4 py-2 border-2 border-white text-[15px]
                      bg-white text-[#009CA6]
                      hover:bg-[#E6FBFC] hover:text-[#009CA6]
                      transition-colors"
            >
              Dodaj ofertę
            </a>
          </div>
        </div>
      </div>

      {/* Tabela — Client Component */}
      <div className="p-4 flex-1 min-h-0">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden h-full flex flex-col">
          <div className="overflow-auto flex-1 min-h-0">
            <OffersTableClient
              key={tableKey}
              rows={rows}
              headerBg={HEADER_BG}
              rowAccent={ROW_ACCENT}
              row1Top={ROW1_TOP}
              row2Top={ROW2_TOP}
              showCancelled={showCancelled}
            />
          </div>
        </div>
      </div>

      {!showCancelled && selStep && (
        <div className="px-4 py-2 text-xs text-gray-600">
          Sort po dacie: <b>{STEP_LABEL[selStep]}</b> ({dateDir === "asc" ? "rosnąco" : "malejąco"}). Brak dat – na końcu.
        </div>
      )}
      {showCancelled && (
        <div className="px-4 py-2 text-xs text-gray-600">
          Widok: <b>Oferty anulowane</b>. Sort: <b>Data anulowania</b> (najnowsze na górze).
        </div>
      )}
    </main>
  );
}
