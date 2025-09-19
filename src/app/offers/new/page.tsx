// src/app/offers/new/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Client = { id: string; name: string };
type OfferListResponse = Array<{ id?: string; offerNo?: string }> | { items?: Array<{ id?: string; offerNo?: string }> };

// spacje: zwykłe + niełamliwe
const SPACE_RE = /[ \u00A0\u202F]/g;
const nf = new Intl.NumberFormat("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function toNumber(text: string): number | null {
  if (typeof text !== "string") return null;
  const n = Number(text.replace(SPACE_RE, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function IconOk() {
  return (
    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
      ✓
    </span>
  );
}
function IconWarn() {
  return (
    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-bold">
      !
    </span>
  );
}
function IconError() {
  return (
    <span className="ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-700 text-xs font-bold">
      !
    </span>
  );
}

export default function NewOfferPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");

  // Części numeru oferty
  const [objectCode, setObjectCode] = useState("089"); // domyślne dla projektu
  const [offerDate, setOfferDate] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }); // YYYY-MM-DD
  const [seq, setSeq] = useState("01"); // 2-cyfrowy
  const [seqUserEdited, setSeqUserEdited] = useState(false); // nie nadpisuj, jeśli użytkownik zmienił ręcznie

  // Pola merytoryczne
  const [title, setTitle] = useState("");
  const [authorInitials, setAuthorInitials] = useState("");
  const [contractor, setContractor] = useState("");
  const [valueNet, setValueNet] = useState("");

  // Auto-generowany numer oferty (read-only)
  const offerNo = useMemo(() => {
    const d = offerDate || "";
    const [y, m, dd] = d.split("-");
    const YY = y || "";
    const MM = m || "";
    const DD = dd || "";
    const initials = (authorInitials || "").toUpperCase().replace(/\s+/g, "");
    const seq2 = (seq || "").padStart(2, "0").slice(0, 2);
    return [objectCode || "", YY, MM, DD, initials || "", seq2 || ""].join("/");
  }, [objectCode, offerDate, authorInitials, seq]);

  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refOfferNo = useRef<HTMLInputElement>(null);
  const refTitle = useRef<HTMLInputElement>(null);
  const refClient = useRef<HTMLSelectElement>(null);
  const refClientName = useRef<HTMLInputElement>(null);
  const refValueNet = useRef<HTMLInputElement>(null);

  // baseline dla „dirty” – wartości początkowe (puste)
  const baseline = useMemo(
    () => ({
      offerNo: "",
      title: "",
      authorInitials: "",
      contractor: "",
      valueNet: "",
      clientId: "",
      clientName: "",
      objectCode: "089",
      offerDate,
      seq: "01",
    }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const dirty =
    offerNo !== baseline.offerNo || // auto-generate makes this true; nie używamy do koloru przycisku
    title !== baseline.title ||
    authorInitials !== baseline.authorInitials ||
    contractor !== baseline.contractor ||
    valueNet !== baseline.valueNet ||
    clientId !== baseline.clientId ||
    (clientId === "__NEW__" ? clientName !== baseline.clientName : false) ||
    objectCode !== baseline.objectCode ||
    offerDate !== baseline.offerDate ||
    seq !== baseline.seq;

  // --- walidacja: nr oferty (z generatora), tytuł, odbiorca, kwota > 0 ---
  const numNow = toNumber(valueNet || "");
  const valueNetValid = numNow != null && numNow > 0;

  const hasClient =
    (clientId && clientId !== "__NEW__") ||
    (clientId === "__NEW__" && (clientName || "").trim() !== "");

  const numberValid = (() => {
    // Sprawdzamy format OBJECT/YYYY/MM/DD/II/NN
    const parts = offerNo.split("/");
    if (parts.length !== 6) return false;
    const [obj, yy, mm, dd, init, nn] = parts;
    const okObj = /^\d{3}$/.test(obj);
    const okYY = /^\d{4}$/.test(yy);
    const okMM = /^(0[1-9]|1[0-2])$/.test(mm);
    const okDD = /^(0[1-9]|[12]\d|3[01])$/.test(dd);
    const okInit = /^[A-Z]{1,4}$/.test(init || ""); // 1-4 litery
    const okNN = /^\d{2}$/.test(nn);
    return okObj && okYY && okMM && okDD && okInit && okNN;
  })();

  // Duplikaty numeru (live check + fallback na 409 przy POST) + auto-inkrement NN
  const [numberExists, setNumberExists] = useState<boolean>(false);
  const [checkingNo, setCheckingNo] = useState<boolean>(false);

  // Reset NN przy zmianie daty / inicjałów (zgodnie z prośbą)
  useEffect(() => {
    setSeqUserEdited(false);
    setSeq("01");
  }, [offerDate, authorInitials]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function check() {
      if (!numberValid) { setNumberExists(false); return; }
      try {
        setCheckingNo(true);
        const prefix = offerNo.split("/").slice(0, 5).join("/") + "/"; // bez NN

        // Nowy, jasny endpoint
        const params = new URLSearchParams({ offerNoPrefix: prefix, limit: "50" });
        const r = await fetch(`/api/offers/by-prefix?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store",
        });

        let items: Array<{ offerNo?: string }> = [];
        if (r.ok) {
          const data: OfferListResponse = await r.json();
          items = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items! : [];
        }

        // auto NN: policz max NN wśród pasujących
        const rePrefix = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d{2})$`);
        let maxNN = 0;
        for (const it of items) {
          const ono = it?.offerNo || "";
          const m = ono.match(rePrefix);
          if (m) {
            const n = parseInt(m[1], 10);
            if (!Number.isNaN(n)) maxNN = Math.max(maxNN, n);
          }
        }
        if (!seqUserEdited) {
          const suggested = String(Math.min(maxNN + 1, 99)).padStart(2, "0");
          setSeq(suggested === "00" ? "01" : suggested);
        }

        // Duplicat check: exact match
        const exists = items.some((it) => it?.offerNo === offerNo);
        setNumberExists(Boolean(exists));
      } catch {
        if (active) setNumberExists(false);
      } finally {
        if (active) setCheckingNo(false);
      }
    }
    const t = setTimeout(check, 300); // debounce
    return () => { active = false; controller.abort(); clearTimeout(t); };
  }, [objectCode, offerDate, authorInitials, seqUserEdited, offerNo, numberValid]);

  const requiredOk =
    numberValid &&
    !numberExists &&
    (title || "").trim() !== "" &&
    hasClient &&
    valueNetValid;

  // helper do klasy podświetlenia (zawsze pokazujemy na żółto, jeśli pole jest niepoprawne)
  const reqClass = (bad: boolean) => (bad ? "ring-1 ring-yellow-400 bg-yellow-50" : "");

  function FieldHint({
    bad, ok, textBad, textOk, error
  }: { bad: boolean; ok: boolean; textBad: string; textOk: string; error?: boolean }) {
    if (bad) {
      return (
        <div className={`flex items-center gap-1 text-xs mt-1 ${error ? "text-red-700" : "text-yellow-700"}`}>
          {error ? <IconError /> : <IconWarn />} <span>{textBad}</span>
        </div>
      );
    }
    if (ok) {
      return (
        <div className="flex items-center gap-1 text-xs text-green-700 mt-1">
          <IconOk /> <span>{textOk}</span>
        </div>
      );
    }
    return null;
  }

  useEffect(() => {
    fetch("/api/clients", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Client[]) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]));
  }, []);

  function missingList(): string[] {
    const arr: string[] = [];
    if (!numberValid) arr.push("Nr oferty");
    if (numberExists) arr.push("Nr oferty — już istnieje");
    if (!(title || "").trim()) arr.push("Tytuł");
    if (!hasClient) arr.push("Odbiorca");
    if (!valueNetValid) arr.push("Wartość netto (> 0)");
    return arr;
  }

  function focusFirstInvalid() {
    if (!numberValid || numberExists) { refOfferNo.current?.focus(); return; }
    if (!(title || "").trim()) { refTitle.current?.focus(); return; }
    if (!hasClient) {
      if (clientId === "__NEW__") refClientName.current?.focus();
      else refClient.current?.focus();
      return;
    }
    if (!valueNetValid) { refValueNet.current?.focus(); return; }
  }

  async function trySubmit() {
    setMsg(null);
    if (!requiredOk) {
      const miss = missingList();
      setMsg("Uzupełnij wymagane pola: " + miss.join(", "));
      focusFirstInvalid();
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        offerNo: offerNo, // auto-generated
        title: title.trim(),
        authorInitials: (authorInitials || "").trim() || null,
        contractor: (contractor || "").trim() || null,
        valueNet: numNow,
      };

      if (clientId && clientId !== "__NEW__") {
        body.clientId = clientId;
      } else if (clientId === "__NEW__") {
        const trimmed = clientName.trim();
        if (!trimmed) throw new Error("Podaj nazwę nowego odbiorcy");
        body.clientName = trimmed; // API może skrócić do 10 znaków
      } else {
        throw new Error("Wybierz odbiorcę z listy lub dodaj nowego");
      }

      const res = await fetch("/api/offers/new", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 409) {
        // konflikt – numer już istnieje (lub inny unikalny warunek)
        setNumberExists(true);
        throw new Error("Oferta o tym numerze już istnieje w systemie.");
      }
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json(); // { id }
      router.push(`/offers/${data.id}/edit`);
    } catch (e: any) {
      setMsg(e?.message || "Błąd zapisu");
    } finally {
      setSaving(false);
    }
  }

  const badNumberFormat = !numberValid;
  const badTitle = !(title || "").trim();
  const badClient = !hasClient;
  const badValueNet = !valueNetValid;

  // HORIZONTAL LAYOUT: jedna linia na desktopie (md:), podgląd poniżej
  return (
    <main className="p-6 max-w-5xl">
      <h1 className="text-xl font-semibold mb-4">Rejstracja nowej oferty</h1>

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm p-4">
        {/* Toast */}
        {msg && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-4 right-4 z-50 rounded px-3 py-2 text-sm shadow bg-red-600 text-white"
          >
            {msg}
          </div>
        )}

        <div className="grid gap-4">
          {/* Sekcja numeru oferty */}
          <div className="grid gap-2">
            <div className="font-semibold">Numer oferty (generowany automatycznie)</div>

            {/* Jedna linia na desktopie */}
            <div className="flex flex-col md:flex-row md:items-end md:gap-4 gap-3">
              <label className="grid gap-1 md:w-1/4">
                <span className="text-sm text-gray-700">Nr obiektu (3 cyfry)</span>
                <input
                  className={`border rounded px-2 py-1 ${/^\d{3}$/.test(objectCode) ? "" : "ring-1 ring-yellow-400 bg-yellow-50"}`}
                  value={objectCode}
                  onChange={(e) => setObjectCode(e.target.value.replace(/[^\d]/g, "").slice(0, 3))}
                />
              </label>

              <label className="grid gap-1 md:w-1/4">
                <span className="text-sm text-gray-700">Data</span>
                <input
                  type="date"
                  className="border rounded px-2 py-1"
                  value={offerDate}
                  onChange={(e) => setOfferDate(e.target.value)}
                />
              </label>

              <label className="grid gap-1 md:w-1/4">
                <span className="text-sm text-gray-700">Autor oferty</span>
                <input
                  className={`border rounded px-2 py-1 ${/^[A-Za-z]{1,4}$/.test(authorInitials.trim()) ? "" : "ring-1 ring-yellow-400 bg-yellow-50"}`}
                  value={authorInitials}
                  onChange={(e) => setAuthorInitials(e.target.value.toUpperCase().slice(0, 4))}
                  placeholder="IB"
                />
              </label>

              <label className="grid gap-1 md:w-1/4">
                <span className="text-sm text-gray-700">Nr kolejny (2 cyfry)</span>
                <input
                  className={`border rounded px-2 py-1 ${/^\d{1,2}$/.test(seq) ? "" : "ring-1 ring-yellow-400 bg-yellow-50"}`}
                  value={seq}
                  onChange={(e) => { setSeq(e.target.value.replace(/[^\d]/g, "").slice(0, 2)); setSeqUserEdited(true); }}
                  placeholder="01"
                />
              </label>
            </div>

            {/* Podgląd poniżej */}
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Podgląd</span>
              <div className="flex items-center">
                <input
                  ref={refOfferNo}
                  className={`border rounded px-2 py-1 font-mono flex-1 ${
                    badNumberFormat ? "ring-1 ring-yellow-400 bg-yellow-50" : numberExists ? "ring-1 ring-red-500 bg-red-50" : ""
                  }`}
                  value={`${offerNo}${checkingNo ? " ⏳" : ""}`}
                  readOnly
                  aria-invalid={badNumberFormat || numberExists}
                />
                {numberExists ? <IconError /> : !badNumberFormat ? <IconOk /> : <IconWarn />}
              </div>
              <FieldHint bad={badNumberFormat} ok={!badNumberFormat && !numberExists} textBad="Nieprawidłowy numer oferty" textOk="OK" />
              {numberExists && <FieldHint bad={true} ok={false} textBad="Oferta o tym numerze już istnieje" textOk="" error />}
            </label>
          </div>


          {/* Pola merytoryczne */}
          {/* Tytuł w jednej linii (full width) */}
          <div className="grid gap-3">
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Tytuł *</span>
              <div className="flex items-center">
                <input
                  ref={refTitle}
                  className={`border rounded px-2 py-1 w-full ${(!badNumberFormat && !numberExists && badTitle) ? "ring-1 ring-yellow-400 bg-yellow-50" : ""}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  aria-invalid={badTitle}
                />
                {!badTitle ? <IconOk /> : <IconWarn />}
              </div>
              <FieldHint bad={badTitle} ok={!badTitle} textBad="Wpisz tytuł oferty" textOk="OK" />
            </label>
          </div>

          {/* Kolejne pola w układzie poziomym */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Wykonawca prac.</span>
              <input
                className="border rounded px-2 py-1"
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm text-gray-700">Odbiorca (klient) *</span>
              <div className="flex items-center">
                <select
                  ref={refClient}
                  className={`border rounded px-2 py-1 uppercase flex-1 ${(!badNumberFormat && !numberExists && badClient) ? "ring-1 ring-yellow-400 bg-yellow-50" : ""}`}
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  aria-invalid={badClient}
                >
                  <option value="">— WYBIERZ —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name.toUpperCase()}
                    </option>
                  ))}
                  <option value="__NEW__">+ DODAJ NOWEGO…</option>
                </select>
                {!badClient ? <IconOk /> : <IconWarn />}
              </div>
              <FieldHint
                bad={badClient}
                ok={!badClient}
                textBad={clientId === "__NEW__" ? "Wybierz istniejącego odbiorcę lub wprowadź nazwę nowego" : "Wybierz odbiorcę z listy"}
                textOk="OK"
              />

              {clientId === "__NEW__" && (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      ref={refClientName}
                      className={`border rounded px-2 py-1 uppercase flex-1 ${(!(clientName || "").trim()) ? "ring-1 ring-yellow-400 bg-yellow-50" : ""}`}
                      placeholder="NAZWA (max 10)"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value.slice(0, 10))}
                      maxLength={10}
                      aria-invalid={!(clientName || "").trim()}
                    />
                    {(clientName || "").trim() ? <IconOk /> : <IconWarn />}
                  </div>
                  <div className="text-xs text-gray-500">{clientName.length}/10</div>
                </div>
              )}
            </label>

            <label className="grid gap-1 max-w-xs">
              <span className="text-sm text-gray-700">Wartość netto *</span>
              <div className="flex items-center">
                <input
                  ref={refValueNet}
                  className={`border rounded px-2 py-1 text-right flex-1 ${badValueNet ? "ring-1 ring-yellow-400 bg-yellow-50" : ""}`}
                  placeholder="0,00"
                  inputMode="decimal"
                  value={valueNet}
                  onFocus={(e) => {
                    const n = toNumber(valueNet || "");
                    const raw = n == null ? (valueNet || "") : String(n).replace(".", ",");
                    e.currentTarget.value = raw;
                  }}
                  onBlur={(e) => {
                    const n = toNumber(e.currentTarget.value || "");
                    e.currentTarget.value = n == null ? "" : nf.format(n);
                    setValueNet(n == null ? "" : nf.format(n));
                  }}
                  onChange={(e) => setValueNet(e.target.value)}
                  aria-invalid={badValueNet}
                />
                {!badValueNet ? <IconOk /> : <IconWarn />}
              </div>
              <FieldHint bad={badValueNet} ok={!badValueNet} textBad="Wpisz kwotę większą od zera" textOk="OK" />
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className={`text-sm ${msg ? "text-gray-700" : "text-gray-500"}`}>
              {msg || "Pola oznaczone * są wymagane"}
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/offers"
                className="inline-block rounded px-3 py-1 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50"
              >
                Wróć do listy
              </a>
              <button
                className={
                  "rounded px-3 py-1 " +
                  (requiredOk
                    ? "border border-green-600 text-white bg-green-600 hover:bg-green-700"
                    : "border border-red-600 text-white bg-red-600 hover:bg-red-700")
                }
                onClick={trySubmit}
                disabled={saving}  /* tylko blokada na czas zapisu */
                title={
                  requiredOk
                    ? "Zapisz nową ofertę"
                    : "Uzupełnij wymagane pola (oznaczone *)"
                }
              >
                {requiredOk ? "Zapisz ofertę" : "Uzupełnij wymagane pola"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}