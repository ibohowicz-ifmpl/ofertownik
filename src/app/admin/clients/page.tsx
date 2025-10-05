"use client";
import { useMemo, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Guard } from "@/components/admin/Guard";
import { can, explain } from "@/lib/rbac";
import { useAdminRole } from "@/app/admin/_UserContext";
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
  return (
    <Suspense fallback={<div className="text-sm text-gray-500">Ładowanie…</div>}>
      <ClientsPageInner />
    </Suspense>
  );
}

function ClientsPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const currentRole = useAdminRole();

  const [q, setQ] = useState(() => sp.get("q") ?? "");
  const [sortKey, setSortKey] = useState<keyof Row>((sp.get("sortKey") as keyof Row) ?? "name");
  const [sortDir, setSortDir] = useState<SortDir>((sp.get("sortDir") as SortDir) ?? "asc");

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q);
    params.set("sortKey", String(sortKey));
    params.set("sortDir", sortDir);
    const url = params.toString() ? `/admin/clients?${params.toString()}` : `/admin/clients`;
    const id = setTimeout(() => router.replace(url), 300);
    return () => clearTimeout(id);
  }, [q, sortKey, sortDir, router]);

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
  };

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
    </Guard>
  );
}
