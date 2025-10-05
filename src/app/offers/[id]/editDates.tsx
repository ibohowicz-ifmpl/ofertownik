// src/app/offers/[id]/editDates.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useCancelStatus, SoftBlock } from "./cancelGuard";
import { type MilestoneKey } from "@/lib/milestones";

// Kroki – kanonicznie
const STEP_ORDER = [
  "WYSLANIE",
  "AKCEPTACJA",
  "WYKONANIE",
  "PROTOKOL_WYSLANY",
  "ODBIOR_PRAC",
  "PWF",
] as const;
type Step = typeof STEP_ORDER[number];

const STEP_LABEL: Record<Step, string> = {
  WYSLANIE: "Data wysłania",
  AKCEPTACJA: "Data akceptacji",
  WYKONANIE: "Data wykonania",
  PROTOKOL_WYSLANY: "Protokół wysłany",
  ODBIOR_PRAC: "Odbiór prac",
  PWF: "PWF",
};

// Alias legacy → kanon
const LEGACY_ALIAS: Record<string, MilestoneKey> = { AKCEPTACJA_ZLECENIE: "AKCEPTACJA" };

// Typy
type InitialRow = { step: MilestoneKey; occurredAt: string };
type EditDatesProps = {
  offerId: string;
  initialRows?: InitialRow[];
};

// Helper: [{step, occurredAt}] -> Record<Step, string>
function rowsToMap(
  rows: { step: string; occurredAt: string | Date | null | undefined }[] | undefined
): Record<Step, string> {
  const out = {} as Record<Step, string>;
  for (const step of STEP_ORDER) out[step] = "";
  for (const r of rows ?? []) {
    const step = (LEGACY_ALIAS[r.step as string] ?? r.step) as Step;
    const v = r.occurredAt
      ? (typeof r.occurredAt === "string"
        ? r.occurredAt.slice(0, 10)
        : new Date(r.occurredAt).toISOString().slice(0, 10))
      : "";
    if (STEP_ORDER.includes(step)) out[step] = v;
  }
  return out;
}

