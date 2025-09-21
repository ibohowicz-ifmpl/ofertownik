// src/app/offers/[id]/editDates.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  id: string;
  initialDates?: Record<string, string | null | undefined>;
};

// Porządek kroków i etykiety
const STEP_ORDER = [
  "WYSLANIE",
  "AKCEPTACJA_ZLECENIE",
  "WYKONANIE",
  "PROTOKOL_WYSLANY",
  "ODBIOR_PRAC",
  "PWF",
] as const;
type Step = typeof STEP_ORDER[number];

const STEP_LABEL: Record<Step, string> = {
  WYSLANIE: "Data wysłania",
  AKCEPTACJA_ZLECENIE: "Data akceptacji",
  WYKONANIE: "Data wykonania",
  PROTOKOL_WYSLANY: "Data protokołu",
  ODBIOR_PRAC: "Data odbioru prac",
  PWF: "Data PWF",
};

// Normalizacja: "", "YYYY-MM-DD", ISO → "YYYY-MM-DD"
function normalizeDate(v: any): string {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

// Parsowanie odpowiedzi GET /milestones (płasko lub items[])
function parseMilestones(data: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(data?.items)) {
    for (const it of data.items) {
      const step = it?.step || it?.name || it?.code;
      const when =
        it?.occurredAt ??
        it?.occurred_at ??
        it?.date ??
        it?.occurred ??
        it?.at ??
        "";
      if (step) out[step] = normalizeDate(when);
    }
    return out;
  }
  if (data && typeof data === "object") {
    for (const k of STEP_ORDER) out[k] = normalizeDate((data as any)[k]);
    return out;
  }
  return out;
}

export default function EditDates({ id, initialDates = {} }: Props) {
  // Stan wejściowy → normalizacja
  const initialNorm = useMemo(() => {
    const r: Record<string, string> = {};
    for (const k of STEP_ORDER) r[k] = normalizeDate(initialDates[k]);
    return r;
  }, [initialDates]);

  const [dates, setDates] = useState<Record<string, string>>(initialNorm);
  const [saved, setSaved] = useState<Record<string, string>>(initialNorm);

  // Difflist
  const dirtyKeys = STEP_ORDER.filter((k) => (dates[k] || "") !== (saved[k] || ""));
  const anyDirty = dirtyKeys.length > 0;

  // Toast
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Refetch po montażu i po zapisie (źródło prawdy = backend)
  async function refetch() {
    try {
      const res = await fetch(`/api/offers/${id}/milestones`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const parsed = parseMilestones(data);
      setDates(parsed);
      setSaved(parsed);
    } catch {}
  }
  useEffect(() => {
    refetch();
  }, [id]);

  // Zależności między etapami: każdy kolejny wymaga wcześniejszego
  function minFor(idx: number) {
    const prevKey = STEP_ORDER[idx - 1];
    return idx > 0 && dates[prevKey] ? dates[prevKey] : undefined;
  }
  function enabledFor(idx: number) {
    return idx === 0 ? true : Boolean(dates[STEP_ORDER[idx - 1]]);
  }

  // Zapis całego obiektu — wysyłamy płasko + items[] + replace: true
  async function saveDates() {
    try {
      if (!anyDirty || saving) return;
      setSaving(true);

      const flatPayload: Record<string, string | null> = {};
      const items: Array<{ step: string; occurredAt: string }> = [];
      for (const k of STEP_ORDER) {
        const v = dates[k];
        flatPayload[k] = v ? v : null;
        if (v) items.push({ step: k, occurredAt: v });
      }

      const res = await fetch(`/api/offers/${id}/milestones`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // Wspieramy oba formaty + jawne "replace"
        body: JSON.stringify({ ...flatPayload, items, replace: true }),
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }

      await refetch(); // synchronizacja -> dirty znika
      // Powiadom inne panele
      window.dispatchEvent(new CustomEvent("offer-dates-saved", { detail: { offerId: id } }));

      setMsg({ type: "success", text: "Zapisano daty etapów." });
      setTimeout(() => setMsg(null), 1500);
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message || "Błąd zapisu dat." });
      setTimeout(() => setMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-3">
      {/* Toast */}
      {msg && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 rounded px-3 py-2 text-sm shadow ${
            msg.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="font-semibold mb-2">Daty etapów</div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {STEP_ORDER.map((step, idx) => {
          const dirty = (dates[step] || "") !== (saved[step] || "");
          const enabled = enabledFor(idx);
          const min = minFor(idx);

          return (
            <label key={step} className="grid gap-1">
              <span
                className={`text-sm ${
                  dirty ? "text-amber-700 font-medium" : "text-gray-700"
                } ${!enabled ? "opacity-70" : ""}`}
              >
                {STEP_LABEL[step as Step]}
              </span>
              <input
                type="date"
                className={`border rounded px-2 py-1 ${
                  dirty ? "ring-1 ring-yellow-400 bg-yellow-50" : ""
                } ${!enabled ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
                value={dates[step] || ""}
                onChange={(e) => setDates((m) => ({ ...m, [step]: e.target.value }))}
                disabled={!enabled || saving}
                min={min}
                title={enabled ? "" : "Najpierw uzupełnij wcześniejsze etapy"}
              />
              {/* Guzik czyszczenia pojedynczej daty */}
              {dates[step] && (
                <button
                  type="button"
                  onClick={() => setDates((m) => ({ ...m, [step]: "" }))}
                  className="justify-self-start text-xs text-gray-600 hover:text-gray-800 underline"
                  disabled={saving}
                >
                  Wyczyść
                </button>
              )}
            </label>
          );
        })}
      </div>

      {/* PRZYCISK ZAPISU DAT — czerwony tylko gdy są NIEZAPISANE zmiany */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <div className="text-sm text-gray-600">
          {anyDirty ? `Niezapisane daty: ${dirtyKeys.length}` : ""}
        </div>
        <button
          onClick={saveDates}
          disabled={!anyDirty || saving}
          aria-busy={saving}
          className={
            "rounded px-3 py-1 " +
            (anyDirty
              ? "border border-red-500 text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
              : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50")
          }
          title={anyDirty ? "Zapisz zmienione daty" : "Brak zmian do zapisania"}
        >
          {saving ? "Zapisywanie…" : "Zapisz daty"}
        </button>
      </div>
    </div>
  );
}
