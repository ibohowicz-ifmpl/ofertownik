// src/app/offers/[id]/infoPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

export default function InfoPanel({ offerId }: { offerId: string }) {
  const [note, setNote] = useState("");
  const [baseline, setBaseline] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const dirty = useMemo(() => note !== baseline, [note, baseline]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch(`/api/offers/${offerId}/note`, { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        const txt = String(data?.note || "");
        if (!cancel) {
          setNote(txt);
          setBaseline(txt);
        }
      } catch {
        if (!cancel) {
          setNote("");
          setBaseline("");
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, [offerId]);

  async function saveNote() {
    try {
      setSaving(true);
      const payload = { note: (note || "").trim() || null };
      const r = await fetch(`/api/offers/${offerId}/note`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(await r.text());
      setBaseline(note);
      setMsg("Zapisano notatkę");
      setTimeout(() => setMsg(null), 1200);
      setToast({ type: "success", text: "Zapisano notatkę" });
      setTimeout(() => setToast(null), 1500);
    } catch (e: any) {
      setMsg(e?.message || "Błąd zapisu notatki");
      setToast({ type: "error", text: e?.message || "Błąd zapisu notatki" });
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-3">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 rounded px-3 py-2 text-sm shadow ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.text}
        </div>
      )}

      <div className="font-semibold mb-2">Notatka</div>

      <textarea
        rows={3}
        className={`w-full border rounded px-2 py-1 resize-vertical ${
          dirty ? "ring-1 ring-yellow-400 bg-yellow-50" : ""
        }`}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Dowolne informacje pomocnicze…"
      />

      <div className="mt-3 flex items-center justify-end">
        <div className={`text-sm mr-2 ${msg ? "text-gray-700" : "text-gray-500"}`}>{msg}</div>
        <button
          onClick={saveNote}
          disabled={saving}
          className={
            "rounded px-3 py-1 " +
            (dirty
              ? "border border-red-500 text-white bg-red-600 hover:bg-red-700"
              : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50")
          }
          title={dirty ? "Masz niezapisane zmiany notatki" : "Brak zmian do zapisania"}
        >
          Zapisz notatkę
        </button>
      </div>
    </div>
  );
}
