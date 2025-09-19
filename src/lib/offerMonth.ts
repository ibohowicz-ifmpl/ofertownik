// src/lib/offerMonth.ts
/**
 * Wydobywa miesiąc w formacie "YYYY-MM" z numeru oferty (offerNo).
 * Obsługiwane wzorce:
 *  - YYYY-MM, YYYY/MM, YYYYMM
 *  - oraz warianty z dniem: YYYY-MM-DD, YYYY/MM/DD, YYYYMMDD
 */
export function extractOfferMonth(offerNo?: string | null): string | null {
  if (!offerNo) return null;
  const s = String(offerNo);

  // Szukamy pierwszego wystąpienia roku 20xx + miesiąca (01..12)
  // Przykłady, które złapie:
  //   2024-09, 2024/09, 202409, 2024-09-15, 2024/09/15, 20240915
  const re = /(20\d{2})[-/.]?([01]\d)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    const year = m[1];
    const mm = m[2];
    const mi = parseInt(mm, 10);
    if (mi >= 1 && mi <= 12) {
      return `${year}-${mm}`;
    }
  }
  return null;
}
