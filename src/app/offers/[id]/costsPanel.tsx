// src/app/offers/[id]/costsPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMoney, NUMERIC_CLS, toNumber } from "@/lib/format";
import { useCancelStatus, SoftBlock } from "./cancelGuard"; // ⬅️ bez CancelBanner

type CostItem = { id?: string; name: string; valueNet: number | null };

function normalizeItems(raw: any): CostItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((it: any) => {
    const name = String(it?.name ?? "").trim();
    const v = it?.valueNet;
    let valueNet: number | null = null;
    if (typeof v === "number") {
      valueNet = Number.isFinite(v) ? v : null;
    } else if (typeof v === "string") {
      const n = Number(v.replace(",", "."));
      valueNet = Number.isFinite(n) ? n : null;
    } else {
      valueNet = null;
    }
    return { id: it?.id, name, valueNet };
  });
}

export default function CostsPanel({ offerId }: { offerId: string }) {
  const { isCancelled } = useCancelStatus(String(offerId)); // ⬅️ tylko flaga

  const [costs, setCosts] = useState<CostItem[]>(
    Array.from({ length: 5 }, () => ({ name: "", valueNet: null }))
  );
  const [valueText, setValueText] = useState<string[]>(
    Array.from({ length: 5 }, () => "")
  );
  const [baseline, setBaseline] = useState<CostItem[]>(
    Array.from({ length: 5 }, () => ({ name: "", valueNet: null }))
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/offers/${offerId}/costs`, { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        const saved = normalizeItems(data?.items);
        const padded = saved
          .concat(
            Array.from({ length: Math.max(0, 5 - saved.length) }, () => ({
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

  const hasValueNoName = useMemo(
    () =>
      costs.some(
        (c) =>
          (c.valueNet !== null &&
            Number.isFinite(Number(c.valueNet)) &&
            Number(c.valueNet) !== 0) &&
          (c.name || "").trim() === ""
      ),
    [costs]
  );

  const sum = useMemo(
    () =>
      costs.reduce(
        (acc, c) =>
          acc + (Number.isFinite(Number(c.valueNet)) ? Number(c.valueNet) : 0),
        0
      ),
    [costs]
  );

  const canSave = !saving && anyDirty && !hasValueNoName;

  async function save() {
    try {
      if (!canSave) {
        setToast({
          type: "error",
          text: hasValueNoName
            ? "Uzupełnij nazwę przy wprowadzonych kwotach."
            : "Brak zmian do zapisania.",
        });
        setTimeout(() => setToast(null), 2000);
        return;
      }
      setSaving(true);

      const items = costs
        .slice(0, 5)
        .map((c) => {
          const name = (c.name || "").trim();
          const v =
            c.valueNet === null || !Number.isFinite(Number(c.valueNet))
              ? null
              : Number(Number(c.valueNet).toFixed(2));
          return { id: c.id, name, valueNet: v };
        })
        .filter((c) => c.name.length > 0);

      const payload = { items, replace: true };
      const r = await fetch(`/api/offers/${offerId}/costs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();

      const saved = normalizeItems(data?.items);
      const padded = saved
        .concat(
          Array.from({ length: Math.max(0, 5 - saved.length) }, () => ({
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
      setToast({ type: "success", text: "Zapisano koszty" });
      setTimeout(() => setToast(null), 1500);

      const sumNet = padded.reduce(
        (acc, it) => acc + (Number(it?.valueNet) || 0),
        0
      );
      window.dispatchEvent(
        new CustomEvent("offer-costs-saved", {
          detail: { offerId, sumNet },
        })
      );
    } catch (e: any) {
      setMsg(e?.message || "Błąd zapisu kosztów");
      setToast({
        type: "error",
        text: e?.message || "Błąd zapisu kosztów",
      });
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-3">
        {toast && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed bottom-4 right-4 z-50 rounded px-3 py-2 text-sm shadow ${
              toast.type === "success"
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.text}
          </div>
        )}

        {/* ⬇️ tylko SoftBlock – bez lokalnego CancelBanner */}
        <SoftBlock disabled={isCancelled}>
          <div className="flex items-center justify-between mb-1">
            <div className="font-semibold text-sm sm:text-base">Koszty (max 5)</div>
            <div className="text-xs sm:text-sm text-gray-800 font-semibold">
              Wartość kosztów:{" "}
              <span className={`font-bold ${NUMERIC_CLS}`}>{formatMoney(sum)}</span>
            </div>
          </div>

          <div className="grid gap-1.5">
            {Array.from({ length: 5 }).map((_, i) => {
              const item = costs[i] ?? { name: "", valueNet: null };
              const dirty = isRowDirty(i);
              const valuePresent =
                item.valueNet !== null &&
                Number.isFinite(Number(item.valueNet)) &&
                Number(item.valueNet) !== 0;
              const needsName = valuePresent && (item.name || "").trim() === "";
              return (
                <div key={i} className="flex items-center gap-1.5 w-full">
                  <input
                    className={`border rounded px-2 py-1 h-8 text-sm text-gray-700 grow min-w-[14rem] leading-tight placeholder:text-xs placeholder:text-gray-300 placeholder:opacity-70 ${
                      needsName
                        ? "ring-1 ring-red-400 bg-red-50"
                        : dirty
                        ? "ring-1 ring-yellow-400 bg-yellow-50"
                        : ""
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
                    title={needsName ? "Podaj nazwę dla wprowadzonej kwoty" : ""}
                  />
                  <input
                    className={`border rounded px-2 py-1 h-8 text-sm text-gray-700 w-32 sm:w-36 md:w-40 shrink-0 text-right tabular-nums leading-tight placeholder:text-xs placeholder:text-gray-300 placeholder:opacity-70 ${
                      dirty ? "ring-1 ring-yellow-400 bg-yellow-50" : ""
                    }`}
                    placeholder="0,00"
                    inputMode="decimal"
                    value={valueText?.[i] ?? ""}
                    onChange={(e) => {
                      const txt = e.target.value;
                      setValueText((prev) => {
                        const next = [...prev];
                        next[i] = txt;
                        return next;
                      });
                      const num = toNumber(txt);
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
                      const raw = num == null ? "" : String(num).replace(".", ",");
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

          <div className="mt-1 flex items-center justify-end">
            <div className={`text-xs sm:text-sm mr-2 ${msg ? "text-gray-700" : "text-gray-500"}`}>
              {msg}
            </div>
            <button
              onClick={save}
              disabled={!canSave}
              className={
                "rounded px-2.5 py-0.5 h-7 text-xs leading-none " +
                (canSave
                  ? "border border-red-500 text-white bg-red-600 hover:bg-red-700"
                  : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50")
              }
              title={
                hasValueNoName
                  ? "Uzupełnij nazwę przy wprowadzonych kwotach"
                  : anyDirty
                  ? "Zapisz zmiany kosztów"
                  : "Brak zmian do zapisania"
              }
            >
              Zapisz koszty
            </button>
          </div>
        </SoftBlock>
      </div>
    </div>
  );
}
