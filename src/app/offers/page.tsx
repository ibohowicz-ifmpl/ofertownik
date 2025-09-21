// src/app/offers/page.tsx
import { prisma } from "@/lib/prisma";
import OffersTableClient, { type OfferRow } from "./OffersTableClient";

export const dynamic = "force-dynamic";

type SearchParams = {
  offerMonth?: string;
  dir?: "asc" | "desc";
  step?: string;
  dateFrom?: string;
  dateTo?: string;
  dateDir?: "asc" | "desc";
};

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

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const selectedMonth = safeMonth(sp?.offerMonth);
  const dir = safeDir(sp?.dir);
  const selStep = safeStep(sp?.step);
  const selFrom = safeYMD(sp?.dateFrom);
  const selTo = safeYMD(sp?.dateTo);
  const dateDir = safeDateDir(sp?.dateDir);

  const tableKey = JSON.stringify({ selectedMonth, dir, selStep, selFrom, selTo, dateDir });

  // DISTINCT miesiące (DESC)
  const monthRows = await prisma.$queryRaw<{ offerMonth: string }[]>`
    SELECT DISTINCT "offerMonth" FROM "Offer"
    WHERE "offerMonth" IS NOT NULL
    ORDER BY "offerMonth" DESC
  `;
  const months = monthRows.map((r) => r.offerMonth);

  // WHERE
  const where: any = {};
  if (selectedMonth) where.offerMonth = selectedMonth;
  if (selStep || selFrom || selTo) {
    const stepCond: any = {};
    if (selStep) stepCond.step = selStep;
    const dateCond: any = {};
    if (selFrom) dateCond.gte = ymdToUtcStart(selFrom);
    if (selTo) dateCond.lte = ymdToUtcEnd(selTo);
    if (Object.keys(dateCond).length > 0) stepCond.occurredAt = dateCond;
    where.milestones = { some: stepCond };
  }

  // Pobierz oferty
  const offers = await prisma.offer.findMany({
    where,
    include: { client: true, milestones: true, costs: true as any },
    orderBy: { offerNo: dir as any },
  } as any);

  // (opcjonalnie) sort po MIN(occurredAt) dla wybranego kroku
  let offerMinDate = new Map<string, Date | null>();
  if (selStep) {
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
      whereSql += ` AND "offerId" IN (SELECT "id" FROM "Offer" WHERE "offerMonth" = $${params.length})`;
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

  // Dane do tabeli (CSR)
  const rows: OfferRow[] = offers.map((o: any) => ({
    id: String(o.id),
    offerNo: o.offerNo ?? null,
    title: o.title ?? null,
    clientName: o.client?.name ?? null,
    contractor: o.contractor ?? null,
    vendorOrderNo: o.vendorOrderNo ?? null,
    valueNet: o.valueNet != null ? Number(o.valueNet) : null,
    milestones: Array.isArray(o.milestones)
      ? o.milestones.map((m: any) => ({
          step: String(m.step),
          occurredAt: m?.occurredAt ? new Date(m.occurredAt).toISOString() : null,
        }))
      : [],
    costs: Array.isArray(o.costs)
      ? o.costs.map((c: any) => ({ valueNet: c?.valueNet != null ? Number(c.valueNet) : null }))
      : [],
  }));

  // Linki sortowania
  const common = { offerMonth: selectedMonth, step: selStep, dateFrom: selFrom, dateTo: selTo, dateDir };
  const linkAsc = withParams("/offers", { ...common, dir: "asc" });
  const linkDesc = withParams("/offers", { ...common, dir: "desc" });
  const linkDateAsc = withParams("/offers", { ...common, dir, dateDir: "asc" });
  const linkDateDesc = withParams("/offers", { ...common, dir, dateDir: "desc" });

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

          {/* Filtry + sorty + Dodaj ofertę */}
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

              {/* zachowaj bieżące sorty */}
              <input type="hidden" name="dir" value={dir} />
              <input type="hidden" name="dateDir" value={dateDir} />

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
                  href={withParams("/offers", { dir, dateDir })}
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
                href={withParams("/offers", { ...common, dir: "asc" })}
                className={`inline-block rounded-xl px-3 py-2 border-2 border-white text-[14px] ${
                  dir === "asc" ? "bg-white text-[#009CA6]" : "bg-transparent text-white hover:bg-white/10"
                }`}
                title="Sortuj rosnąco po numerze oferty"
              >
                A→Z
              </a>
              <a
                href={withParams("/offers", { ...common, dir: "desc" })}
                className={`inline-block rounded-xl px-3 py-2 border-2 border-white text-[14px] ${
                  dir === "desc" ? "bg-white text-[#009CA6]" : "bg-transparent text-white hover:bg-white/10"
                }`}
                title="Sortuj malejąco po numerze oferty"
              >
                Z→A
              </a>
            </div>

            {/* Sort po dacie (po wybraniu kroku) */}
            {selStep && (
              <div className="flex items-center gap-1 ml-1">
                <a
                  href={withParams("/offers", { ...common, dir, dateDir: "asc" })}
                  className={`inline-block rounded-xl px-3 py-2 border-2 border-white text-[14px] ${
                    dateDir === "asc" ? "bg-white text-[#009CA6]" : "bg-transparent text-white hover:bg-white/10"
                  }`}
                  title={`Sortuj rosnąco po dacie: ${STEP_LABEL[selStep]}`}
                >
                  ▲ data
                </a>
                <a
                  href={withParams("/offers", { ...common, dir, dateDir: "desc" })}
                  className={`inline-block rounded-xl px-3 py-2 border-2 border-white text-[14px] ${
                    dateDir === "desc" ? "bg-white text-[#009CA6]" : "bg-transparent text-white hover:bg-white/10"
                  }`}
                  title={`Sortuj malejąco po dacie: ${STEP_LABEL[selStep]}`}
                >
                  ▼ data
                </a>
              </div>
            )}

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
            />
          </div>
        </div>
      </div>

      {selStep && (
        <div className="px-4 py-2 text-xs text-gray-600">
          Sort po dacie: <b>{STEP_LABEL[selStep]}</b> ({dateDir === "asc" ? "rosnąco" : "malejąco"}). Brak dat – na końcu.
        </div>
      )}
    </main>
  );
}
