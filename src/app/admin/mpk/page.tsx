"use client";
import { useMemo, useState } from "react";
import { SimpleTable } from "@/components/admin/SimpleTable";
import { Modal } from "@/components/admin/Modal";
import { compareBy, type SortDir } from "@/lib/sort";

type Role = "LEADER" | "MANAGER" | "PM" | "VIEWER";
type Row = { code: string; name: string; defaultRole: Role };

const BASE_ROWS: Row[] = [
  { code: "Q22-OPS", name: "Q22 – Operacje", defaultRole: "MANAGER" },
  { code: "PU-TECH", name: "Plac Unii – Techniczne", defaultRole: "PM" },
];

const cols = [
  { key: "code", header: "MPK" },
  { key: "name", header: "Nazwa jednostki" },
  { key: "defaultRole", header: "Domyślna rola" },
] as const;

export default function AdminMpkPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [sortKey, setSortKey] = useState<keyof Row>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rows = useMemo(() => {
    const filtered = BASE_ROWS.filter((r) => {
      const hitRole = role ? r.defaultRole === role : true;
      const ql = q.toLowerCase().trim();
      const hitText =
        !ql ||
        r.name.toLowerCase().includes(ql) ||
        r.code.toLowerCase().includes(ql);
      return hitRole && hitText;
    });

    const getter: Record<keyof Row, (x: Row) => string | number> = {
      code: (x) => x.code,
      name: (x) => x.name,
      defaultRole: (x) => x.defaultRole,
    };

    return [...filtered].sort(compareBy(getter[sortKey], sortDir));
  }, [q, role, sortKey, sortDir]);

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
          placeholder="Szukaj po MPK/nazwie…"
          className="rounded border border-gray-300 px-3 py-1"
        />
        <select
          value={role}
          onChange={(e) => setRole((e.target.value || "") as Role | "")}
          className="rounded border border-gray-300 px-3 py-1"
        >
          <option value="">Wszystkie role</option>
          <option value="LEADER">LEADER</option>
          <option value="MANAGER">MANAGER</option>
          <option value="PM">PM</option>
          <option value="VIEWER">VIEWER</option>
        </select>

        <div className="ml-auto flex gap-2">
          {(["code", "name", "defaultRole"] as (keyof Row)[]).map((k) => (
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

      <Modal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        title="Dodaj MPK (placeholder)"
        actions={<button onClick={() => setOpenAdd(false)} className="rounded border border-blue-600 bg-blue-600 text-white px-3 py-1 hover:bg-blue-700">Zapisz (mock)</button>}
      >
        <form className="grid gap-3">
          <input className="rounded border border-gray-300 px-3 py-1" placeholder="Kod MPK" />
          <input className="rounded border border-gray-300 px-3 py-1" placeholder="Nazwa jednostki" />
          <select className="rounded border border-gray-300 px-3 py-1" defaultValue="VIEWER">
            <option value="LEADER">LEADER</option>
            <option value="MANAGER">MANAGER</option>
            <option value="PM">PM</option>
            <option value="VIEWER">VIEWER</option>
          </select>
        </form>
      </Modal>

      <Modal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title={`Edytuj MPK: ${editRow?.code ?? ""} (placeholder)`}
        actions={<button onClick={() => setEditRow(null)} className="rounded border border-blue-600 bg-blue-600 text-white px-3 py-1 hover:bg-blue-700">Zapisz (mock)</button>}
      >
        <form className="grid gap-3">
          <input className="rounded border border-gray-300 px-3 py-1" defaultValue={editRow?.code ?? ""} />
          <input className="rounded border border-gray-300 px-3 py-1" defaultValue={editRow?.name ?? ""} />
          <select className="rounded border border-gray-300 px-3 py-1" defaultValue={editRow?.defaultRole ?? "VIEWER"}>
            <option value="LEADER">LEADER</option>
            <option value="MANAGER">MANAGER</option>
            <option value="PM">PM</option>
            <option value="VIEWER">VIEWER</option>
          </select>
        </form>
      </Modal>
    </div>
  );
}
