// src/app/offers/[id]/editPanel.tsx — wersja prawdy + styl przycisku „Edytuj” spójny ze StatusPanel (niebieski na białym tle)
"use client";

import { useEffect, useMemo, useState } from "react";
import { toNumber, formatMoney, formatPercent, NUMERIC_CLS } from "@/lib/format";
import { useCancelStatus, SoftBlock } from "./cancelGuard";
import { useRouter } from "next/navigation";

function formatPL2(text: string): string {
  const n = toNumber(text);
  return n == null ? text || "" : formatMoney(n);
}

type EditPanelProps = {
  id: string;
  initialFields: {
    offerNo: string;
    title: string;
    authorInitials: string;
    vendorOrderNo: string;
    contractor: string;
    valueNet: string;
    wartoscKosztow?: string;
  };
  // initialDates usuwamy z props, jeśli nie jest już używane
};

export default function EditPanel({
  id,
  initialFields,
}: EditPanelProps) {
  // status anulowania
  const { isCancelled } = useCancelStatus(String(id));
  const router = useRouter();

  // ======= Pola oferty =======
  const initialFieldsFormatted = useMemo(
    () => ({ ...initialFields, valueNet: formatPL2(initialFields.valueNet || "") }),
    [initialFields]
  );
  const [editMode, setEditMode] = useState(false);
  const [fields, setFields] = useState({ ...initialFieldsFormatted });
  const [fieldsBaseline, setFieldsBaseline] = useState({ ...initialFieldsFormatted });
  const [savingFields, setSavingFields] = useState(false);

  useEffect(() => {
    const next = { ...initialFieldsFormatted };
    setFields(next);
    setFieldsBaseline(next);
    setEditMode(false);
  }, [id, initialFieldsFormatted]);

  const fieldsDirty =
    fields.title !== fieldsBaseline.title ||
    fields.authorInitials !== fieldsBaseline.authorInitials ||
    fields.vendorOrderNo !== fieldsBaseline.vendorOrderNo ||
    fields.contractor !== fieldsBaseline.contractor ||
    (fields.valueNet || "") !== (fieldsBaseline.valueNet || "");

  // ======= KPI =======
  const [costsSum, setCostsSum] = useState<number>(0);

  async function refreshCostsSum() {
    try {
      const r = await fetch(`/api/offers/${id}/costs`, { cache: "no-store" });
      if (!r.ok) return;
      const data = await r.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const sum = items.reduce((acc: number, it: any) => acc + (Number(it?.valueNet) || 0), 0);
      setCostsSum(sum);
    } catch { }
  }

  useEffect(() => {
    refreshCostsSum();
  }, [id]);

  useEffect(() => {
    function onCostsSaved(e: any) {
      try {
        const det = e?.detail || {};
        if (det.offerId !== id) return;
        if (typeof det.sumNet === "number") setCostsSum(det.sumNet);
        else refreshCostsSum();
      } catch {
        refreshCostsSum();
      }
    }
    window.addEventListener("offer-costs-saved", onCostsSaved);
    return () => window.removeEventListener("offer-costs-saved", onCostsSaved);
  }, [id]);

  const valueNetNumber = (() => {
    const n = toNumber(fields.valueNet);
    return n == null ? 0 : n;
  })();
  const profit = Math.max(0, valueNetNumber - costsSum);
  const margin = valueNetNumber > 0 ? (profit / valueNetNumber) * 100 : 0;
  const marginClass =
    margin > 0
      ? margin < 5
        ? "text-red-600"
        : margin < 14
          ? "text-orange-500"
          : "text-gray-900"
      : "text-gray-900";

  // ======= Zapisy / komunikaty =======
  const [saveMsg, setSaveMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function saveFieldsOnly() {
    try {
      if (!editMode || !fieldsDirty) return; // nic do zapisania / brak edycji
      setSavingFields(true);

      const payloadFields = {
        // wymuszamy niezmienność numeru oferty – zawsze wysyłamy baseline
        offerNo: (fieldsBaseline.offerNo || "").trim() || null,
        title: fields.title.trim() || null,
        authorInitials: fields.authorInitials.trim() || null,
        vendorOrderNo: fields.vendorOrderNo.trim() || null,
        contractor: fields.contractor.trim() || null,
        valueNet:
          fields.valueNet.trim() === "" ? null : toNumber(fields.valueNet),
      };
      const r1 = await fetch(`/api/offers/${id}/fields`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFields),
      });
      if (!r1.ok) throw new Error(await r1.text());

      const normalized = { ...fields, valueNet: formatPL2(fields.valueNet || "") };
      setFields(normalized);
      setFieldsBaseline(normalized);
      setEditMode(false); // po zapisie wracamy do neutralnego

      setSaveMsg({ text: "Zapisano dane oferty.", type: "success" });
      setTimeout(() => setSaveMsg(null), 1500);

      window.dispatchEvent(
        new CustomEvent("offer-data-saved", { detail: { offerId: String(id) } })
      );
    } catch (e: any) {
      setSaveMsg({ text: e?.message || "Błąd zapisu danych.", type: "error" });
      setTimeout(() => setSaveMsg(null), 2500);
    } finally {
      setSavingFields(false);
    }
  }

  // Usuwanie oferty (tylko gdy brak daty wysłania)
  async function deleteOffer() {
    try {
      const ok = window.confirm("Na pewno usunąć ofertę? Tej operacji nie można cofnąć.");
      if (!ok) return;
      const res = await fetch(`/api/offers/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      router.push("/offers");
    } catch (e: any) {
      alert(e?.message || "Nie udało się usunąć oferty.");
    }
  }

  // ======= Widok =======

  // spójne style guzików (niebieskie na białym tle)
  const btnBlueOutline =
    "inline-flex items-center gap-1 rounded px-3 py-1 border transition-colors " +
    "border-blue-600 text-blue-700 bg-white hover:bg-blue-50 hover:border-blue-700 hover:text-blue-800";
  const btnBlueActive =
    "inline-flex items-center gap-1 rounded px-3 py-1 border transition-colors " +
    "border-blue-700 text-blue-800 bg-blue-50";

  // Pobierz daty etapów (milestones) z API, aby sprawdzić czy można pokazać przycisk Usuń ofertę
  const [hasLaterMilestone, setHasLaterMilestone] = useState(false);

  useEffect(() => {
    async function checkMilestones() {
      try {
        const res = await fetch(`/api/offers/${id}/milestones`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        // Szukamy czy istnieje data dla AKCEPTACJA lub późniejszych kroków
        const steps = ["AKCEPTACJA", "WYKONANIE", "PROTOKOL_WYSLANY", "ODBIOR_PRAC", "PWF"];
        const found = (data.items || []).some((m: any) =>
          steps.includes(m.step) && m.occurredAt
        );
        setHasLaterMilestone(found);
      } catch {
        setHasLaterMilestone(false);
      }
    }
    checkMilestones();

    // Dodaj nasłuchiwanie na offer-dates-saved
    function onDatesSaved(e: any) {
      if (e?.detail?.offerId === id) checkMilestones();
    }
    window.addEventListener("offer-dates-saved", onDatesSaved);
    return () => window.removeEventListener("offer-dates-saved", onDatesSaved);
  }, [id]);

  // Pobierz informację o kosztach oferty, by zablokować przycisk Usuń ofertę jeśli istnieją koszty
  const [hasCosts, setHasCosts] = useState(false);

  useEffect(() => {
    async function checkCosts() {
      try {
        const res = await fetch(`/api/offers/${id}/costs`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        const found = Array.isArray(data?.items) && data.items.length > 0;
        setHasCosts(found);
      } catch {
        setHasCosts(false);
      }
    }
    checkCosts();

    // Odświeżaj po zmianie kosztów
    function onCostsSaved(e: any) {
      if (e?.detail?.offerId === id) checkCosts();
    }
    window.addEventListener("offer-costs-saved", onCostsSaved);
    return () => window.removeEventListener("offer-costs-saved", onCostsSaved);
  }, [id]);

  return (
    <SoftBlock disabled={isCancelled}>
      <div className="space-y-4">
        {saveMsg && (
          <div
            role="status"
            aria-live="polite"
            className={`fixed bottom-4 right-4 z-50 rounded px-3 py-2 text-[13px] shadow ${saveMsg.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
              }`}
          >
            {saveMsg.text}
          </div>
        )}

        {/* Dane oferty */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Dane oferty</div>
            <div className="flex items-center gap-2">
              {/* Przycisk Usuń ofertę – widoczny tylko jeśli NIE ma daty akceptacji ani późniejszych */}
              {!hasLaterMilestone && (
                <button
                  type="button"
                  onClick={hasCosts ? undefined : deleteOffer}
                  className={`inline-flex items-center gap-1 rounded px-3 py-1 border border-red-600 text-red-700 bg-white hover:bg-red-50 ${hasCosts ? "opacity-60 cursor-not-allowed" : ""}`}
                  disabled={isCancelled || hasCosts}
                  title={hasCosts ? "Istnieją koszty do tej oferty" : "Usuń ofertę"}
                >
                  Usuń ofertę
                </button>
              )}
              {/* Przycisk Edytuj */}
              <button
                type="button"
                aria-pressed={editMode}
                onClick={() => setEditMode((v) => !v)}
                className={editMode ? btnBlueActive : btnBlueOutline}
                title={editMode ? "Wyłącz tryb edycji" : "Włącz tryb edycji"}
              >
                Edytuj
              </button>
            </div>
          </div>

          {/* ciaśniej w poziomie, komfort w pionie */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-3">
            <label className="grid gap-0.5">
              <span className="text-[12px] leading-tight text-gray-700">Nr oferty</span>
              <input
                className={`border rounded px-2 py-1 text-blue-700 bg-gray-100`}
                value={fieldsBaseline.offerNo}
                readOnly
              />
            </label>

            <label className="grid gap-0.5">
              <span className="text-[12px] leading-tight text-gray-700">Autor (inicjały)</span>
              <input
                className={`border rounded px-2 py-1 ${editMode
                  ? "bg-yellow-50 ring-1 ring-yellow-200"
                  : ""
                  } ${editMode && fields.authorInitials !== fieldsBaseline.authorInitials ? "ring-1 ring-yellow-400" : ""}`}
                value={fields.authorInitials}
                onChange={(e) => setFields((s) => ({ ...s, authorInitials: e.target.value }))}
                disabled={!editMode}
              />
            </label>

            <label className="md:col-span-2 grid gap-0.5">
              <span className="text-[12px] leading-tight text-gray-700">Tytuł</span>
              <input
                className={`border rounded px-2 py-1 text-blue-700 ${editMode
                  ? "bg-yellow-50 ring-1 ring-yellow-200"
                  : ""
                  } ${editMode && fields.title !== fieldsBaseline.title ? "ring-1 ring-yellow-400" : ""}`}
                value={fields.title}
                onChange={(e) => setFields((s) => ({ ...s, title: e.target.value }))}
                disabled={!editMode}
              />
            </label>

            <label className="grid gap-0.5">
              <span className="text-[12px] leading-tight text-gray-700">Wykonawca</span>
              <input
                className={`border rounded px-2 py-1 ${editMode
                  ? "bg-yellow-50 ring-1 ring-yellow-200"
                  : ""
                  } ${editMode && fields.contractor !== fieldsBaseline.contractor ? "ring-1 ring-yellow-400" : ""}`}
                value={fields.contractor}
                onChange={(e) => setFields((s) => ({ ...s, contractor: e.target.value }))}
                disabled={!editMode}
              />
            </label>

            <label className="grid gap-0.5">
              <span className="text-[12px] leading-tight text-gray-700">Wartość netto</span>
              <input
                className={`border rounded px-2 py-1 text-right ${NUMERIC_CLS} ${editMode
                  ? "bg-yellow-50 ring-1 ring-yellow-200"
                  : ""
                  } ${editMode && (fields.valueNet || "") !== (fieldsBaseline.valueNet || "") ? "ring-1 ring-yellow-400" : ""}`}
                inputMode="decimal"
                value={fields.valueNet}
                onBlur={(e) => {
                  const n = toNumber(e.currentTarget.value);
                  if (n != null) setFields((prev) => ({ ...prev, valueNet: formatMoney(n) }));
                }}
                onFocus={(e) => {
                  const n = toNumber(fields.valueNet);
                  e.currentTarget.value = n != null ? String(n).replace(".", ",") : (fields.valueNet || "");
                }}
                onChange={(e) => setFields((s) => ({ ...s, valueNet: e.target.value }))}
                disabled={!editMode}
                placeholder="0,00"
              />
            </label>

            <label className="grid gap-0.5">
              <span className="text-[12px] leading-tight text-gray-700">Numer zlecenia</span>
              <input
                className={`border rounded px-2 py-1 ${editMode
                  ? "bg-yellow-50 ring-1 ring-yellow-200"
                  : ""
                  } ${editMode && fields.vendorOrderNo !== fieldsBaseline.vendorOrderNo ? "ring-1 ring-yellow-400" : ""}`}
                value={fields.vendorOrderNo}
                onChange={(e) => setFields((s) => ({ ...s, vendorOrderNo: e.target.value }))}
                disabled={!editMode}
              />
            </label>

            <label className="grid gap-0.5">
              <span className="text-[12px] leading-tight text-gray-700">Marża</span>
              <div className={`border rounded px-2 py-1 bg-gray-50 text-right font-semibold ${marginClass} ${NUMERIC_CLS}`}>
                {valueNetNumber > 0 ? formatPercent(margin) : "—"}
              </div>
            </label>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              onClick={saveFieldsOnly}
              disabled={!editMode || !fieldsDirty || savingFields}
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
      </div>
    </SoftBlock>
  );
}
