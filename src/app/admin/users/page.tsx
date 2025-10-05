"use client";
import { useMemo, useState } from "react";
import { SimpleTable } from "@/components/admin/SimpleTable";
import { Modal } from "@/components/admin/Modal";
import { compareBy, type SortDir } from "@/lib/sort";

type Role = "LEADER" | "MANAGER" | "PM" | "VIEWER";
type Row = { id: string; name: string; email: string; role: Role };

const BASE_ROWS: Row[] = [
  { id: "u_001", name: "Jan Kowalski", email: "jan.kowalski@ifm.pl", role: "LEADER" },
  { id: "u_002", name: "Anna Nowak", email: "anna.nowak@ifm.pl", role: "PM" },
  { id: "u_003", name: "Piotr Admin", email: "piotr.admin@ifm.pl", role: "MANAGER" },
];

const cols = [
  { key: "id", header: "ID" },
  { key: "name", header: "Imię i nazwisko" },
  { key: "email", header: "Email" },
  { key: "role", header: "Rola" },
] as const;

export default function AdminUsersPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [sortKey, setSortKey] = useState<keyof Row>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rows = useMemo(() => {
    const filtered = BASE_ROWS.filter((r) => {
      const hitRole = role ? r.role === role : true;
      const hitText =
        q.trim() === "" ||
        r.name.toLowerCase().includes(q.toLowerCase()) ||
        r.email.toLowerCase().includes(q.toLowerCase()) ||
        r.id.toLowerCase().includes(q.toLowerCase());
      return hitRole && hitText;
    });

    const getter: Record<keyof Row, (x: Row) => string | number> = {
      id: (x) => x.id,
      name: (x) => x.name,
      email: (x) => x.email,
      role: (x) => x.role,
    };

    return [...filtered].sort(compareBy(getter[sortKey], sortDir));
  }, [q, role, sortKey, sortDir]);

  const toggleSort = (key: keyof Row) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const [openAdd, setOpenAdd] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);

  // Klik wiersza → edycja
  const onRowClick = (r: Row) => setEditRow(r);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap items-center">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj po nazwie, emailu, ID…"
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
          {(["name", "email", "role"] as (keyof Row)[]).map((k) => (
            <button
              key={k}
              onClick={() => toggleSort(k)}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
              title={`Sortuj po ${k}`}
            >
              {k}
              {sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
            </button>
          ))}
          <button
            onClick={() => setOpenAdd(true)}
            className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
          >
            + Dodaj użytkownika
          </button>
        </div>
      </div>

      <SimpleTable cols={cols as any} rows={rows} onRowClick={(r) => onRowClick(r as Row)} />

      {/* Modal dodawania użytkownika */}
      <Modal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        title="Dodaj użytkownika (placeholder)"
        actions={
          <button
            onClick={() => setOpenAdd(false)}
            className="rounded border border-blue-600 bg-blue-600 text-white px-3 py-1 hover:bg-blue-700"
          >
            Zapisz (mock)
          </button>
        }
      >
        <form className="grid gap-3">
          <input className="rounded border border-gray-300 px-3 py-1" placeholder="Imię i nazwisko" />
          <input className="rounded border border-gray-300 px-3 py-1" placeholder="Email" />
          <select className="rounded border border-gray-300 px-3 py-1" defaultValue="VIEWER">
            <option value="LEADER">LEADER</option>
            <option value="MANAGER">MANAGER</option>
            <option value="PM">PM</option>
            <option value="VIEWER">VIEWER</option>
          </select>
        </form>
      </Modal>

      {/* Modal edycji użytkownika */}
      <Modal
        open={!!editRow}
        onClose={() => setEditRow(null)}
        title={`Edytuj użytkownika: ${editRow?.name ?? ""} (placeholder)`}
        actions={
          <button
            onClick={() => setEditRow(null)}
            className="rounded border border-blue-600 bg-blue-600 text-white px-3 py-1 hover:bg-blue-700"
          >
            Zapisz (mock)
          </button>
        }
      >
        <form className="grid gap-3">
          <input className="rounded border border-gray-300 px-3 py-1" defaultValue={editRow?.name ?? ""} />
          <input className="rounded border border-gray-300 px-3 py-1" defaultValue={editRow?.email ?? ""} />
          <select className="rounded border border-gray-300 px-3 py-1" defaultValue={editRow?.role ?? "VIEWER"}>
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
