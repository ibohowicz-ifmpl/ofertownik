// src/app/offers/OffersTableClient.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney, formatPercent, formatISODate } from "@/lib/format";
import { useRouter } from "next/navigation";

export type OfferRow = {
  id: string;
  offerNo: string;
  title: string;
  clientName: string;
  valueNet: number;
  costsSumNet: number;
  currency: string;
  status: string;
  createdAt: string;
  finalizedAt: string;
  cancelledAt: string;
  sentAt: string;
  acceptedAt: string;
  executedAt: string;
  protocolAt: string;
  handoverAt: string;
  pwfAt: string;
  contractor: string;
  vendorOrderNo: string;
  milestones?: { step: string; occurredAt: string | null }[];
};

type AttentionLevel = "NONE" | "YELLOW" | "RED" | "BLUE";

type StepKey =
  | 'WYSLANIE'
  | 'AKCEPTACJA'
  | 'WYKONANIE'
  | 'PROTOKOL_WYSLANY'
  | 'ODBIOR_PRAC'
  | 'PWF';

const STEP_ORDER = [
  "WYSLANIE",
  "AKCEPTACJA",
  "WYKONANIE",
  "PROTOKOL_WYSLANY",
  "ODBIOR_PRAC",
  "PWF",
] as const;

const STEP_LABEL: Record<typeof STEP_ORDER[number], string> = {
  WYSLANIE: "Data wysłania",
  AKCEPTACJA: "Data akceptacji",
  WYKONANIE: "Data wykonania",
  PROTOKOL_WYSLANY: "Data protokołu",
  ODBIOR_PRAC: "Data odbioru prac",
  PWF: "Data PWF",
};

const STEP_FIELD: Record<StepKey, keyof OfferRow> = {
  WYSLANIE: 'sentAt',
  AKCEPTACJA: 'acceptedAt',
  WYKONANIE: 'executedAt',
  PROTOKOL_WYSLANY: 'protocolAt',
  ODBIOR_PRAC: 'handoverAt',
  PWF: 'pwfAt',
};

function marzaClass(m: number | null) {
  if (m == null) return "text-gray-700";
  if (m < 5) return "text-red-600 font-semibold";
  if (m < 14) return "text-amber-500";
  return "text-gray-900";
}

function readAttention(offerId: string): { level: AttentionLevel; note: string } {
  try {
    const raw = localStorage.getItem(`offer:attention:${offerId}`);
    if (!raw) return { level: "NONE", note: "" };
    const p = JSON.parse(raw);
    const lvl = p?.level as AttentionLevel;
    const level: AttentionLevel = (lvl === "YELLOW" || lvl === "RED" || lvl === "BLUE") ? lvl : "NONE";
    const note = typeof p?.note === "string" ? p.note : "";
    return { level, note };
  } catch {
    return { level: "NONE", note: "" };
  }
}


type Props = {
  rows: OfferRow[];
  headerBg?: string;
  rowAccent?: string;
  row1Top?: number;
  row2Top?: number;
  showCancelled?: boolean;
};

