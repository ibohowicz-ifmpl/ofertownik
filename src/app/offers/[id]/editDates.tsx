// src/app/offers/[id]/editDates.tsx
"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import { useCancelStatus, SoftBlock } from "./cancelGuard";
import { useRouter } from 'next/navigation';

type Props = {
  id: string;
  initialDates?: Record<string, string | null | undefined>;
};

const STEP_ORDER = [
  'WYSLANIE',
  'AKCEPTACJA',
  'WYKONANIE',
  'PROTOKOL_WYSLANY',
  'ODBIOR_PRAC',
  'PWF',
] as const;
type StepKey = typeof STEP_ORDER[number];

const STEP_LABEL: Record<StepKey, string> = {
  WYSLANIE: "Data wysłania",
  AKCEPTACJA: "Data akceptacji",
  WYKONANIE: "Data wykonania",
  PROTOKOL_WYSLANY: "Data protokołu",
  ODBIOR_PRAC: "Data odbioru prac",
  PWF: "Data PWF",
};

function normalizeDate(v: any): string {
  if (!v) return "";
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

function parseMilestones(data: any): Record<StepKey, string> {
  const out = {} as Record<StepKey, string>;
  if (Array.isArray(data?.items)) {
    for (const it of data.items) {
      let step = it?.step || it?.name || it?.code;
      // Normalizacja legacy: zamień wszelkie warianty na "AKCEPTACJA"
      if (
        typeof step === "string" &&
        ["AKCEPTACJA_ZLECENIE", "AKCEPTACJA ZLECENIE", "AKCEPTACJA-ZLECENIE"].includes(step.trim().toUpperCase())
      ) {
        step = "AKCEPTACJA";
      }
      const when =
        it?.occurredAt ??
        it?.occurred_at ??
        it?.date ??
        it?.occurred ??
        it?.at ??
        "";
      if (step && STEP_ORDER.includes(step)) out[step as StepKey] = normalizeDate(when);
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
  // miękka blokada
  const { isCancelled } = useCancelStatus(String(id));

  const router = useRouter();

  const initialNorm = useMemo(() => {
    const r: Record<StepKey, string> = {
      WYSLANIE: "",
      AKCEPTACJA: "",
      WYKONANIE: "",
      PROTOKOL_WYSLANY: "",
      ODBIOR_PRAC: "",
      PWF: "",
    };
    for (const k of STEP_ORDER) r[k] = normalizeDate(initialDates[k]);
    return r;
  }, [initialDates]);

  const [values, setValues] = React.useState<Record<StepKey, string>>(initialNorm);
  const [saved, setSaved] = React.useState<Record<StepKey, string>>(initialNorm);

  const dirtyKeys = STEP_ORDER.filter(
    (k) => (values[k] || "") !== (saved[k] || "")
  );
  const anyDirty = dirtyKeys.length > 0;

  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function refetch() {
    try {
      const bust = `t=${Date.now()}`;
      const res = await fetch(`/api/offers/${id}/milestones?${bust}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      // mapuj step -> occurredAt
      const nextValues: Record<StepKey, string> = {
        WYSLANIE: "",
        AKCEPTACJA: "",
        WYKONANIE: "",
        PROTOKOL_WYSLANY: "",
        ODBIOR_PRAC: "",
        PWF: "",
      };
      for (const it of Array.isArray(data?.items) ? data.items : []) {
        if (it?.step && it?.occurredAt && (nextValues as any)[it.step] !== undefined) {
          (nextValues as any)[it.step] = String(it.occurredAt);
        }
      }
      setValues(nextValues);
      setSaved(nextValues);
    } catch { }
  }
  useEffect(() => {
    refetch();
  }, [id]);

  function minFor(idx: number) {
    const prevKey = STEP_ORDER[idx - 1];
    return idx > 0 && values[prevKey] ? values[prevKey] : undefined;
  }

  // Funkcja do wyliczania disabled dla każdego kroku
  const isDisabled = (k: StepKey): boolean => {
    switch (k) {
      case "WYSLANIE":
        return false;
      case "AKCEPTACJA":
        return !(values["WYSLANIE"]?.length > 0);
      case "WYKONANIE":
        return !(values["AKCEPTACJA"]?.length > 0);
      case "PROTOKOL_WYSLANY":
        return false;
      case "ODBIOR_PRAC":
        return !(values["PROTOKOL_WYSLANY"]?.length > 0);
      case "PWF":
        return !(values["ODBIOR_PRAC"]?.length > 0);
      default:
        return false;
    }
  };

  async function saveDates() {
    try {
      if (!anyDirty || saving) return;
      setSaving(true);

      const payload = {
        replace: true,
        items: STEP_ORDER.map((step) => ({
          step,
          occurredAt: values[step] || '', // '' => usuń, YYYY-MM-DD => ustaw
        })),
      };
      console.log('[editDates] PUT payload:', payload);

      const res = await fetch(`/api/offers/${id}/milestones`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        cache: 'no-store',
      });

      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }

      // Po zapisie pobierz świeże dane i nadpisz stan formularza
      await refetch();
      router.refresh();

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
      {msg && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 rounded px-3 py-2 text-sm shadow ${msg.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
            }`}
        >
          {msg.text}
        </div>
      )}

      {/* bez lokalnego CancelBanner – sticky jest w page.tsx */}
      <SoftBlock disabled={isCancelled}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {STEP_ORDER.map((step, idx) => {
            const dirty = (values[step] || "") !== (saved[step] || "");
            const min = minFor(idx);
            return (
              <label key={step} className="grid gap-1">
                <span
                  className={`text-sm ${dirty ? "text-amber-700 font-medium" : "text-gray-700"
                    } ${isDisabled(step) ? "opacity-70" : ""}`}
                >
                  {STEP_LABEL[step as StepKey]}
                </span>
                <input
                  type="date"
                  className={`border rounded px-2 py-1 ${dirty ? "ring-1 ring-yellow-400 bg-yellow-50" : ""
                    } ${isDisabled(step) ? "bg-gray-50 text-gray-500 cursor-not-allowed" : ""}`}
                  value={values[step] || ""}
                  onChange={(e) =>
                    setValues((m) => ({ ...m, [step]: e.target.value }))
                  }
                  disabled={isDisabled(step) || saving}
                  min={min}
                  title={
                    isDisabled(step) ? "Najpierw uzupełnij wcześniejsze etapy" : ""
                  }
                />
                {values[step] && (
                  <button
                    type="button"
                    onClick={() => setValues((m) => ({ ...m, [step]: "" }))}
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
            title={
              anyDirty ? "Zapisz zmienione daty" : "Brak zmian do zapisania"
            }
          >
            {saving ? "Zapisywanie…" : "Zapisz daty"}
          </button>
        </div>
      </SoftBlock>
    </div>
  );
}
