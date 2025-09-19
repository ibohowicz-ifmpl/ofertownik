// src/app/offers/[id]/statusPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

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
  | { milestones?: Array<{ step?: string; occurredAt?: string }> }
  | null;

const STEP_ORDER: Step[] = [
  "WYSLANIE",
  "AKCEPTACJA_ZLECENIE",
  "WYKONANIE",
  "PROTOKOL_WYSLANY",
  "ODBIOR_PRAC",
  "PWF",
];

const STEP_LABEL: Record<Step, string> = {
  WYSLANIE: "Wysłano ofertę",
  AKCEPTACJA_ZLECENIE: "Akceptacja / zlecenie",
  WYKONANIE: "Wykonanie",
  PROTOKOL_WYSLANY: "Protokół wysłany",
  ODBIOR_PRAC: "Odebrano prace",
  PWF: "PWF",
};

function normalizeDateInput(v: any): string {
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(String(v));
  return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : "";
}

function extractMilestones(resp: MilestonesResponse): Record<string, string> {
  if (!resp) return {};
  if (Array.isArray((resp as any).items)) {
    const out: Record<string, string> = {};
    for (const it of (resp as any).items) {
      const s = it?.step;
      if (s) out[s] = normalizeDateInput(it?.occurredAt);
    }
    return out;
  }
  if (Array.isArray((resp as any).milestones)) {
    const out: Record<string, string> = {};
    for (const it of (resp as any).milestones) {
      const s = it?.step;
      if (s) out[s] = normalizeDateInput(it?.occurredAt);
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

  async function loadMilestones() {
    try {
      const bust = `t=${Date.now()}`;
      const url = `/api/offers/${offerId}/milestones?${bust}`;
      const m = await fetch(url, { cache: "no-store" }).then((r) => (r.ok ? r.json() : null));
      setDates(extractMilestones(m));
    } catch {
      // cicho
    }
  }

  useEffect(() => {
    loadMilestones();
  }, [offerId]);

  // Odśwież status po każdym udanym zapisie w panelach (dane/daty/koszty/notatka)
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
   ] as const;

   names.forEach((n) => window.addEventListener(n, handler as EventListener));
   return () => {
     names.forEach((n) => window.removeEventListener(n, handler as EventListener));
   };
 }, [offerId]);


  const latestStep: Step | null = useMemo(() => {
    for (let i = STEP_ORDER.length - 1; i >= 0; i--) {
      const s = STEP_ORDER[i];
      if (dates[s]) return s;
    }
    return null;
  }, [dates]);

  const statusText = latestStep ? STEP_LABEL[latestStep] : "Brak etapów";
  const statusDate = latestStep ? dates[latestStep] : "";

  const btnPrimary =
    "inline-flex items-center justify-center rounded px-3 py-1 border border-blue-500 text-white bg-blue-600 hover:bg-blue-700";

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-3 space-y-2">
      <div className="font-semibold">Status</div>

      <div className="text-sm text-gray-700">
        Aktualny stan: <span className="font-medium">{statusText}</span>
        {statusDate ? <span> — {new Date(statusDate).toLocaleDateString("pl-PL")}</span> : null}
      </div>

      <div className="pt-1">
        <a href="/offers" className={btnPrimary}>Wróć do listy ofert</a>
      </div>
    </div>
  );
}
