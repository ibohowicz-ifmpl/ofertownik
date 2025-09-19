// src/app/offers/[id]/costsPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney, NUMERIC_CLS } from "@/lib/format";

type CostItem = { id?: string; name: string; valueNet: number | null };

// spacje: zwykłe + niełamliwe (dla input parsera)
const SPACE_RE = /[ \u00A0\u202F]/g;

/** Backend przyjmuje wartości w zł jako string "X.XX" (2 miejsca). */
function toBackendMoney(value: number | null): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function isCostArray(data: any): data is CostItem[] {
  return (
    Array.isArray(data) &&
    data.every(
      (it: any) =>
        it &&
        typeof it.name === "string" &&
        (typeof it.valueNet === "number" ||
          it.valueNet === null ||
          typeof it.valueNet === "undefined")
    )
  );
}

export default function CostsPanel({ offerId }: { offerId: string }) {
  const [costs, setCosts] = useState<CostItem[]>(
    Array.from({ length: 5 }, () => ({ name: "", valueNet: null }))
  );
  const [valueText, setValueText] = useState<string[]>(
    Array.from({ length: 5 }, () => "")
  ); // widok inputów (string)
  const [baseline, setBaseline] = useState<CostItem[]>(
    Array.from({ length: 5 }, () => ({ name: "", valueNet: null }))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // ✅ TOAST: sukces/błąd (spójny z innymi panelami)
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // fetch istniejących kosztów
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/offers/${offerId}/costs`, { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json(); // { items: CostItem[] }
        const raw = data?.items;
        const items: CostItem[] = isCostArray(raw) ? raw : [];
        const padded = items
          .concat(
            Array.from({ length: Math.max(0, 5 - items.length) }, () => ({
              name: "",
              valueNet: null,
            }))
          )
          .slice(0, 5);
        if (!cancelled) {
          setCosts(padded);
          setBaseline(padded);
          setValueText(
            padded.map((c) => (c.valueNet == null ? "" : formatMoney(c.valueNet)))
          );
        }
      } catch {
        // zostaw puste 5
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [offerId]);

  const isRowDirty = (i: number) => {
    const a = costs[i] ?? { name: "", valueNet: null };
    const b = baseline[i] ?? { name: "", valueNet: null };
    const sameName = (a.name || "") === (b.name || "");
    const sameVal = Number(a.valueNet ?? 0) === Number(b.valueNet ?? 0);
    return !(sameName && sameVal);
  };
  const anyDirty =
    costs.length !== baseline.length || costs.some((_, i) => isRowDirty(i));

  const sum = useMemo(
    () =>
      costs.reduce(
        (acc, c) =>
          acc + (Number.isFinite(Number(c.valueNet)) ? Number(c.valueNet) : 0),
        0
      ),
    [costs]
  );

  function parseMoneyToNumber(txt: string): number | null {
    const cleaned = txt.replace(SPACE_RE, "").replace(",", ".").replace(/[^\d.]/g, "");
    if (cleaned === "") return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }

  async function save() {
    try {
      if (!anyDirty) return; // ↩️ nic do zapisania
      setSaving(true);
      const items = costs
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          name: (c.name || "").trim(),
          valueNet: toBackendMoney(c.valueNet), // zawsze "X.XX"
        }))
        .filter((c) => c.name.length > 0);

      const r = await fetch(`/api/offers/${offerId}/costs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json(); // { items: [...] }
      const raw = data?.items;

      // Preferujemy wartości z backendu, ale dopuszczamy echo.
      const savedItems: CostItem[] = Array.isArray(raw)
        ? raw.map((it: any) => ({
            id: it?.id,
            name: String(it?.name ?? ""),
            valueNet:
              it?.valueNet == null
                ? null
                : Number(String(it.valueNet).replace(",", ".")),
          }))
        : items.map((it: any) => ({
            id: it?.id,
            name: String(it?.name ?? ""),
            valueNet:
              it?.valueNet == null
                ? null
                : Number(String(it.valueNet).replace(",", ".")),
          }));

      const padded = savedItems
        .concat(
          Array.from({ length: Math.max(0, 5 - savedItems.length) }, () => ({
            name: "",
            valueNet: null,
          }))
        )
        .slice(0, 5);

      setCosts(padded);
      setBaseline(padded);
      setValueText(
        padded.map((c) => (c.valueNet == null ? "" : formatMoney(c.valueNet)))
      );
      setMsg("Zapisano koszty");
      setTimeout(() => setMsg(null), 1200);

      // ✅ TOAST: sukces
      setToast({ type: "success", text: "Zapisano koszty" });
      setTimeout(() => setToast(null), 1500);

      // Powiadom inne panele / Status
      const sumNet = padded.reduce(
        (acc, it) => acc + (Number(it?.valueNet) || 0),
        0
      );
      window.dispatchEvent(
        new CustomEvent("offer-costs-saved", { detail: { offerId: String(offerId), sumNet } })
      );
    } catch (e: any) {
      setMsg(e?.message || "Błąd zapisu kosztów");
      // ✅ TOAST: błąd
      setToast({ type: "error", text: e?.message || "Błąd zapisu kosztów" });
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-3">
        {/* ✅ TOAST */}
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed bottom-4 right-4 z-50 rounded px-3 py-2 text-sm shadow ${
              toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
            }`}
          >
            {toast.text}
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Koszty (max 5)</div>
          <div className="text-sm text-gray-800 font-semibold">
            Wartość kosztów:{" "}
            <span className={`font-bold ${NUMERIC_CLS}`}>
              {formatMoney(sum)}
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          {Array.from({ length: 5 }).map((_, i) => {
            const item = costs[i] ?? { name: "", valueNet: null };
            const dirty = isRowDirty(i);
            return (
              <div key={i} className="flex items-center gap-2 w-full">
                <input
                  className={`border rounded px-2 py-1 grow min-w-[16rem] ${
                    dirty ? "ring-1 ring-yellow-400 bg-yellow-50" : ""
                  }`}
                  placeholder={`Nazwa kosztu ${i + 1}`}
                  value={item.name}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCosts((prev) => {
                      const next = [...prev];
                      next[i] = { ...next[i], name: v };
                      return next;
                    });
                  }}
                />
                <input
                  className={`border rounded px-2 py-1 w-40 sm:w-44 md:w-48 shrink-0 text-right tabular-nums ${
                    dirty ? "ring-1 ring-yellow-400 bg-yellow-50" : ""
                  }`}
                  placeholder="0,00"
                  inputMode="decimal"
                  value={valueText[i] ?? ""}
                  onChange={(e) => {
                    const txt = e.target.value;
                    setValueText((prev) => {
                      const next = [...prev];
                      next[i] = txt;
                      return next;
                    });
                    const num = parseMoneyToNumber(txt);
                    setCosts((prev) => {
                      const next = [...prev];
                      next[i] = { ...next[i], valueNet: num };
                      return next;
                    });
                  }}
                  onBlur={() => {
                    setValueText((prev) => {
                      const next = [...prev];
                      const v = costs[i]?.valueNet ?? null;
                      next[i] = v == null ? "" : formatMoney(v);
                      return next;
                    });
                  }}
                  onFocus={(e) => {
                    const num = costs[i]?.valueNet;
                    const raw = num == null ? "" : String(num).replace(".", ","); // snapshot
                    e.currentTarget.value = raw;
                    setValueText((prev) => {
                      const next = [...prev];
                      next[i] = raw;
                      return next;
                    });
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-end">
          <div className={`text-sm mr-2 ${msg ? "text-gray-700" : "text-gray-500"}`}>
            {msg}
          </div>
          <button
            onClick={save}
            disabled={!anyDirty || saving}
            className={
              "rounded px-3 py-1 " +
              (anyDirty
                ? "border border-red-500 text-white bg-red-600 hover:bg-red-700"
                : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50")
            }
            title={
              anyDirty
                ? "Masz niezapisane zmiany kosztów"
                : "Brak zmian do zapisania"
            }
          >
            Zapisz koszty
          </button>
        </div>
      </div>
    </div>
  );
}
