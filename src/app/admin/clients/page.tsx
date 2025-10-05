"use client";
import { useMemo, useState } from "react";
import { SimpleTable, defineCols } from "@/components/admin/SimpleTable";
import { Modal } from "@/components/admin/Modal";
import { compareBy, type SortDir } from "@/lib/sort";
import { MOCK_CLIENTS, type AdminClient } from "@/app/admin/_mocks";

type Row = AdminClient;
const BASE_ROWS = MOCK_CLIENTS;

const cols = defineCols<Row>()([
  { key: "id", header: "ID" },
  { key: "name", header: "Nazwa klienta" },
  { key: "nip", header: "NIP" },
] as const);

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

      <SimpleTable cols={cols} rows={rows} onRowClick={onRowClick} />

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
