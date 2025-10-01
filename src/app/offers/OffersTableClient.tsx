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
  cancelledAt?: string | null; // może być null dla aktywnych
  milestones: { step: string; occurredAt: string | null }[];
  costs: { valueNet: number | null }[];
};

type AttentionLevel = "NONE" | "YELLOW" | "RED";

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

function readAttention(offerId: string): { level: AttentionLevel; note: string } {
  try {
    const raw = localStorage.getItem(`offer:attention:${offerId}`);
    if (!raw) return { level: "NONE", note: "" };
    const p = JSON.parse(raw);
    const level: AttentionLevel = p?.level === "YELLOW" || p?.level === "RED" ? p.level : "NONE";
    const note = typeof p?.note === "string" ? p.note : "";
    return { level, note };
  } catch {
    return { level: "NONE", note: "" };
  }
}

function wyslanieOf(o: OfferRow): string | null {
  return (o.milestones ?? []).find((m) => m.step === "WYSLANIE")?.occurredAt ?? null;
}

export default function OffersTableClient({
  rows,
  headerBg,
  rowAccent,
  row1Top = 0,
  row2Top = 40,
  showCancelled = false, // ⬅️ tryb "Pokaż anulowane"
}: {
  rows?: OfferRow[];
  headerBg: string;
  rowAccent: string;
  row1Top?: number;
  row2Top?: number;
  showCancelled?: boolean;
}) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showCancelled, idsKey]);

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
        {data.map((o) => {
          const netto = o.valueNet ?? 0;
          const koszty = (o.costs ?? []).reduce((acc, it) => acc + (Number(it?.valueNet) || 0), 0);
          const zysk = netto - koszty;
          const marza = netto > 0 ? (zysk / netto) * 100 : null;

          const zyskCls = zysk < 0 ? "text-red-600" : zysk === 0 ? "text-gray-700" : "text-gray-900";
          const marzaCls = marzaClass(marza);

          // Znacznik uwagi (lewostronny pasek)
          const att = attMap[o.id] || { level: "NONE", note: "" };
          const leftMarker =
            att.level === "RED" ? "border-l-4 border-red-600" : att.level === "YELLOW" ? "border-l-4 border-yellow-400" : "";

          const wyslanie = wyslanieOf(o);
          const anulowano = o.cancelledAt ?? null;
          const cancelReason = cancelMap[o.id]?.reason ?? null;

          return (
            <tr key={o.id} className="align-top border-b hover:bg-[#E6FBFC]" style={{ borderColor: rowAccent }}>
              <td
                className={`py-2 pr-2 pl-2 whitespace-nowrap bg-gray-50 border-r border-gray-200 w-[8.5rem] ${leftMarker}`}
                title={att.note || undefined}
              >
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

              {!showCancelled ? (
                STEP_ORDER.map((s) => {
                  const when = (o.milestones ?? []).find((m) => String(m.step) === s)?.occurredAt ?? null;
                  return (
                    <td key={s} className="py-2 pr-1 w-[5.25rem] whitespace-nowrap bg-gray-50 text-center">
                      {formatISODate(when)}
                    </td>
                  );
                })
              ) : (
                <>
                  <td className="py-2 pr-2 whitespace-nowrap bg-gray-50 text-center">{formatISODate(wyslanie)}</td>
                  <td
                    className="py-2 pr-2 whitespace-nowrap bg-gray-50 text-center"
                    title={cancelReason || undefined} // ⬅️ tooltip z powodem anulowania
                  >
                    {formatISODate(anulowano)}
                  </td>
                </>
              )}

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

      {/* Stopka sum – zostawiona jak w Twojej wersji; jeśli jej nie używasz, można usunąć */}
      {/* (brak zmian wizualnych w tym pliku) */}
    </table>
  );
}
