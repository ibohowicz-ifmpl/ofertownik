// src/app/offers/DeletedToast.tsx
"use client";

import { useEffect, useState } from "react";

export default function DeletedToast() {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    try {
      const usp = new URLSearchParams(window.location.search);
      const msg = usp.get("msg");
      if (msg === "deleted") {
        setText("Usunięto ofertę");
        // wyczyść query param bez przeładowania
        usp.delete("msg");
        const next = window.location.pathname + (usp.toString() ? `?${usp.toString()}` : "");
        window.history.replaceState({}, "", next);
        const t = setTimeout(() => setText(null), 2000);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore
    }
  }, []);

  if (!text) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 rounded px-3 py-2 text-sm shadow bg-green-600 text-white"
    >
      {text}
    </div>
  );
}
