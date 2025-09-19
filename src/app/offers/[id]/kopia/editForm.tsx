// src/app/offers/[id]/editForm.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { toNumber, formatMoney } from "@/lib/format";

type EditFormProps = {
  id: string;
  initialFields: {
    offerNo: string;
    title: string;
    authorInitials: string;
    vendorOrderNo: string;
    contractor: string;
    valueNet: string; // liczba jako string lub ""
  };
};

// spacje: zwykłe + niełamliwe (dla parsera inputu)
const SPACE_RE = /[ \u00A0\u202F]/g;

// Pomocniczo: jeśli nie jest liczbą -> pusty string (do inputu)
function formatPL2ForInput(text: string): string {
  const n = toNumber(text.replace?.(SPACE_RE, "").replace?.(",", ".") ?? text);
  return n == null ? (text || "") : formatMoney(n);
}

export default function EditForm({ id, initialFields }: EditFormProps) {
  // sformatuj wejście (wartość netto z dwoma miejscami)
  const initialFormatted = useMemo(() => {
    return {
      ...initialFields,
      valueNet: formatPL2ForInput(initialFields.valueNet || ""),
    };
  }, [initialFields]);

  // stan edycji + pola + baseline
  const [editMode, setEditMode] = useState(false);
  const [fields, setFields] = useState({ ...initialFormatted });
  const [baseline, setBaseline] = useState({ ...initialFormatted });

  // reset po zmianie id
  useEffect(() => {
    const next = { ...initialFormatted };
    setFields(next);
    setBaseline(next);
    setEditMode(false);
  }, [id, initialFormatted]);

  const fieldsDirty =
    fields.offerNo !== baseline.offerNo ||
    fields.title !== baseline.title ||
    fields.authorInitials !== baseline.authorInitials ||
    fields.vendorOrderNo !== baseline.vendorOrderNo ||
    fields.contractor !== baseline.contractor ||
    (fields.valueNet || "") !== (baseline.valueNet || "");

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function save() {
    try {
      const payload = {
        offerNo: fields.offerNo.trim() || null,
        title: fields.title.trim() || null,
        authorInitials: fields.authorInitials.trim() || null,
        vendorOrderNo: fields.vendorOrderNo.trim() || null,
        contractor: fields.contractor.trim() || null,
        valueNet:
          fields.valueNet.trim() === ""
            ? null
            : Number(fields.valueNet.replace(SPACE_RE, "").replace(",", ".")),
      };

      const res = await fetch(`/api/offers/${id}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());

      // normalizacja: z powrotem do 2 miejsc, baseline = zapisany stan
      const normalized = {
        ...fields,
        valueNet: formatPL2ForInput(fields.valueNet || ""),
      };
      setFields(normalized);
      setBaseline(normalized);
      setEditMode(false);

      setToast({ type: "success", text: "Zapisano dane oferty." });
      setTimeout(() => setToast(null), 1500);
    } catch (e: any) {
      setToast({ type: "error", text: e?.message || "Błąd zapisu danych." });
      setTimeout(() => setToast(null), 3000);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-3">
      {/* Toast */}
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

      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">Dane oferty</div>
        <button
          type="button"
          onClick={() => setEditMode((v) => !v)}
          className={`rounded px-3 py-1 border ${
            editMode
              ? "border-blue-500 text-blue-700 bg-blue-50"
              : "border-gray-300 text-gray-700 bg-white"
          }`}
        >
          Edycja
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Nr oferty */}
        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Nr oferty</span>
          <input
            className={`border rounded px-2 py-1 ${
              editMode && fields.offerNo !== baseline.offerNo
                ? "ring-1 ring-yellow-400 bg-yellow-50"
                : ""
            }`}
            value={fields.offerNo}
            onChange={(e) => setFields((s) => ({ ...s, offerNo: e.target.value }))}
            disabled={!editMode}
          />
        </label>

        {/* Autor */}
        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Autor (inicjały)</span>
          <input
            className={`border rounded px-2 py-1 ${
              editMode && fields.authorInitials !== baseline.authorInitials
                ? "ring-1 ring-yellow-400 bg-yellow-50"
                : ""
            }`}
            value={fields.authorInitials}
            onChange={(e) => setFields((s) => ({ ...s, authorInitials: e.target.value }))}
            disabled={!editMode}
          />
        </label>

        {/* Tytuł */}
        <label className="md:col-span-2 grid gap-1">
          <span className="text-sm text-gray-700">Tytuł</span>
          <input
            className={`border rounded px-2 py-1 ${
              editMode && fields.title !== baseline.title
                ? "ring-1 ring-yellow-400 bg-yellow-50"
                : ""
            }`}
            value={fields.title}
            onChange={(e) => setFields((s) => ({ ...s, title: e.target.value }))}
            disabled={!editMode}
          />
        </label>

        {/* Wykonawca */}
        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Wykonawca</span>
          <input
            className={`border rounded px-2 py-1 ${
              editMode && fields.contractor !== baseline.contractor
                ? "ring-1 ring-yellow-400 bg-yellow-50"
                : ""
            }`}
            value={fields.contractor}
            onChange={(e) => setFields((s) => ({ ...s, contractor: e.target.value }))}
            disabled={!editMode}
          />
        </label>

        {/* Wartość netto */}
        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Wartość netto</span>
          <input
            className={`border rounded px-2 py-1 text-right tabular-nums ${
              editMode && (fields.valueNet || "") !== (baseline.valueNet || "")
                ? "ring-1 ring-yellow-400 bg-yellow-50"
                : ""
            }`}
            inputMode="decimal"
            placeholder="0,00"
            value={fields.valueNet}
            onFocus={(e) => {
              const n = toNumber(
                (fields.valueNet || "").replace(SPACE_RE, "").replace(",", ".")
              );
              const raw =
                n == null ? fields.valueNet || "" : String(n).replace(".", ",");
              e.currentTarget.value = raw;
            }}
            onBlur={(e) => {
              const n = toNumber(
                (e.currentTarget.value || "").replace(SPACE_RE, "").replace(",", ".")
              );
              const f = n == null ? "" : formatMoney(n);
              setFields((prev) => ({ ...prev, valueNet: f }));
            }}
            onChange={(e) => setFields((s) => ({ ...s, valueNet: e.target.value }))}
            disabled={!editMode}
          />
        </label>

        {/* Numer zlecenia */}
        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Numer zlecenia</span>
          <input
            className={`border rounded px-2 py-1 ${
              editMode && fields.vendorOrderNo !== baseline.vendorOrderNo
                ? "ring-1 ring-yellow-400 bg-yellow-50"
                : ""
            }`}
            value={fields.vendorOrderNo}
            onChange={(e) => setFields((s) => ({ ...s, vendorOrderNo: e.target.value }))}
            disabled={!editMode}
          />
        </label>
      </div>

      {/* PRZYCISK ZAPISU */}
      <div className="mt-3 flex items-center justify-end">
        <button
          type="button"
          onClick={save}
          disabled={!editMode}
          className={
            "rounded px-3 py-1 " +
            (editMode && fieldsDirty
              ? "border border-red-500 text-white bg-red-600 hover:bg-red-700"
              : "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50")
          }
          title={
            !editMode
              ? "Włącz edycję, aby zapisać"
              : fieldsDirty
              ? "Zapisz zmiany pól"
              : "Brak zmian do zapisania"
          }
        >
          Zapisz dane
        </button>
      </div>
    </div>
  );
}
