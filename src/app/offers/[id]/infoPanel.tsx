// src/app/offers/[id]/infoPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCancelStatus, SoftBlock } from "./cancelGuard";

type AttentionLevel = "NONE" | "YELLOW" | "RED";

function loadLocal(offerId: string): { level: AttentionLevel; note: string } {
  try {
    const raw = localStorage.getItem(`offer:attention:${offerId}`);
    if (!raw) return { level: "NONE", note: "" };
    const p = JSON.parse(raw);
    const level: AttentionLevel = p?.level === "YELLOW" || p?.level === "RED" ? p.level : "NONE";
    const note = typeof p?.note === "string" ? p.note : "";
    return { level, note };
  } catch {
    return { level: "NONE", note: "" };
  }
}

function saveLocal(offerId: string, data: { level: AttentionLevel; note: string }) {
  try {
    localStorage.setItem(`offer:attention:${offerId}`, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("offer-attention-updated", { detail: { offerId, ...data } }));
  } catch { }
}

export default function InfoPanel({ offerId }: { offerId: string }) {
  const [note, setNote] = useState("");
  const [baseline, setBaseline] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [attentionLevel, setAttentionLevel] = useState<AttentionLevel>("NONE");
  const [attentionNote, setAttentionNote] = useState<string>("");

  const { isCancelled } = useCancelStatus(String(offerId));

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch(`/api/offers/${offerId}/note`, { cache: "no-store" });
        if (!r.ok) throw new Error(await r.text());
        const data = await r.json();
        const txt = String(data?.note || "");
        if (!cancel) { setNote(txt); setBaseline(txt); }
      } catch { if (!cancel) { setNote(""); setBaseline(""); } }
    })();

    try {
      const { level, note } = loadLocal(offerId);
      setAttentionLevel(level);
      setAttentionNote(note);
    } catch { }

    return () => { cancel = true; };
  }, [offerId]);

  const dirty = useMemo(() => note !== baseline, [note, baseline]);

  async function saveNote() {
    try {
      setSaving(true);
      const payload = { note: (note || "").trim() || null };
      const r = await fetch(`/api/offers/${offerId}/note`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error(await r.text());
      setBaseline(note);
      setMsg("Zapisano notatkę"); setTimeout(() => setMsg(null), 1200);
      setToast({ type: "success", text: "Zapisano notatkę" }); setTimeout(() => setToast(null), 1500);
    } catch (e: any) {
      setMsg(e?.message || "Błąd zapisu notatki");
      setToast({ type: "error", text: e?.message || "Błąd zapisu notatki" }); setTimeout(() => setToast(null), 2500);
    } finally {
      setSaving(false);
    }
  }

  function updateAttention(level: AttentionLevel) {
    setAttentionLevel(level);
    const next = { level, note: attentionNote };
    saveLocal(offerId, next);
  }

  function updateAttentionNote(v: string) {
    setAttentionNote(v);
    const next = { level: attentionLevel, note: v };
    saveLocal(offerId, next);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-2 space-y-3 text-[13px]">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-4 right-4 z-50 rounded px-3 py-2 text-sm shadow ${toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
            }`}
        >
          {toast.text}
        </div>
      )}

      <SoftBlock disabled={isCancelled}>
        <div className="rounded-md border border-gray-200 p-2">
          <div className="font-semibold mb-1">Flagi lokalne</div>
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => updateAttention("NONE")}
              className={`rounded px-2 py-1 border text-[12px] ${attentionLevel === "NONE" ? "border-gray-400 bg-gray-50 text-gray-700" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}>
              Brak
            </button>
            <button type="button" onClick={() => updateAttention("YELLOW")}
              className={`rounded px-2 py-1 border text-[12px] ${attentionLevel === "YELLOW" ? "border-yellow-500 bg-yellow-50 text-yellow-700" : "border-gray-300 bg-white text-gray-700 hover:bg-yellow-50"}`}>
              Żółty
            </button>
            <button type="button" onClick={() => updateAttention("RED")}
              className={`rounded px-2 py-1 border text-[12px] ${attentionLevel === "RED" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-300 bg-white text-gray-700 hover:bg-red-50"}`}>
              Czerwony
            </button>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[12px] text-gray-700">Krótka notatka (lokalna)</span>
              <input className="border rounded px-2 py-1 w-64" value={attentionNote} onChange={(e) => updateAttentionNote(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-md border border-gray-200 p-2">
          <div className="font-semibold mb-0">Notatka</div>
          <textarea
            rows={2}
            className={`w-full border rounded px-2 py-1.5 resize-vertical ${dirty ? "ring-1 ring-yellow-400 bg-yellow-50" : ""}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Dowolne informacje pomocnicze…"
          />
          <div className="mt-0 flex items-center justify-end gap-2">
            <div className={`text-[12px] ${msg ? "text-gray-700" : "text-gray-500"}`}>{msg}</div>
            <button
              onClick={saveNote}
              disabled={saving}
              className={
                "rounded px-2.5 py-1 " +
                (dirty ? "border border-red-500 text-white bg-red-600 hover:bg-red-700" : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50")
              }
              title={dirty ? "Masz niezapisane zmiany notatki" : "Brak zmian do zapisania"}
            >
              Zapisz notatkę
            </button>
          </div>
        </div>
      </SoftBlock>
    </div>
  );
}
