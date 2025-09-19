// src/app/offers/[id]/editForm.tsx
"use client";
import { useState } from "react";

export default function EditOfferForm(p: {
  id: string;
  vendorOrderNo: string;
  contractor: string;
  valueNet: string;
  wartoscKosztow: string;
}) {
  const [vendorOrderNo, setVendorOrderNo] = useState(p.vendorOrderNo);
  const [contractor, setContractor] = useState(p.contractor);
  const [valueNet, setValueNet] = useState(p.valueNet);
  const [wartoscKosztow, setWartoscKosztow] = useState(p.wartoscKosztow);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveFields() {
    setSaving(true); setMsg(null);
    try {
      const res = await fetch(`/api/offers/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorOrderNo, contractor, valueNet, wartoscKosztow }),
      });
      if (!res.ok) throw new Error(await res.text());
      setMsg("Zapisano pola ✔");
    } catch (e: any) {
      setMsg(e?.message || "Błąd");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1">
        <span>Nr zlecenia dla dostawcy</span>
        <input className="border rounded px-2 py-1" value={vendorOrderNo} onChange={e=>setVendorOrderNo(e.target.value)} />
      </label>
      <label className="grid gap-1">
        <span>Wykonawca / Oferent</span>
        <input className="border rounded px-2 py-1" value={contractor} onChange={e=>setContractor(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1">
          <span>Wartość netto</span>
          <input className="border rounded px-2 py-1" value={valueNet} onChange={e=>setValueNet(e.target.value)} inputMode="decimal" />
        </label>
        <label className="grid gap-1">
          <span>Wartość kosztów</span>
          <input className="border rounded px-2 py-1" value={wartoscKosztow} onChange={e=>setWartoscKosztow(e.target.value)} inputMode="decimal" />
        </label>
      </div>
      <div>
        <button className="border rounded px-3 py-1 hover:bg-gray-100 disabled:opacity-50" disabled={saving} onClick={saveFields}>
          {saving ? "Zapisywanie..." : "Zapisz pola"}
        </button>
        {msg && <span className="ml-3 text-sm text-gray-600">{msg}</span>}
      </div>
    </div>
  );
}
