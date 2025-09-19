// src/app/offers/new/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Client = { id: string; name: string };

export default function NewOfferPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");

  const [offerNo, setOfferNo] = useState("");
  const [title, setTitle] = useState("");
  const [authorInitials, setAuthorInitials] = useState("");
  const [contractor, setContractor] = useState("");
  const [valueNet, setValueNet] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/clients", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Client[]) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]));
  }, []);

  async function submit() {
    setMsg(null);
    setSaving(true);
    try {
      const body: any = {
        offerNo: offerNo.trim() || null,
        title: title.trim() || null,
        authorInitials: authorInitials.trim() || null,
        contractor: contractor.trim() || null,
        valueNet: valueNet ? Number(valueNet.replace(",", ".")) : null,
      };
      if (clientId && clientId !== "__NEW__") {
        body.clientId = clientId;
      } else if (clientId === "__NEW__") {
        const trimmed = clientName.trim();
        if (!trimmed) throw new Error("Podaj nazwę nowego odbiorcy");
        body.clientName = trimmed; // API dodatkowo przytnie do 10 znaków
      } else {
        throw new Error("Wybierz odbiorcę z listy lub dodaj nowego");
      }

      const res = await fetch("/api/offers/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json(); // { id }
      router.push(`/offers/${data.id}/edit`);
    } catch (e: any) {
      setMsg(e?.message || "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-4">Nowa oferta</h1>

      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1">
            <span className="text-sm text-gray-700">Nr oferty</span>
            <input
              className="border rounded px-2 py-1"
              value={offerNo}
              onChange={(e) => setOfferNo(e.target.value)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-gray-700">Autor (inicjały)</span>
            <input
              className="border rounded px-2 py-1"
              value={authorInitials}
              onChange={(e) => setAuthorInitials(e.target.value)}
            />
          </label>
        </div>

        <label className="grid gap-1">
          <span className="text-sm text-gray-700">Tytuł</span>
          <input
            className="border rounded px-2 py-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div className="grid gap-1">
          <span className="text-sm text-gray-700">Odbiorca (klient)</span>
          <div className="flex items-center gap-2">
            {/* UPPERCASE dla wyświetlania */}
            <select
              className="border rounded px-2 py-1 uppercase"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
            >
              <option value="">— WYBIERZ —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name.toUpperCase()}
                </option>
              ))}
              <option value="__NEW__">+ DODAJ NOWEGO…</option>
            </select>

            {clientId === "__NEW__" && (
              <div className="flex items-center gap-2">
                <input
                  className="border rounded px-2 py-1 uppercase"
                  placeholder="NAZWA (max 10)"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value.slice(0, 10))}
                  maxLength={10}
                />
                <span className="text-xs text-gray-500">{clientName.length}/10</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-1">
          <span className="text-sm text-gray-700">Wykonawca</span>
          <input
            className="border rounded px-2 py-1"
            value={contractor}
            onChange={(e) => setContractor(e.target.value)}
          />
        </div>

        <div className="grid gap-1 max-w-xs">
          <span className="text-sm text-gray-700">Wartość netto</span>
          <input
            className="border rounded px-2 py-1 text-right"
            placeholder="0,00"
            inputMode="decimal"
            value={valueNet}
            onChange={(e) => setValueNet(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-gray-600">{msg}</div>
          <div className="flex items-center gap-2">
            <a
              href="/offers"
              className="inline-block rounded px-3 py-1 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
            >
              Wróć do listy
            </a>
            <button
              className="border rounded px-3 py-1 hover:bg-gray-100 disabled:opacity-50"
              onClick={submit}
              disabled={saving}
            >
              Zapisz ofertę
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
