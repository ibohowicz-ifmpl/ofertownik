// src/lib/format.ts

// Niełamliwa spacja do tysięcy (stabilne SSR/CSR, bez locale)
export function groupThousands(intRaw: string) {
  return intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
}

const SPACE_RE = /[ \u00A0\u202F]/g;

/** Parsuje liczby z inputów tekstowych (akceptuje spacje tysięcy i przecinek jako separator dziesiętny). */
export function toNumber(x: unknown): number | null {
  if (x == null) return null;
  if (typeof x === "number") return Number.isFinite(x) ? x : null;
  const cleaned = String(x).replace(SPACE_RE, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function formatMoney(n?: number | null) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const x = Math.round(Number(n) * 100) / 100;
  const [intRaw, fracRaw] = x.toFixed(2).split(".");
  return `${groupThousands(intRaw)},${fracRaw}`;
}

export function formatPercent(n?: number | null) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  const x = Math.round(Number(n) * 100) / 100;
  const [intRaw, fracRaw] = x.toFixed(2).split(".");
  return `${groupThousands(intRaw)},${fracRaw}%`;
}

// Przyjmij ISO string (albo Date -> konwertuj do ISO) i utnij do YYYY-MM-DD
export function formatISODate(d?: Date | string | null) {
  if (!d) return "—";
  const iso = typeof d === "string" ? d : d.toISOString();
  return /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10) : "—";
}

// Klasa do wyrównania cyfr w tabelach
export const NUMERIC_CLS = "tabular-nums text-right";
