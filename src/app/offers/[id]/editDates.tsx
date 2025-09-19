// src/app/offers/[id]/editDates.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Step =
  | "WYSLANIE"
  | "AKCEPTACJA_ZLECENIE"
  | "WYKONANIE"
  | "PROTOKOL_WYSLANY"
  | "ODBIOR_PRAC"
  | "PWF";

const STEP_ORDER: Step[] = [
  "WYSLANIE",
  "AKCEPTACJA_ZLECENIE",
  "WYKONANIE",
  "PROTOKOL_WYSLANY",
  "ODBIOR_PRAC",
  "PWF",
];

const STEP_LABEL: Record<Step, string> = {
  WYSLANIE: "Data wysłania",
  AKCEPTACJA_ZLECENIE: "Data akceptacji",
  WYKONANIE: "Data wykonania",
  PROTOKOL_WYSLANY: "Data protokołu",
  ODBIOR_PRAC: "Data odbioru prac",
  PWF: "Data PWF",
};

function normalizeDateInput(v: any): string {
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(String(v));
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : "";
}

function toDatesRecordLoose(data: any): Record<string, string> {
  const arr = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.milestones)
    ? data.milestones
    : null;

  if (arr) {
    const out: Record<string, string> = {};
    for (const it of arr) {
      const step = it?.step || it?.name || it?.code;
      const when =
        it?.occurredAt ??
        it?.occurred_at ??
        it?.date ??
        it?.occurred ??
        it?.at;
      if (step) out[step] = normalizeDateInput(when);
    }
    return out;
  }

  if (data && typeof data === "object") {
    const out: Record<string, string> = {};
    for (const k of STEP_ORDER) out[k] = normalizeDateInput((data as any)[k]);
    return out;
  }

  return {};
}

export default function EditDates({
  offerId,
  initialDates,
}: {
  offerId: string;
  initialDates?: Record<string, string>;
}) {
  const startNormalized = useMemo(() => {
    const out: Record<string, string> = {};
    for (const k of STEP_ORDER) out[k] = normalizeDateInput((initialDates || {})[k]);
    return out;
  }, [initialDates]);

  const [dates, setDates] = useState<Record<string, string>>({ ...startNormalized });
  const [baseline, setBaseline] = useState<Record<string, string>>({ ...startNormalized });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const wyslanieEmpty = !dates.WYSLANIE; // ← warunek pokazywania „Usuń ofertę”

  async function refreshFromApi() {
    try {
      const bust = `t=${Date.now()}`;
      const r = await fetch(`/api/offers/${offerId}/milestones?${bust}`, { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      const rec = toDatesRecordLoose(data);
      setDates(rec);
      setBaseline(rec);
    } catch {}
  }

  useEffect(() => {
    refreshFromApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerId]);

  const dirtyKeys = STEP_ORDER.filter((k) => (dates[k] || "") !== (baseline[k] || ""));
  const anyDirty = dirtyKeys.length > 0;

  async function saveDates() {
    try {
      if (!anyDirty) return;
      setSaving(true);

      const payload: Record<string, string | null> = {};
      for (const step of STEP_ORDER) payload[step] = dates[step] ? dates[step] : null;

      const res = await fetch(`/api/offers/${offerId}/milestones`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status} ${res.statusText}`);
      }

      await refreshFromApi();

      setMsg("Zapisano daty etapów.");
      setTimeout(() => setMsg(null), 1200);

      setToast({ type: "success", text: "Zapisano daty etapów" });
      setTimeout(() => setToast(null), 1500);

      // 🔔 powiadom StatusPanel (i inne)
      window.dispatchEvent(new CustomEvent("offer-dates-saved", { detail: { offerId } }));
    } catch (e: any) {
      setMsg(e?.message || "Błąd zapisu dat.");
      setToast({ type: "error", text: e?.message || "Błąd zapisu dat" });
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function deleteOffer() {
    try {
      if (!wyslanieEmpty) return; // zabezpieczenie
      if (!confirm("Na pewno usunąć tę ofertę? Operacja nieodwracalna.")) return;

      const res = await fetch(`/api/offers/${offerId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());

      // opcjonalny toast (i tak zaraz redirect)
      setToast({ type: "success", text: "Usunięto ofertę" });
      // redirect do listy
      window.location.href = "/offers?msg=deleted";
    } catch (e: any) {
      setToast({ type: "error", text: e?.message || "Nie udało się usunąć oferty" });
      setTimeout(() => setToast(null), 2500);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-3">
      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 rounded px-3 py-2 text-sm shadow
            ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}
        >
          {toast.text}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Daty etapów</div>

        {/* 🔴 Usuń ofertę – tylko gdy brak daty wysłania */}
        {wyslanieEmpty && (
          <button
            onClick={deleteOffer}
            className="rounded px-3 py-1 border text-orange-600 border-orange-400 bg-white
				hover:bg-red-600 hover:border-red-600 hover:text-white
				transition-colors"
            title="Usuń ofertę (dostępne tylko dopóki nie wysłano oferty)"
          >
            Usuń ofertę
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {STEP_ORDER.map((step, idx) => {
          const enabled = idx === 0 ? true : Boolean(dates[STEP_ORDER[idx - 1]]);
          const dirty = (dates[step] || "") !== (baseline[step] || "");
          const min = idx > 0 && dates[STEP_ORDER[idx - 1]] ? dates[STEP_ORDER[idx - 1]] : undefined;

          return (
            <label key={step} className="grid gap-1">
              <span
                className={`text-sm ${dirty ? "text-amber-700 font-medium" : "text-gray-700"} ${
                  !enabled ? "opacity-70" : ""
                }`}
              >
                {STEP_LABEL[step]}
              </span>
              <input
                type="date"
                className={`border rounded px-2 py-1 ${
                  dirty ? "ring-1 ring-yellow-400 bg-yellow-50 " : ""
                } ${!enabled ? "bg-gray-50 text-gray-500 cursor-not-allowed " : ""}`}
                value={dates[step] || ""}
                onChange={(e) => setDates((m) => ({ ...m, [step]: e.target.value }))}
                disabled={!enabled}
                min={min}
                title={enabled ? "" : "Najpierw uzupełnij wcześniejsze etapy"}
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
          onClick={saveDates}
          disabled={!anyDirty || saving}
          className={
            "rounded px-3 py-1 " +
            (anyDirty
              ? "border border-red-500 text-white bg-red-600 hover:bg-red-700"
              : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50")
          }
          title={anyDirty ? "Zapisz zmienione daty" : "Brak zmian do zapisania"}
        >
          Zapisz daty
        </button>
      </div>
    </div>
  );
}
