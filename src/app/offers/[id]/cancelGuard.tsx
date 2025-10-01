// src/app/offers/[id]/cancelGuard.tsx
"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hook: status anulowania oferty.
 * Wspiera 2 formaty odpowiedzi API:
 *  A) { isCancelled, cancelledAt, reason }
 *  B) { cancelledAt, cancelReason }
 */
export function useCancelStatus(offerId: string) {
  const [isCancelled, setIsCancelled] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [cancelledAt, setCancelledAt] = useState<string | null>(null);

  async function fetchState() {
    try {
      if (!offerId) return;
      const bust = `t=${Date.now()}`;
      const r = await fetch(`/api/offers/${offerId}/cancel?${bust}`, { cache: "no-store" });
      if (!r.ok) throw new Error(await r.text());
      const data = await r.json();

      // A) nowy kształt
      if ("isCancelled" in data || "reason" in data) {
        const cancelled = Boolean(data?.isCancelled ?? data?.cancelledAt);
        setIsCancelled(cancelled);
        setReason(cancelled ? (data?.reason ?? data?.cancelReason ?? null) : null);
        setCancelledAt(cancelled ? (data?.cancelledAt ?? null) : null);
        return;
      }

      // B) stary kształt
      const cancelled = Boolean(data?.cancelledAt);
      setIsCancelled(cancelled);
      setReason(cancelled ? String(data?.cancelReason ?? "") || null : null);
      setCancelledAt(cancelled ? String(data?.cancelledAt ?? "") || null : null);
    } catch {
      setIsCancelled(false);
      setReason(null);
      setCancelledAt(null);
    }
  }

  useEffect(() => {
    fetchState();
  }, [offerId]);

  // Nasłuch globalnych eventów (po anulowaniu/przywróceniu i zapisach)
  useEffect(() => {
    const handler = (e: any) => {
      const id = String(e?.detail?.offerId ?? "");
      if (!id || id === offerId) fetchState();
    };
    const evts = [
      "offer-cancelled",
      "offer-data-saved",
      "offer-dates-saved",
      "offer-costs-saved",
      "offer-info-saved",
      "offer-cancel-status-refresh",
    ] as const;
    evts.forEach((n) => window.addEventListener(n, handler as EventListener));
    return () => evts.forEach((n) => window.removeEventListener(n, handler as EventListener));
  }, [offerId]);

  return { isCancelled, reason, cancelledAt, refresh: fetchState };
}

/** Lokalny (panelowy) baner – opcjonalny. */
export function CancelBanner({
  isCancelled,
  reason,
}: {
  isCancelled: boolean;
  reason?: string | null;
}) {
  if (!isCancelled) return null;
  return (
    <div className="mb-2 sticky top-0 z-30">
      <div className="rounded border border-amber-400 bg-amber-50 text-amber-900 px-3 py-2 text-sm">
        <b>Oferta anulowana.</b> Edycja pól jest wyłączona do czasu przywrócenia.
        {reason ? <span className="ml-1 opacity-80">Powód: {reason}</span> : null}
      </div>
    </div>
  );
}

/** GLOBALNY sticky baner (na górze strony edycji). */
export function StickyCancelBanner({
  isCancelled,
  reason,
  cancelledAt,
}: {
  isCancelled: boolean;
  reason?: string | null;
  cancelledAt?: string | null;
}) {
  if (!isCancelled) return null;
  return (
    <div className="sticky top-0 z-40">
      <div className="w-full border-b border-amber-300 bg-amber-50 text-amber-900">
        <div className="mx-auto max-w-5xl px-3 py-2 text-sm">
          <b>Oferta anulowana.</b> Edycja pól jest wyłączona do czasu przywrócenia.
          {cancelledAt ? (
            <span className="ml-2 opacity-80">
              (od {new Date(cancelledAt).toLocaleString("pl-PL")})
            </span>
          ) : null}
          {reason ? <span className="ml-2 opacity-80">Powód: {reason}</span> : null}
        </div>
      </div>
    </div>
  );
}

/** Miękka blokada interakcji dla dzieci (bez ostrzeżeń o `inert`). */
export function SoftBlock({
  disabled,
  children,
  className = "",
}: {
  disabled: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (disabled && ref.current) {
      const el = ref.current.querySelector<HTMLElement>(
        "[tabindex],button,input,select,textarea,a"
      );
      el?.blur();
    }
  }, [disabled]);

  return (
    <div className="relative">
      {disabled && (
        <div
          className="absolute inset-0 z-20 bg-white/40 pointer-events-none"
          aria-hidden="true"
        />
      )}
      <div
        ref={ref}
        aria-disabled={disabled || undefined}
        className={className + (disabled ? " pointer-events-none select-none opacity-60" : "")}
        onKeyDown={disabled ? (e) => e.preventDefault() : undefined}
      >
        {children}
      </div>
    </div>
  );
}
