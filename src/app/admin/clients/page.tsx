"use client";
import { useMemo, useState, Suspense } from "react";
import { Guard } from "@/components/admin/Guard";
import { can, explain } from "@/lib/rbac";
import { useAdminRole } from "@/app/admin/_UserContext";
import { SimpleTable, defineCols } from "@/components/admin/SimpleTable";
import { Modal } from "@/components/admin/Modal";
import { compareBy, type SortDir } from "@/lib/sort";
import { type AdminClient } from "@/app/admin/_mocks";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useUrlState } from "@/lib/useUrlState";


type Row = AdminClient;

const cols = defineCols<Row>()([
  { key: "id", header: "ID" },
  { key: "name", header: "Nazwa klienta" },
  { key: "nip", header: "NIP" },
] as const);

export default function AdminClientsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-500">Ładowanie…</div>}>
      <ClientsPageInner />
    </Suspense>
  );
}

function ClientsPageInner() {
  const { data, mutate } = useSWR<Row[]>("/api/admin/clients", fetcher);
  const BASE_ROWS: Row[] = data ?? [];
  const currentRole = useAdminRole();

  const { initial, setUrl } = useUrlState<{
    q: string;
    sortKey: keyof Row;
    sortDir: SortDir;
  }>({
    q: "",
    sortKey: "name",
    sortDir: "asc",
  });
  const [q, setQ] = useState(initial.q);
  const [sortKey, setSortKey] = useState<keyof Row>(initial.sortKey);
  const [sortDir, setSortDir] = useState<SortDir>(initial.sortDir);

  const [addName, setAddName] = useState("");
  const [addNip, setAddNip] = useState("");
  const [editName, setEditName] = useState("");
  const [editNip, setEditNip] = useState("");

  // Synchronizuj URL przy zmianie filtrów/sortowania
  useMemo(() => {
    setUrl({ q, sortKey, sortDir }, "/admin/clients");
  }, [q, sortKey, sortDir, setUrl]);

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
  const onRowClick = (r: Row) => {
    if (!can(currentRole, "edit", "clients")) return;
    setEditRow(r);
    setEditName(r.name);
    setEditNip(r.nip);
  };

  async function saveAdd() {
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addName, nip: addNip }),
    });
    if (res.ok) {
      setOpenAdd(false);
      setAddName("");
      setAddNip("");
      await mutate();
    }
  }

  async function saveEdit() {
    if (!editRow) return;
    const res = await fetch(`/api/admin/clients/${editRow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, nip: editNip }),
    });
    if (res.ok) {
      setEditRow(null);
      await mutate();
    }
  }

  async function deleteClient() {
    if (!editRow) return;
    if (!confirm(`Na pewno usunąć klienta: ${editRow.name}?`)) return;
    const res = await fetch(`/api/admin/clients/${editRow.id}`, { method: "DELETE" });
    if (res.ok) { setEditRow(null); await mutate(); } else { console.error(await res.json()); }
  }

  return (
    <Guard role={currentRole} resource="clients">
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
              disabled={!can(currentRole, "create", "clients")}
              title={explain(currentRole, "create", "clients") ?? undefined}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Dodaj
            </button>
          </div>
        </div>

        <SimpleTable cols={cols} rows={rows} onRowClick={onRowClick} />

        <Modal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          title="Dodaj klienta (placeholder)"
          actions={
            <button
              onClick={saveAdd}
              className="rounded border border-blue-600 bg-blue-600 text-white px-3 py-1 hover:bg-blue-700"
            >
              Zapisz (mock)
            </button>
          }
        >
          <form className="grid gap-3">
            <input
              className="rounded border border-gray-300 px-3 py-1"
              placeholder="Nazwa klienta"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
            />
            <input
              className="rounded border border-gray-300 px-3 py-1"
              placeholder="NIP (tylko cyfry)"
              value={addNip}
              onChange={(e) => setAddNip(e.target.value)}
            />
          </form>
        </Modal>

        <Modal
          open={!!editRow}
          onClose={() => setEditRow(null)}
          title={`Edytuj klienta: ${editRow?.name ?? ""} (placeholder)`}
          actions={
            <>
              <button onClick={deleteClient} className="rounded border border-red-600 bg-red-600 text-white px-3 py-1 hover:bg-red-700 mr-2">Usuń</button>
              <button onClick={saveEdit} className="rounded border border-blue-600 bg-blue-600 text-white px-3 py-1 hover:bg-blue-700">Zapisz (mock)</button>
            </>
          }
        >
          <form className="grid gap-3">
            <input
              className="rounded border border-gray-300 px-3 py-1"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <input
              className="rounded border border-gray-300 px-3 py-1"
              value={editNip}
              onChange={(e) => setEditNip(e.target.value)}
            />
          </form>
        </Modal>
      </div>
    </Guard>
  );
}
