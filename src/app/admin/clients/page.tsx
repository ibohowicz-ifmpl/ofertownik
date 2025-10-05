"use client";
import { useMemo, useState } from "react";
import { SimpleTable } from "@/components/admin/SimpleTable";
import { Modal } from "@/components/admin/Modal";
import { compareBy, type SortDir } from "@/lib/sort";

type Row = { id: string; name: string; nip: string };

const BASE_ROWS: Row[] = [
  { id: "c_001", name: "RTV EURO AGD", nip: "5270002721" },
  { id: "c_002", name: "Circle K Polska", nip: "5260210595" },
];

const cols = [
  { key: "id", header: "ID" },
  { key: "name", header: "Nazwa klienta" },
  { key: "nip", header: "NIP" },
] as const;

export default function AdminClientsPage() {
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<keyof Row>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rows = useMemo(() => {
    const ql = q.toLowerCase().trim();
    const filtered = BASE_ROWS.filter((r) =>
      !ql ||
      r.name.toLowerCase().includes(ql) ||
      r.nip.includes(q) ||
      r.id.toLowerCase().includes(ql)
    );

    const getter: Record<keyof Row, (x: Row) => string | number> = {
      id: (x) => x.id,
      name: (x) => x.name,
      nip: (x) => x.nip,
    };

    return [...filtered].sort(compareBy(getter[sortKey], sortDir));
  }, [q, sortKey, sortDir]);

  const toggleSort = (key: keyof Row) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const [openAdd, setOpenAdd] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const onRowClick = (r: Row) => setEditRow(r);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj po nazwie, NIP, ID…"
          className="rounded border border-gray-300 px-3 py-1"
        />
        <div className="ml-auto flex gap-2">
          {(["name", "nip"] as (keyof Row)[]).map((k) => (
            <button
              key={k}
              onClick={() => toggleSort(k)}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
            >
              {k}{sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
            </button>
          ))}
          <button
            onClick={() => setOpenAdd(true)}
            className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
          >
            + Dodaj
          </button>
        </div>
      </div>

      <SimpleTable cols={cols as any} rows={rows} onRowClick={(r) => onRowClick(r as Row)} />

      <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Dodaj klienta (placeholder)"
        actions={<button onClick={() => setOpenAdd(false)} className="rounded border border-blue-600 bg-blue-600 text-white px-3 py-1 hover:bg-blue-700">Zapisz (mock)</button>}>
        <form className="grid gap-3">
          <input className="rounded border border-gray-300 px-3 py-1" placeholder="Nazwa klienta" />
          <input className="rounded border border-gray-300 px-3 py-1" placeholder="NIP (tylko cyfry)" />
        </form>
      </Modal>

      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edytuj klienta: ${editRow?.name ?? ""} (placeholder)`}
        actions={<button onClick={() => setEditRow(null)} className="rounded border border-blue-600 bg-blue-600 text-white px-3 py-1 hover:bg-blue-700">Zapisz (mock)</button>}>
        <form className="grid gap-3">
          <input className="rounded border border-gray-300 px-3 py-1" defaultValue={editRow?.name ?? ""} />
          <input className="rounded border border-gray-300 px-3 py-1" defaultValue={editRow?.nip ?? ""} />
        </form>
      </Modal>
    </div>
  );
}