export default function EditDates({ offerId, initialRows }: EditDatesProps) {
  const { isCancelled } = useCancelStatus(String(offerId));

  // Stan: zawsze Record<Step, string>
  const [dates, setDates] = useState<Record<Step, string>>(() =>
    rowsToMap(initialRows)
  );
  const [saved, setSaved] = useState<Record<Step, string>>(() =>
    rowsToMap(initialRows)
  );
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // SSR preload tylko raz na starcie
  useEffect(() => {
    if (initialRows && initialRows.length > 0) {
      const map = rowsToMap(initialRows);
      setDates(map);
      setSaved(map);
    }
  }, [initialRows]);

  // Refetch – NO-CACHE, zawsze nadpisuje local state
  const refetch = useCallback(async () => {
    const res = await fetch(`/api/offers/${offerId}/milestones`, { cache: 'no-store' });
    const data = await res.json();
    // API: { ok, items, view }
    const map = rowsToMap(data.items);
    setDates(map);
    setSaved(map);
    setErrors([]);
  }, [offerId]);

  // Zapis
  const handleSaveClick: React.MouseEventHandler<HTMLButtonElement> = async (e) => {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    try {
      // Walidacja chronologii (prosta: daty rosnące)
      let prev = "";
      for (const step of STEP_ORDER) {
        const v = dates[step];
        if (v && prev && v < prev) {
          setErrors([`Chronologia naruszona: ${STEP_LABEL[step]} (${v}) < poprzedni krok (${prev})`]);
          setSaving(false);
          return;
        }
        if (v) prev = v;
      }

      // Wymuś uzupełnienie WYSLANIE przed kolejnymi krokami
      if (!dates.WYSLANIE && STEP_ORDER.some((k, i) => i > 0 && dates[k])) {
        setErrors(["Najpierw uzupełnij Wysłanie."]);
        setSaving(false);
        return;
      }

      // --- NOWA WALIDACJA: Nie pozwól usuwać daty ze środka ---
      // Jeśli jakakolwiek data jest pusta, a późniejszy krok ma datę, to błąd
      let foundEmpty = false;
      for (let i = 0; i < STEP_ORDER.length; ++i) {
        const k = STEP_ORDER[i];
        if (!dates[k]) foundEmpty = true;
        if (foundEmpty) {
          // jeśli po pierwszym pustym znajdziemy jakąkolwiek datę dalej, to błąd
          for (let j = i + 1; j < STEP_ORDER.length; ++j) {
            if (dates[STEP_ORDER[j]]) {
              setErrors(["Nie można usuwać daty ze środka – najpierw usuń późniejsze etapy."]);
              setSaving(false);
              return;
            }
          }
          break;
        }
      }

      // Przygotuj payload
      const items = STEP_ORDER
        .map((k) => ({ step: k, occurredAt: dates[k] }))
        .filter((it) => !!it.occurredAt);

      await fetch(`/api/offers/${offerId}/milestones`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ replace: true, items }),
        cache: 'no-store',
      }).then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setErrors(data.errors || ["Błąd zapisu"]);
          throw new Error("API error");
        }
      });

      await refetch();
      window.dispatchEvent(new CustomEvent("offer-dates-saved", { detail: { offerId } }));
      setMsg({ type: "success", text: "✓ Zapisano" });
      setTimeout(() => setMsg(null), 1200);
    } catch (e) {
      if (!errors.length) setMsg({ type: "error", text: (e as Error).message ?? "Nie udało się zapisać dat." });
    } finally {
      setSaving(false);
    }
  };

  // Dirty detection
  const dirtyKeys = STEP_ORDER.filter((k) => (dates[k] || "") !== (saved[k] || ""));
  const anyDirty = dirtyKeys.length > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-3">
      {msg && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 rounded px-3 py-2 text-sm shadow ${msg.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
        >
          {msg.text}
        </div>
      )}

      {errors.length > 0 && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2 mb-2">
          {errors.map((e, i) => (
            <div key={i}>• {e}</div>
          ))}
        </div>
      )}

      <SoftBlock disabled={isCancelled}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {STEP_ORDER.map((step, idx) => {
            const value = dates[step] ?? "";

            // min = data poprzedniego ustawionego kroku
            let prevDate = "";
            for (let i = idx - 1; i >= 0; --i) {
              const d = dates[STEP_ORDER[i]];
              if (d && d.trim()) {
                prevDate = d;
                break;
              }
            }

            const enabled = (idx === 0 ? true : Boolean((dates[STEP_ORDER[idx - 1]] ?? "").trim())) && !saving;

            return (
              <label key={step} className="grid gap-1">
                <span className="text-sm text-gray-700">{STEP_LABEL[step]}</span>
                <input
                  type="date"
                  value={value}
                  min={prevDate}
                  onChange={(e) => setDates((m) => ({ ...m, [step]: e.target.value }))}
                  className={`border rounded px-2 py-1 ${saving ? "opacity-60" : ""} ${enabled ? "" : "bg-gray-50 text-gray-500 cursor-not-allowed"}`}
                  disabled={!enabled}
                />
              </label>
            );
          })}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          <div className="text-sm text-gray-600">
            {anyDirty ? `Niezapisane daty: ${dirtyKeys.length}` : ""}
          </div>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={!anyDirty || saving}
            aria-busy={saving}
            className={
              "rounded px-3 py-1 " +
              (anyDirty
                ? "border border-red-500 text-white bg-red-600 hover:bg-red-700 disabled:opacity-60"
                : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50")
            }
            title={
              saving
                ? "Zapisywanie…"
                : anyDirty
                  ? "Zapisz zmienione daty"
                  : "Brak zmian do zapisania"
            }
          >
            {saving ? "Zapisywanie…" : msg?.type === "success" ? "✓ Zapisano" : "Zapisz daty"}
          </button>
        </div>
      </SoftBlock>
    </div>
  );
}

/*

## Events

- `offer-dates-saved` – emitowane po każdej zmianie dat etapów (milestones), np. po zapisie lub usunięciu daty.
  Używane do automatycznego odświeżania panelu statusu i innych komponentów zależnych od dat oferty.

*/
