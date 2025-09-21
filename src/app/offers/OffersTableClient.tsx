// src/app/offers/OffersTableClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney, formatPercent, formatISODate } from "@/lib/format";

export type OfferRow = {
  id: string;
  offerNo: string | null;
  title: string | null;
  clientName: string | null;
  contractor: string | null;
  vendorOrderNo: string | null;
  valueNet: number | null;
  milestones: { step: string; occurredAt: string | null }[];
  costs: { valueNet: number | null }[];
};

const STEP_LABEL: Record<string, string> = {
  WYSLANIE: "Wysłanie",
  AKCEPTACJA_ZLECENIE: "Akceptacja",
  WYKONANIE: "Wykonanie",
  PROTOKOL_WYSLANY: "Protokół",
  ODBIOR_PRAC: "Odbiór prac",
  PWF: "PWF",
};
const STEP_ORDER = Object.keys(STEP_LABEL);

function marzaClass(m: number | null) {
  if (m == null) return "text-gray-700";
  if (m < 5) return "text-red-600 font-semibold";
  if (m < 14) return "text-amber-500";
  return "text-gray-900";
}

export default function OffersTableClient({
  rows,
  headerBg,
  rowAccent,
  row1Top = 0,
  row2Top = 40,
}: {
  rows?: OfferRow[];             // <— opcjonalne
  headerBg: string;
  rowAccent: string;
  row1Top?: number;
  row2Top?: number;
}) {
  // Zawsze pracujemy na tablicy
  const data: OfferRow[] = Array.isArray(rows) ? rows : [];

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const totals = useMemo(() => {
    return data.reduce(
      (acc, o) => {
        const net = o.valueNet ?? 0;
        const cost = (o.costs ?? []).reduce((s, c) => s + (Number(c?.valueNet) || 0), 0);
        return { net: acc.net + net, cost: acc.cost + cost };
      },
      { net: 0, cost: 0 }
    );
  }, [data]);

  const totalProfit = totals.net - totals.cost;
  const totalMargin = totals.net > 0 ? (totalProfit / totals.net) * 100 : null;

  if (!mounted) return null;

  return (
    <table className="min-w-full text-[13px] border-separate border-spacing-0">
      <thead>
        <tr className="text-center text-gray-700">
          <th
            className="py-2 pr-2 whitespace-nowrap border-r border-gray-200 sticky z-30 h-10 w-[8.5rem] align-middle"
            style={{ top: row1Top, backgroundColor: headerBg }}
            rowSpan={2}
          >
            Nr oferty
          </th>
          <th
            className="py-2 pr-4 sticky z-30 h-10 max-w-[52rem] align-middle"
            style={{ top: row1Top, backgroundColor: headerBg }}
            rowSpan={2}
          >
            Tytuł
          </th>
          <th
            className="py-2 pr-3 whitespace-nowrap sticky z-30 h-10 align-middle"
            style={{ top: row1Top, backgroundColor: headerBg }}
            rowSpan={2}
          >
            Odbiorca
          </th>
          <th
            className="py-2 pr-3 whitespace-nowrap sticky z-30 h-10 align-middle"
            style={{ top: row1Top, backgroundColor: headerBg }}
            rowSpan={2}
          >
            Wartość
          </th>

          <th
            className="py-2 px-2 text-[12px] sticky z-30 h-10"
            style={{ top: row1Top, backgroundColor: headerBg }}
            colSpan={6}
          >
            Daty etapów
          </th>

          <th
            className="py-2 pr-3 whitespace-nowrap hidden sticky z-30 h-10"
            style={{ top: row1Top, backgroundColor: headerBg }}
            rowSpan={2}
          >
            Numer zlecenia
          </th>
          <th
            className="py-2 pr-3 whitespace-nowrap sticky z-30 h-10 align-middle"
            style={{ top: row1Top, backgroundColor: headerBg }}
            rowSpan={2}
          >
            Wykonawca
          </th>

          <th
            className="py-2 pr-3 whitespace-nowrap border-l border-gray-200 sticky z-30 h-10 align-middle"
            style={{ top: row1Top, backgroundColor: headerBg }}
            rowSpan={2}
          >
            Koszt
          </th>
          <th
            className="py-2 pr-3 whitespace-nowrap border-l border-gray-200 sticky z-30 h-10 align-middle"
            style={{ top: row1Top, backgroundColor: headerBg }}
            rowSpan={2}
          >
            Zysk
          </th>
          <th
            className="py-2 pr-3 whitespace-nowrap border-l border-gray-200 sticky z-30 h-10 align-middle"
            style={{ top: row1Top, backgroundColor: headerBg }}
            rowSpan={2}
          >
            Marża
          </th>
          <th
            className="py-2 pr-0 whitespace-nowrap sticky z-30 h-10 align-middle"
            style={{ top: row1Top, backgroundColor: headerBg }}
            rowSpan={2}
          >
            Edycja
          </th>
        </tr>

        <tr className="text-center text-gray-700 border-b-2" style={{ borderColor: rowAccent }}>
          {STEP_ORDER.map((s) => (
            <th
              key={s}
              className="py-2 pr-1 w-[5.25rem] text-[11px] sticky z-20 h-10"
              style={{ top: row2Top, backgroundColor: headerBg }}
            >
              {STEP_LABEL[s]}
            </th>
          ))}
        </tr>
      </thead>

      <tbody>
        {data.map((o) => {
          const netto = o.valueNet ?? 0;
          const koszty = (o.costs ?? []).reduce((acc, it) => acc + (Number(it?.valueNet) || 0), 0);
          const zysk = netto - koszty;
          const marza = netto > 0 ? (zysk / netto) * 100 : null;

          const zyskCls = zysk < 0 ? "text-red-600" : zysk === 0 ? "text-gray-700" : "text-gray-900";
          const marzaCls = marzaClass(marza);

          return (
            <tr key={o.id} className="align-top border-b hover:bg-[#E6FBFC]" style={{ borderColor: rowAccent }}>
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

              <td className="py-2 pr-3 whitespace-nowrap uppercase">{o.clientName || "—"}</td>

              <td className="py-2 pr-3 whitespace-nowrap text-right tabular-nums">{formatMoney(netto)}</td>

              {STEP_ORDER.map((s) => {
                const when =
                  (o.milestones ?? []).find((m) => String(m.step) === s)?.occurredAt ?? null;
                return (
                  <td key={s} className="py-2 pr-1 w-[5.25rem] whitespace-nowrap bg-gray-50 text-center">
                    {formatISODate(when)}
                  </td>
                );
              })}

              <td className="py-2 pr-3 whitespace-nowrap hidden">{o.vendorOrderNo || "—"}</td>
              <td className="py-2 pr-3 pl-2 whitespace-nowrap">{o.contractor || "—"}</td>

              <td className="py-2 pr-3 whitespace-nowrap text-right bg-gray-50 border-l border-gray-200 tabular-nums">
                {formatMoney(koszty)}
              </td>
              <td className={`py-2 pr-3 whitespace-nowrap text-right bg-gray-50 border-l border-gray-200 tabular-nums ${zyskCls}`}>
                {formatMoney(zysk)}
              </td>
              <td className={`py-2 pr-3 whitespace-nowrap text-right bg-gray-50 border-l border-gray-200 tabular-nums ${marzaCls}`}>
                {formatPercent(marza)}
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

      <tfoot className="bg-gray-50 text-gray-900 font-semibold">
        <tr>
          <td className="py-2 pr-2 pl-2 w-[8.5rem]">—</td>
          <td className="py-2 pr-4 pl-2" colSpan={2}>
            Razem
          </td>
          <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">{formatMoney(totals.net)}</td>
          <td colSpan={6}></td>
          <td className="hidden"></td>
          <td></td>
          <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">{formatMoney(totals.cost)}</td>
          <td className={`py-2 pr-3 text-right whitespace-nowrap tabular-nums ${totalProfit < 0 ? "text-red-600" : ""}`}>
            {formatMoney(totalProfit)}
          </td>
          <td className={`py-2 pr-3 text-right whitespace-nowrap tabular-nums ${marzaClass(totalMargin)}`}>
            {formatPercent(totalMargin)}
          </td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  );
}
