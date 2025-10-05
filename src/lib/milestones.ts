// src/lib/milestones.ts

/** Kanoniczne klucze kroków (legacy: AKCEPTACJA_ZLECENIE → AKCEPTACJA) */
export type MilestoneKey =
  | "WYSLANIE"
  | "AKCEPTACJA"
  | "WYKONANIE"
  | "PROTOKOL_WYSLANY"
  | "ODBIOR_PRAC"
  | "PWF";

/** Kolejność kroków (źródło prawdy) */
export const STEP_ORDER: MilestoneKey[] = [
  "WYSLANIE",
  "AKCEPTACJA",
  "WYKONANIE",
  "PROTOKOL_WYSLANY",
  "ODBIOR_PRAC",
  "PWF",
];

/** Etykiety do UI */
export const STEP_LABEL: Record<MilestoneKey, string> = {
  WYSLANIE: "Data wysłania",
  AKCEPTACJA: "Data akceptacji",
  WYKONANIE: "Data wykonania",
  PROTOKOL_WYSLANY: "Protokół wysłany",
  ODBIOR_PRAC: "Odbiór prac",
  PWF: "PWF",
};

/** Normalizacja kluczy z API/legacy do kanonu */
export function normStepKey(raw: string): MilestoneKey | null {
  const up = String(raw ?? "").trim().toUpperCase();
  const map: Record<string, MilestoneKey> = {
    WYSLANIE: "WYSLANIE",
    AKCEPTACJA: "AKCEPTACJA",
    AKCEPTACJA_ZLECENIE: "AKCEPTACJA",
    WYKONANIE: "WYKONANIE",
    PROTOKOL_WYSLANY: "PROTOKOL_WYSLANY",
    ODBIOR_PRAC: "ODBIOR_PRAC",
    PWF: "PWF",
  };
  return (map[up] as MilestoneKey) ?? null;
}

/** yyyy-mm-dd z Date / string */
export function toYMD(d: Date | string | null | undefined): string {
  if (!d) return "";
  if (typeof d === "string") return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export type ApiRow = { step: string; occurredAt: string | Date | null };

/** GET → stan UI (kanoniczny Record) */
export function parseFromApi(rows: ApiRow[]): Record<MilestoneKey, string> {
  const out: Partial<Record<MilestoneKey, string>> = {};
  for (const r of rows ?? []) {
    const k = normStepKey(r.step);
    if (!k) continue;
    const v = toYMD(r.occurredAt ?? "");
    if (v) out[k] = v;
  }
  // zawsze zwracamy pełny rekord z pustymi stringami
  const base: Record<MilestoneKey, string> = {
    WYSLANIE: "",
    AKCEPTACJA: "",
    WYKONANIE: "",
    PROTOKOL_WYSLANY: "",
    ODBIOR_PRAC: "",
    PWF: "",
  };
  return { ...base, ...(out as Record<MilestoneKey, string>) };
}

/** UI stan → payload PUT */
export function serializeToApi(
  state: Partial<Record<MilestoneKey, string>>,
  opts?: { replace?: boolean }
): { replace?: boolean; items: { step: MilestoneKey; occurredAt: string }[] } {
  const items = STEP_ORDER.flatMap((k) => {
    const val = (state?.[k] ?? "").trim();
    return val ? [{ step: k, occurredAt: val }] : [];
  });
  const payload: { replace?: boolean; items: { step: MilestoneKey; occurredAt: string }[] } = { items };
  if (opts?.replace) payload.replace = true;
  return payload;
}

/** Walidacja: każdy kolejny krok >= poprzedni */
export type MilestoneError = { step: MilestoneKey; message: string };

export function validateChronology(
  state: Partial<Record<MilestoneKey, string>>
): MilestoneError[] {
  const errs: MilestoneError[] = [];
  let prevDate: string | null = null;
  let prevStep: MilestoneKey | null = null;

  for (const step of STEP_ORDER) {
    const cur = (state[step] ?? "").trim();
    if (cur) {
      if (prevDate && cur < prevDate) {
        errs.push({
          step,
          message: `${STEP_LABEL[step]} nie może być wcześniejsza niż ${prevStep ? STEP_LABEL[prevStep] : "poprzedni etap"}.`,
        });
      }
      prevDate = cur;
      prevStep = step;
    }
  }
  return errs;
}

/** Czy można wyczyścić dany krok? Pozwalamy tylko "od końca" */
export function canClear(
  step: MilestoneKey,
  state: Partial<Record<MilestoneKey, string>>
): boolean {
  // ostatni wypełniony krok → true
  const filled = STEP_ORDER.filter((k) => (state[k] ?? "").trim());
  if (filled.length === 0) return step === "WYSLANIE"; // nic nie ma: wolno wyczyścić tylko 1.
  const last = filled[filled.length - 1];
  return last === step;
}

/** minimalna dozwolona data dla kroku = data poprzedniego kroku (jeśli jest) */
export function minFor(step: MilestoneKey, state: Partial<Record<MilestoneKey, string>>): string | undefined {
  const idx = STEP_ORDER.indexOf(step);
  if (idx <= 0) return undefined;
  const prev = STEP_ORDER[idx - 1];
  const d = (state[prev] ?? "").trim();
  return d || undefined;
}
