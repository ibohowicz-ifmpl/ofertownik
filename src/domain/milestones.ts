// src/domain/milestones.ts
export const STEP_ORDER = [
  'WYSLANIE',
  'AKCEPTACJA',
  'WYKONANIE',
  'PROTOKOL_WYSLANY',
  'ODBIOR_PRAC',
  'PWF',
] as const;

export type StepKey = typeof STEP_ORDER[number];

export const STEP_LABEL: Record<StepKey, string> = {
  WYSLANIE: 'Wysłanie',
  AKCEPTACJA: 'Akceptacja',
  WYKONANIE: 'Wykonanie',
  PROTOKOL_WYSLANY: 'Protokół',
  ODBIOR_PRAC: 'Odbiór prac',
  PWF: 'PWF',
};

// pomocnicze do formatowania
export const toYMD = (d: unknown) => {
  if (!d) return '';
  const t = typeof d === 'string' ? new Date(d) : (d as Date);
  return Number.isFinite(t.getTime()) ? t.toISOString().slice(0, 10) : '';
};
export const toNum = (v: unknown) => (v == null ? 0 : Number(v));
