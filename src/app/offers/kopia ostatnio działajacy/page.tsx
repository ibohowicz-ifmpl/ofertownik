// src/app/offers/page.tsx
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type SearchParams = {
  offerMonth?: string;
  dir?: "asc" | "desc";
  step?: string;       // rodzaj daty (milestone.step)
  dateFrom?: string;   // YYYY-MM-DD
  dateTo?: string;     // YYYY-MM-DD
};

const nf = new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtMoney = (n?: number | null) => (n == null || Number.isNaN(Number(n)) ? "—" : nf.format(Number(n)));
const fmtPercent = (n?: number | null) => (n == null || Number.isNaN(Number(n)) ? "—" : `${nf.format(Number(n))}%`);

function fmtDate(d?: Date | null) {
  if (!d) return "—";
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
}

function safeMonth(v?: string) {
  return v && /^\d{4}-\d{2}$/.test(v) ? v : undefined;
}
function safeDir(v?: string): "asc" | "desc" {
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
  // koniec dnia 23:59:59.999Z
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
  // Next 15: searchParams to Promise – trzeba await
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const selectedMonth = safeMonth(sp?.offerMonth);
  const dir = safeDir(sp?.dir);
  const selStep = safeStep(sp?.step);
  const selFrom = safeYMD(sp?.dateFrom);
  const selTo = safeYMD(sp?.dateTo);

  // DISTINCT miesiące dostępne w DB (DESC)
  const monthRows = await prisma.$queryRaw<{ offerMonth: string }[]>`
    SELECT DISTINCT "offerMonth" FROM "Offer"
    WHERE "offerMonth" IS NOT NULL
    ORDER BY "offerMonth" DESC
  `;
  const months = monthRows.map((r) => r.offerMonth);

  // WHERE składamy dynamicznie: miesiąc + (opcjonalnie) filtr po milestone.step i zakresie dat
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

  // Pobranie ofert (sort po offerNo, kierunek z parametru)
  const offers = await prisma.offer.findMany({
    where,
    include: { client: true, milestones: true, costs: true as any },
    orderBy: { offerNo: dir as any },
  } as any);

  const stepDate = (o: any, step: string) =>
    fmtDate(Array.isArray(o?.milestones) ? o.milestones.find((m: any) => String(m.step) === step)?.occurredAt : undefined);

  const costSum = (o: any) =>
    typeof o?.wartoscKosztow === "number"
      ? Number(o.wartoscKosztow)
      : Array.isArray(o?.costs)
      ? o.costs.reduce((acc: number, it: any) => acc + (Number(it?.valueNet) || 0), 0)
      : 0;

  // Agregaty do wiersza "Razem"
  const totals = offers.reduce(
    (acc: { net: number; cost: number }, o: any) => {
      const netto = o?.valueNet != null ? Number(o.valueNet) : 0;
      const koszty = costSum(o);
      return { net: acc.net + netto, cost: acc.cost + koszty };
    },
    { net: 0, cost: 0 }
  );
  const totalProfit = totals.net - totals.cost;
  const totalMargin = totals.net > 0 ? (totalProfit / totals.net) * 100 : null;

  // UI stałe
  const ROW1_TOP = 0;
  const ROW2_TOP = 40;
  const HEADER_BG = "#CFF5F7";
  const ROW_ACCENT = "#B9EEF2";

  const marzaClass = (m: number | null) => {
    if (m == null) return "text-gray-700";
    if (m < 5) return "text-red-600 font-semibold";
    if (m < 14) return "text-amber-500";
    return "text-gray-900";
  };

  // Linki sortowania (zachowują wszystkie filtry)
  const linkAsc = withParams("/offers", {
    offerMonth: selectedMonth,
    step: selStep,
    dateFrom: selFrom,
    dateTo: selTo,
    dir: "asc",
  });
  const linkDesc = withParams("/offers", {
    offerMonth: selectedMonth,
    step: selStep,
    dateFrom: selFrom,
    dateTo: selTo,
    dir: "desc",
  });

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

          {/* Filtry + Sort + Dodaj ofertę */}
          <div className="flex items-center gap-3">
            {/* Jeden formularz GET na wszystkie parametry */}
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

              {/* Rodzaj daty (krok) */}
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

              {/* zachowaj bieżący dir przy zatwierdzaniu */}
              <input type="hidden" name="dir" value={dir} />

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
                  href={withParams("/offers", { dir })}
                  className="inline-block rounded-xl px-3 py-2 border-2 border-white text-[14px]
                             bg-transparent text-white hover:bg-white/10 transition-colors"
                  title="Wyczyść filtr"
                >
                  Wyczyść
                </a>
              )}
            </form>

            {/* Sort: A→Z / Z→A */}
            <div className="flex items-center gap-1 ml-2">
              <a
                href={linkAsc}
                className={`inline-block rounded-xl px-3 py-2 border-2 border-white text-[14px] ${
                  dir === "asc" ? "bg-white text-[#009CA6]" : "bg-transparent text-white hover:bg-white/10"
                }`}
                title="Sortuj rosnąco po numerze oferty"
              >
                A→Z
              </a>
              <a
                href={linkDesc}
                className={`inline-block rounded-xl px-3 py-2 border-2 border-white text-[14px] ${
                  dir === "desc" ? "bg-white text-[#009CA6]" : "bg-transparent text-white hover:bg-white/10"
                }`}
                title="Sortuj malejąco po numerze oferty"
              >
                Z→A
              </a>
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

      {/* Tabela */}
      <div className="p-4 flex-1 min-h-0">
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden h-full flex flex-col">
          <div className="overflow-auto flex-1 min-h-0">
            <table className="min-w-full text-[13px] border-separate border-spacing-0">
              <thead>
                <tr className="text-center text-gray-700">
                  <th
                    className="py-2 pr-2 whitespace-nowrap border-r border-gray-200 sticky z-30 h-10 w-[8.5rem] align-middle"
                    style={{ top: 0, backgroundColor: HEADER_BG }}
                    rowSpan={2}
                  >
                    Nr oferty
                  </th>
                  <th
                    className="py-2 pr-4 sticky z-30 h-10 max-w-[52rem] align-middle"
                    style={{ top: 0, backgroundColor: HEADER_BG }}
                    rowSpan={2}
                  >
                    Tytuł
                  </th>
                  <th
                    className="py-2 pr-3 whitespace-nowrap sticky z-30 h-10 align-middle"
                    style={{ top: 0, backgroundColor: HEADER_BG }}
                    rowSpan={2}
                  >
                    Odbiorca
                  </th>
                  <th
                    className="py-2 pr-3 whitespace-nowrap sticky z-30 h-10 align-middle"
                    style={{ top: 0, backgroundColor: HEADER_BG }}
                    rowSpan={2}
                  >
                    Wartość
                  </th>

                  <th
                    className="py-2 px-2 text-[12px] sticky z-30 h-10"
                    style={{ top: 0, backgroundColor: HEADER_BG }}
                    colSpan={6}
                  >
                    Daty etapów
                  </th>

                  <th
                    className="py-2 pr-3 whitespace-nowrap hidden sticky z-30 h-10"
                    style={{ top: 0, backgroundColor: HEADER_BG }}
                    rowSpan={2}
                  >
                    Numer zlecenia
                  </th>
                  <th
                    className="py-2 pr-3 whitespace-nowrap sticky z-30 h-10 align-middle"
                    style={{ top: 0, backgroundColor: HEADER_BG }}
                    rowSpan={2}
                  >
                    Wykonawca
                  </th>

                  <th
                    className="py-2 pr-3 whitespace-nowrap border-l border-gray-200 sticky z-30 h-10 align-middle"
                    style={{ top: 0, backgroundColor: HEADER_BG }}
                    rowSpan={2}
                  >
                    Koszt
                  </th>
                  <th
                    className="py-2 pr-3 whitespace-nowrap border-l border-gray-200 sticky z-30 h-10 align-middle"
                    style={{ top: 0, backgroundColor: HEADER_BG }}
                    rowSpan={2}
                  >
                    Zysk
                  </th>
                  <th
                    className="py-2 pr-3 whitespace-nowrap border-l border-gray-200 sticky z-30 h-10 align-middle"
                    style={{ top: 0, backgroundColor: HEADER_BG }}
                    rowSpan={2}
                  >
                    Marża
                  </th>
                  <th
                    className="py-2 pr-0 whitespace-nowrap sticky z-30 h-10 align-middle"
                    style={{ top: 0, backgroundColor: HEADER_BG }}
                    rowSpan={2}
                  >
                    Edycja
                  </th>
                </tr>

                <tr className="text-center text-gray-700 border-b-2" style={{ borderColor: ROW_ACCENT }}>
                  <th className="py-2 pr-1 w-[5.25rem] text-[11px] sticky z-20 h-10" style={{ top: ROW2_TOP, backgroundColor: HEADER_BG }}>Wysłanie</th>
                  <th className="py-2 pr-1 w-[5.25rem] text-[11px] sticky z-20 h-10" style={{ top: ROW2_TOP, backgroundColor: HEADER_BG }}>Akceptacja</th>
                  <th className="py-2 pr-1 w-[5.25rem] text-[11px] sticky z-20 h-10" style={{ top: ROW2_TOP, backgroundColor: HEADER_BG }}>Wykonanie</th>
                  <th className="py-2 pr-1 w-[5.25rem] text-[11px] sticky z-20 h-10" style={{ top: ROW2_TOP, backgroundColor: HEADER_BG }}>Protokół</th>
                  <th className="py-2 pr-1 w-[5.25rem] text-[11px] sticky z-20 h-10" style={{ top: ROW2_TOP, backgroundColor: HEADER_BG }}>Odbiór prac</th>
                  <th className="py-2 pr-1 w-[5.25rem] text-[11px] sticky z-20 h-10" style={{ top: ROW2_TOP, backgroundColor: HEADER_BG }}>PWF</th>
                </tr>
              </thead>

              <tbody>
                {offers.map((o: any) => {
                  const netto = o?.valueNet != null ? Number(o.valueNet) : 0;
                  const koszty = costSum(o);
                  const zysk = netto - koszty;
                  const marza = netto > 0 ? (zysk / netto) * 100 : null;

                  const zyskCls = zysk < 0 ? "text-red-600" : zysk === 0 ? "text-gray-700" : "text-gray-900";
                  const marzaCls = marzaClass(marza);

                  return (
                    <tr key={o.id} className="align-top border-b hover:bg-[#E6FBFC]" style={{ borderColor: ROW_ACCENT }}>
                      <td className="py-2 pr-2 pl-2 whitespace-nowrap bg-gray-50 border-r border-gray-200 w-[8.5rem]">
                        {o.offerNo || "—"}
                      </td>

                      <td className="py-2 pr-4 pl-2 max-w-[52rem]">
                        <div
                          className="leading-snug"
                          style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                          title={o.title || ""}
                        >
                          {o.title || "—"}
                        </div>
                      </td>

                      <td className="py-2 pr-3 whitespace-nowrap uppercase">{o.client?.name || "—"}</td>

                      <td className="py-2 pr-3 whitespace-nowrap text-right">{fmtMoney(netto)}</td>

                      <td className="py-2 pr-1 w-[5.25rem] whitespace-nowrap bg-gray-50 text-center">{stepDate(o, "WYSLANIE")}</td>
                      <td className="py-2 pr-1 w-[5.25rem] whitespace-nowrap bg-gray-50 text-center">{stepDate(o, "AKCEPTACJA_ZLECENIE")}</td>
                      <td className="py-2 pr-1 w-[5.25rem] whitespace-nowrap bg-gray-50 text-center">{stepDate(o, "WYKONANIE")}</td>
                      <td className="py-2 pr-1 w-[5.25rem] whitespace-nowrap bg-gray-50 text-center">{stepDate(o, "PROTOKOL_WYSLANY")}</td>
                      <td className="py-2 pr-1 w-[5.25rem] whitespace-nowrap bg-gray-50 text-center">{stepDate(o, "ODBIOR_PRAC")}</td>
                      <td className="py-2 pr-1 w-[5.25rem] whitespace-nowrap bg-gray-50 text-center">{stepDate(o, "PWF")}</td>

                      <td className="py-2 pr-3 whitespace-nowrap hidden">{o.vendorOrderNo || "—"}</td>
                      <td className="py-2 pr-3 pl-2 whitespace-nowrap">{o.contractor || "—"}</td>

                      <td className="py-2 pr-3 whitespace-nowrap text-right bg-gray-50 border-l border-gray-200">{fmtMoney(koszty)}</td>
                      <td className={`py-2 pr-3 whitespace-nowrap text-right bg-gray-50 border-l border-gray-200 ${zyskCls}`}>
                        {fmtMoney(zysk)}
                      </td>
                      <td className={`py-2 pr-3 whitespace-nowrap text-right bg-gray-50 border-l border-gray-200 ${marzaCls}`}>
                        {fmtPercent(marza)}
                      </td>

                      <td className="py-2 pr-0 whitespace-nowrap text-right">
                        <a
                          href={`/offers/${o.id}/edit`}
                          className="inline-block rounded px-3 py-1 border border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100"
                        >
                          Edytuj
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* SUMA */}
              <tfoot className="bg-gray-50 text-gray-900 font-semibold">
                <tr>
                  <td className="py-2 pr-2 pl-2 w-[8.5rem]">—</td>
                  <td className="py-2 pr-4 pl-2" colSpan={2}>Razem</td>
                  <td className="py-2 pr-3 text-right">{fmtMoney(totals.net)}</td>
                  <td colSpan={6}></td>
                  <td className="hidden"></td>
                  <td></td>
                  <td className="py-2 pr-3 text-right">{fmtMoney(totals.cost)}</td>
                  <td className={`py-2 pr-3 text-right ${totalProfit < 0 ? "text-red-600" : ""}`}>{fmtMoney(totalProfit)}</td>
                  <td className={`py-2 pr-3 text-right ${marzaClass(totalMargin)}`}>{fmtPercent(totalMargin)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
