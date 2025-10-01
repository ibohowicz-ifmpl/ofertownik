"use client";

import { useEffect, useMemo, useState } from "react";
import { useCancelStatus } from "./cancelGuard";

type Step =
  | "WYSLANIE"
  | "AKCEPTACJA_ZLECENIE"
  | "WYKONANIE"
  | "PROTOKOL_WYSLANY"
  | "ODBIOR_PRAC"
  | "PWF";

type MilestonesResponse =
  | Record<string, string>
  | { items?: Array<{ step?: string; occurredAt?: string }> }
  | { milestones?: Array<{ step?: string; occurredAt?: string }> };

const STEP_ORDER: Step[] = [
  "WYSLANIE",
  "AKCEPTACJA_ZLECENIE",
  "WYKONANIE",
  "PROTOKOL_WYSLANY",
  "ODBIOR_PRAC",
  "PWF",
];

const LABELS: Record<Step, string> = {
  WYSLANIE: "Wysłano ofertę",
  AKCEPTACJA_ZLECENIE: "Akceptacja (zlecenie)",
  WYKONANIE: "Wykonanie",
  PROTOKOL_WYSLANY: "Protokół wysłany",
  ODBIOR_PRAC: "Odbiór prac",
  PWF: "PWF",
};

function normalizeDateInput(v: any): string | "" {
  if (!v) return "";
  try {
    const s = String(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function toDatesRecord(resp: MilestonesResponse | null | undefined): Record<string, string> {
  if (!resp) return {};
  if (Array.isArray((resp as any).items)) {
    const out: Record<string, string> = {};
    for (const it of (resp as any).items as Array<any>) {
      const step = it?.step || it?.name || it?.code;
      const when = it?.occurredAt ?? it?.occurred_at ?? it?.date ?? it?.occurred ?? it?.at;
      if (step) out[step] = normalizeDateInput(when);
    }
    return out;
  }
  if (Array.isArray((resp as any).milestones)) {
    const out: Record<string, string> = {};
    for (const it of (resp as any).milestones as Array<any>) {
      const step = it?.step || it?.name || it?.code;
      const when = it?.occurredAt ?? it?.occurred_at ?? it?.date ?? it?.occurred ?? it?.at;
      if (step) out[step] = normalizeDateInput(when);
    }
    return out;
  }
  if (typeof resp === "object") {
    const out: Record<string, string> = {};
    for (const k of STEP_ORDER) out[k] = normalizeDateInput((resp as any)[k]);
    return out;
  }
  return {};
}

export default function StatusPanel({ offerId }: { offerId: string }) {
  const [dates, setDates] = useState<Record<string, string>>({});
  const { isCancelled } = useCancelStatus(offerId);

  // --- lokalny modal „Powód anulowania” ---
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [reasonInput, setReasonInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadMilestones() {
    try {
      const bust = `t=${Date.now()}`;
      const r = await fetch(`/api/offers/${offerId}/milestones?${bust}`, { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      setDates(toDatesRecord(data));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    loadMilestones();
  }, [offerId]);

  useEffect(() => {
    const handler = (e: any) => {
      const idFromEvent = e?.detail?.offerId;
      if (!idFromEvent || String(idFromEvent) === String(offerId)) {
        loadMilestones();
      }
    };
    const names = [
      "offer-data-saved",
      "offer-dates-saved",
      "offer-costs-saved",
      "offer-info-saved",
      "offer-cancelled",
    ] as const;
    names.forEach((n) => window.addEventListener(n, handler as EventListener));
    return () => names.forEach((n) => window.removeEventListener(n, handler as EventListener));
  }, [offerId]);

  const latestStep: Step | null = useMemo(() => {
    for (let i = STEP_ORDER.length - 1; i >= 0; i--) {
      const s = STEP_ORDER[i];
      if (dates[s] && dates[s] !== "") return s;
    }
    return null;
  }, [dates]);

  const statusText = latestStep ? LABELS[latestStep] : "Brak danych";
  const statusDate = latestStep ? dates[latestStep] : "";

  const hasAnyDate = useMemo(() => STEP_ORDER.some((s) => Boolean(dates[s])), [dates]);
  const hasOnlyWyslanie = useMemo(
    () =>
      Boolean(dates.WYSLANIE) &&
      !["AKCEPTACJA_ZLECENIE", "WYKONANIE", "PROTOKOL_WYSLANY", "ODBIOR_PRAC", "PWF"].some(
        (s) => Boolean((dates as any)[s])
      ),
    [dates]
  );
  // Można anulować: brak dat || tylko WYSLANIE (i nie jest już anulowana)
  const canCancel = useMemo(
    () => !isCancelled && (!hasAnyDate || hasOnlyWyslanie),
    [isCancelled, hasAnyDate, hasOnlyWyslanie]
  );

  // Styl przycisków
  const btnBase =
    "inline-flex items-center gap-1 rounded px-3 py-1 border transition-colors bg-white";
  const btnBlue =
    `${btnBase} border-blue-600 text-blue-700 hover:bg-blue-50 hover:border-blue-700 hover:text-blue-800`;
  const btnCancel =
    `${btnBase} border-blue-600 text-blue-700 hover:bg-orange-50 hover:border-orange-500 hover:text-orange-700`;

  // --- akcje ---
  async function sendCancel(reason: string) {
    setSubmitting(true);
    try {
      const r = await fetch(`/api/offers/${offerId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || null }),
      });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || `HTTP ${r.status}`);
      }
      window.dispatchEvent(new CustomEvent("offer-cancelled", { detail: { offerId } }));
      setShowCancelModal(false);
      setReasonInput("");
      await loadMilestones();
    } catch (e: any) {
      alert(e?.message || "Nie udało się anulować oferty.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRestore() {
    const ok = window.confirm("Przywrócić ofertę i odblokować edycję?");
    if (!ok) return;
    try {
      const r = await fetch(`/api/offers/${offerId}/cancel`, { method: "DELETE" });
      if (!r.ok) {
        const t = await r.text();
        throw new Error(t || `HTTP ${r.status}`);
      }
      window.dispatchEvent(new CustomEvent("offer-cancelled", { detail: { offerId } }));
      await loadMilestones();
    } catch (e: any) {
      alert(e?.message || "Nie udało się przywrócić oferty.");
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-3 space-y-2">
      <div className="font-semibold">Status</div>

      <div className="text-sm text-gray-700">
        Aktualny stan: <span className="font-medium">{statusText}</span>
        {statusDate ? <span> — {new Date(statusDate).toLocaleDateString("pl-PL")}</span> : null}
      </div>

      <div className="flex items-center gap-2 pt-1 flex-wrap">
        <a href="/offers" className={btnBlue}>
          Wróć do listy ofert
        </a>

        {isCancelled ? (
          <button
            type="button"
            onClick={handleRestore}
            className={btnBlue}
            title="Przywróć edycję oferty"
          >
            Przywróć ofertę
          </button>
        ) : canCancel ? (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className={btnCancel}
            title="Anuluj ofertę (zablokuje edycję)"
          >
            Anuluj ofertę
          </button>
        ) : null}
      </div>

      {/* Modal „Powód anulowania” */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => {
            if (e.key === "Escape") setShowCancelModal(false);
          }}
        >
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowCancelModal(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-[min(92vw,520px)] rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="px-4 py-3 border-b border-gray-200 font-semibold">
              Anulowanie oferty
            </div>
            <div className="p-4 space-y-2">
              <p className="text-sm text-gray-700">
                Opcjonalnie podaj powód anulowania (do 500 znaków). Zostanie pokazany w banerze
                i może pomóc zespołowi w dalszych działaniach.
              </p>
              <textarea
                className="w-full border rounded px-2 py-1.5 text-sm resize-vertical"
                rows={4}
                maxLength={500}
                value={reasonInput}
                onChange={(e) => setReasonInput(e.target.value)}
                placeholder="Np. klient wstrzymał projekt; zmiana zakresu; błąd w ofercie…"
                autoFocus
              />
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                className={`${btnBase} border-gray-300 text-gray-700 hover:bg-gray-50`}
                onClick={() => setShowCancelModal(false)}
                disabled={submitting}
              >
                Anuluj
              </button>
              <button
                type="button"
                className={`${btnCancel} disabled:opacity-60`}
                onClick={() => sendCancel(reasonInput)}
                disabled={submitting}
              >
                {submitting ? "Zapisywanie…" : "Potwierdź anulowanie"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
