"use client";
import { useMemo, useState } from "react";
import { Guard } from "@/components/admin/Guard";
import { can } from "@/lib/rbac";
import { useAdminRole } from "@/app/admin/_UserContext";

import { SimpleTable, defineCols } from "@/components/admin/SimpleTable";
import { Modal } from "@/components/admin/Modal";
import { compareBy, type SortDir } from "@/lib/sort";
import { MOCK_CONTACTS, type AdminContact } from "@/app/admin/_mocks";

type Row = AdminContact;
const BASE_ROWS = MOCK_CONTACTS;

const cols = defineCols<Row>()([
  { key: "id", header: "ID" },
  { key: "name", header: "Imię i nazwisko" },
  { key: "email", header: "Email" },
  { key: "client", header: "Klient" },
] as const);

export default function AdminContactsPage() {
  const currentRole = useAdminRole();
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<keyof Row>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rows = useMemo(() => {
    const ql = q.toLowerCase().trim();
    const filtered = BASE_ROWS.filter((r) =>
      !ql ||
      r.name.toLowerCase().includes(ql) ||
      r.email.toLowerCase().includes(ql) ||
      r.client.toLowerCase().includes(ql) ||
      r.id.toLowerCase().includes(ql)
    );

    const getter: Record<keyof Row, (x: Row) => string | number> = {
      id: (x) => x.id,
      name: (x) => x.name,
      email: (x) => x.email,
      client: (x) => x.client,
    };

    return [...filtered].sort(compareBy(getter[sortKey], sortDir));
  }, [q, sortKey, sortDir]);

  const toggleSort = (key: keyof Row) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const [openAdd, setOpenAdd] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const onRowClick = (r: Row) => {
    if (!can(currentRole, "edit", "contacts")) return;
    setEditRow(r);
  };

  return (
    <Guard role={currentRole} resource="contacts">
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Szukaj po nazwie, emailu, kliencie…"
            className="rounded border border-gray-300 px-3 py-1"
          />
          <div className="ml-auto flex gap-2">
            {(["name", "email", "client"] as (keyof Row)[]).map((k) => (
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
              disabled={!can(currentRole, "create", "contacts")}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Dodaj
            </button>
          </div>
        </div>

        <SimpleTable cols={cols} rows={rows} onRowClick={onRowClick} />

        <Modal open={openAdd} onClose={() => setOpenAdd(false)} title="Dodaj kontakt (placeholder)"
          actions={<button onClick={() => setOpenAdd(false)} className="rounded border border-blue-600 bg-blue-600 text-white px-3 py-1 hover:bg-blue-700">Zapisz (mock)</button>}>
          <form className="grid gap-3">
            <input className="rounded border border-gray-300 px-3 py-1" placeholder="Imię i nazwisko" />
            <input className="rounded border border-gray-300 px-3 py-1" placeholder="Email" />
            <input className="rounded border border-gray-300 px-3 py-1" placeholder="Klient" />
          </form>
        </Modal>

        <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Edytuj kontakt: ${editRow?.name ?? ""} (placeholder)`}
          actions={<button onClick={() => setEditRow(null)} className="rounded border border-blue-600 bg-blue-600 text-white px-3 py-1 hover:bg-blue-700">Zapisz (mock)</button>}>
          <form className="grid gap-3">
            <input className="rounded border border-gray-300 px-3 py-1" defaultValue={editRow?.name ?? ""} />
            <input className="rounded border border-gray-300 px-3 py-1" defaultValue={editRow?.email ?? ""} />
            <input className="rounded border border-gray-300 px-3 py-1" defaultValue={editRow?.client ?? ""} />
          </form>
        </Modal>
      </div>
    </Guard>
  );
}