export default function OffersTableClient({
  rows,
  headerBg,
  rowAccent,
  row1Top = 0,
  row2Top = 40,
  showCancelled = false,
}: Props) {
  const router = useRouter();
  const data: OfferRow[] = Array.isArray(rows) ? rows : [];

  // Stabilny klucz po ID do efektów zależnych od listy
  const idsKey = useMemo(() => data.map((o) => o.id).join(","), [data]);

  // ===== Attention (lewostronny pasek + tooltip z notatką z InfoPanel) =====
  const [attMap, setAttMap] = useState<Record<string, { level: AttentionLevel; note: string }>>({});
  useEffect(() => {
    const next: Record<string, { level: AttentionLevel; note: string }> = {};
    for (const o of data) next[o.id] = readAttention(o.id);
    setAttMap(next);

    const handler = (e: any) => {
      const det = e?.detail || {};
      const id = String(det?.offerId ?? "");
      if (!id) return;
      setAttMap((prev) => ({ ...prev, [id]: readAttention(id) }));
    };
    window.addEventListener("offer-attention-updated", handler as EventListener);
    return () => window.removeEventListener("offer-attention-updated", handler as EventListener);

  }, [idsKey]);

  // ===== Tooltip z powodem anulowania (tylko w showCancelled) =====
  type CancelInfo = { reason: string | null; cancelledAt: string | null };
  const [cancelMap, setCancelMap] = useState<Record<string, CancelInfo>>({});

  useEffect(() => {
    if (!showCancelled) return;
    let abort = false;

    (async () => {
      // dociągamy brakujące „reason” per-id
      for (const o of data) {
        if (cancelMap[o.id]) continue;
        try {
          const r = await fetch(`/api/offers/${o.id}/cancel?t=${Date.now()}`, { cache: "no-store" });
          if (!r.ok) continue;
          const j = await r.json();
          if (abort) return;
          setCancelMap((prev) => ({
            ...prev,
            [o.id]: {
              reason: j?.reason ?? j?.cancelReason ?? null,
              cancelledAt: j?.cancelledAt ?? o.cancelledAt ?? null,
            },
          }));
        } catch {
          // ignorujemy pojedyncze błędy
        }
      }
    })();

    return () => {
      abort = true;
    };

  }, [showCancelled, idsKey]);

  // Helper do wartości kroku
  function getStepVal(row: OfferRow, step: StepKey): string {
    const f = STEP_FIELD[step];
    const v = row[f];
    return (typeof v === 'string' ? v : '') || '';
  }

  useEffect(() => {
    function onDatesSaved() {
      router.refresh();
    }
    window.addEventListener("offer-dates-saved", onDatesSaved);
    return () => window.removeEventListener("offer-dates-saved", onDatesSaved);
  }, [router]);

  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="text-gray-700 border-b-2" style={{ borderColor: rowAccent }}>
          <th
            className="py-2 pr-2 pl-2 whitespace-nowrap sticky z-30 h-10 align-middle w-[8.5rem] bg-gray-50 border-r border-gray-200"
            style={{ top: row1Top, backgroundColor: headerBg }}
            rowSpan={2}
          >
            Nr oferty
          </th>

          <th
            className="py-2 pr-4 pl-2 whitespace-nowrap sticky z-30 h-10 align-middle"
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
            Klient
          </th>

          <th
            className="py-2 pr-3 whitespace-nowrap sticky z-30 h-10 align-middle"
            style={{ top: row1Top, backgroundColor: headerBg }}
            rowSpan={2}
          >
            Netto
          </th>

          {!showCancelled ? (
            <th
              className="py-2 pr-1 text-center sticky z-30 h-10 align-middle"
              style={{ top: row1Top, backgroundColor: headerBg }}
              colSpan={STEP_ORDER.length}
            >
              Daty etapów
            </th>
          ) : (
            <>
              <th
                className="py-2 pr-2 whitespace-nowrap sticky z-30 h-10 align-middle"
                style={{ top: row1Top, backgroundColor: headerBg }}
                rowSpan={2}
              >
                Wysłanie
              </th>
              <th
                className="py-2 pr-2 whitespace-nowrap sticky z-30 h-10 align-middle"
                style={{ top: row1Top, backgroundColor: headerBg }}
                rowSpan={2}
              >
                Anulowano
              </th>
            </>
          )}

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

        {!showCancelled && (
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
        )}
      </thead>

      <tbody>
        {data.map((row: OfferRow) => {
          const netto = row.valueNet ?? 0;
          const koszty = row.costsSumNet ?? 0;
          const zysk = netto - koszty;
          const marza = netto > 0 ? (zysk / netto) * 100 : null;

          const zyskCls = zysk < 0 ? "text-red-600" : zysk === 0 ? "text-gray-700" : "text-gray-900";
          const marzaCls = marzaClass(marza);

          // Znacznik uwagi (lewostronny pasek)
          const att = attMap[row.id] || { level: "NONE", note: "" };
          const leftMarker =
            att.level === "RED"
              ? "border-l-4 [border-left-color:#dc2626]"
              : att.level === "YELLOW"
                ? "border-l-4 [border-left-color:#f59e0b]"
                : att.level === "BLUE"
                  ? "border-l-4 [border-left-color:#3b82f6]"
                  : "";                                           // NONE → brak paska


          const anulowano = row.cancelledAt ?? null;
          const cancelReason = cancelMap[row.id]?.reason ?? null;

          return (
            <tr key={row.id} className="align-top border-b hover:bg-[#E6FBFC]" style={{ borderColor: rowAccent }}>
              <td
                className={`py-2 pr-2 pl-2 whitespace-nowrap bg-gray-50 border-r border-gray-200 w-[8.5rem] ${leftMarker}`}
                title={att.note || undefined}
              >
                {row.offerNo || "—"}
              </td>

              <td className="py-2 pr-4 pl-2 max-w-[52rem]">
                <div
                  className="leading-snug"
                  style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
                  title={row.title || ""}
                >
                  {row.title || "—"}
                </div>
              </td>

              <td className="py-2 pr-3 whitespace-nowrap uppercase">{row.clientName || "—"}</td>

              <td className="py-2 pr-3 whitespace-nowrap text-right tabular-nums">{formatMoney(netto)}</td>

              {!showCancelled ? (
                STEP_ORDER.map((s: StepKey) => (
                  <td key={s} className="py-2 pr-1 w-[5.25rem] whitespace-nowrap bg-gray-50 text-center">
                    {getStepVal(row, s) || "-"}
                  </td>
                ))
              ) : (
                <>
                  <td className="py-2 pr-2 whitespace-nowrap bg-gray-50 text-center">{row.sentAt || "-"}</td>
                  <td
                    className="py-2 pr-2 whitespace-nowrap bg-gray-50 text-center"
                    title={cancelReason || undefined}
                  >
                    {formatISODate(anulowano)}
                  </td>
                </>
              )}

              <td className="py-2 pr-3 whitespace-nowrap hidden">{row.vendorOrderNo || "—"}</td>
              <td className="py-2 pr-3 pl-2 whitespace-nowrap">{row.contractor || "—"}</td>

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
                  href={`/offers/${row.id}/edit`}
                  className="inline-block rounded px-3 py-1 border border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100"
                >
                  Edytuj
                </a>
              </td>
            </tr>
          );
        })}
      </tbody>

      {/* Stopka sum – zostawiona jak w Twojej wersji; jeśli jej nie używasz, można usunąć */}
      {/* (brak zmian wizualnych w tym pliku) */}
    </table>
  );
}
