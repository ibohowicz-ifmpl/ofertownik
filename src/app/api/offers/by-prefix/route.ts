// src/app/api/offers/by-prefix/route.ts
import { NextResponse } from "next/server";

/**
 * GET /api/offers/by-prefix?offerNoPrefix=<PREFIKS>&limit=50
 * Zwraca listę ofert (id, offerNo) których numer zaczyna się od zadanego prefiksu.
 *
 * Implementacja "bezpieczna": jeśli nie mamy bezpośredniego dostępu do bazy,
 * delegujemy do istniejącego endpointu /api/offers (o ile istnieje), a następnie
 * filtrujemy wyniki po stronie serwera.
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const prefix = url.searchParams.get("offerNoPrefix") ?? "";
    const limitRaw = url.searchParams.get("limit") ?? "50";
    const limit = Math.max(1, Math.min(200, Number.parseInt(limitRaw, 10) || 50));

    if (!prefix) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    // spróbuj pobrać listę ofert z istniejącego endpointu
    // najpierw z parametrem search, potem bez (fallback)
    const origin = url.origin;
    const candidates = [
      `${origin}/api/offers?search=${encodeURIComponent(prefix)}`,
      `${origin}/api/offers`,
    ];

    let items: Array<{ id?: string; offerNo?: string }> = [];
    for (const u of candidates) {
      try {
        const r = await fetch(u, { cache: "no-store" });
        if (!r.ok) continue;
        const data: any = await r.json();
        const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        if (arr.length) {
          items = arr;
          break;
        } else {
          // nawet jeśli puste — zapamiętujemy i lecimy dalej (może drugi kandydat zwróci pełną listę)
          items = arr;
        }
      } catch {
        // ignoruj i próbuj dalej
      }
    }

    // filtr startsWith po offerNo
    const startsWith = (x: string | undefined) => typeof x === "string" && x.startsWith(prefix);
    const filtered = (items || []).filter((it: any) => startsWith(it?.offerNo));

    // zwróć max 'limit' rekordów z polami id, offerNo
    const result = filtered.slice(0, limit).map((it: any) => ({ id: it?.id, offerNo: it?.offerNo }));

    return NextResponse.json({ items: result }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e?.message || "Internal error" }, { status: 200 });
  }
}