"use client";
import { useMemo, useState, Suspense } from "react";
import { Guard } from "@/components/admin/Guard";
import { canOnMpk, explainOnMpk } from "@/lib/rbac";
import { useAdminRole, useAdminMpkRoles } from "@/app/admin/_UserContext";
import { SimpleTable, defineCols } from "@/components/admin/SimpleTable";
import { Modal } from "@/components/admin/Modal";
import { compareBy, type SortDir } from "@/lib/sort";
import { type AdminMpk, type AdminMpkRole } from "@/app/admin/_mocks";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { useUrlState } from "@/lib/useUrlState";


type Row = AdminMpk;
const cols = defineCols<Row>()([
  { key: "code", header: "MPK" },
  { key: "name", header: "Nazwa jednostki" },
  { key: "defaultRole", header: "Domyślna rola" },
] as const);


export default function AdminMpkPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-500">Ładowanie…</div>}>
      <MpkPageInner />
    </Suspense>
  );
}

function MpkPageInner() {
  const currentRole = useAdminRole();
  const mpkRoles = useAdminMpkRoles();
  const { data } = useSWR<Row[]>("/api/admin/mpk", fetcher);
  const BASE_ROWS: Row[] = data ?? [];

  const { initial, setUrl } = useUrlState<{
    q: string;
    role: AdminMpkRole | "";
    sortKey: keyof Row;
    sortDir: SortDir;
  }>({
    q: "",
    role: "",
    sortKey: "name",
    sortDir: "asc",
  });
  const [q, setQ] = useState(initial.q);
  const [role, setRole] = useState<AdminMpkRole | "">(initial.role);
  const [sortKey, setSortKey] = useState<keyof Row>(initial.sortKey);
  const [sortDir, setSortDir] = useState<SortDir>(initial.sortDir);

  // Synchronizuj URL przy zmianie filtrów/sortowania
  useMemo(() => {
    setUrl({ q, role, sortKey, sortDir }, "/admin/mpk");
  }, [q, role, sortKey, sortDir, setUrl]);




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
  const onRowClick = (r: Row) => {
    if (!canOnMpk(mpkRoles, r.code, "edit")) return;
    setEditRow(r);
  };

  return (
    <Guard role={currentRole} resource="mpk">
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
            onChange={(e) => setRole((e.target.value || "") as AdminMpkRole | "")}
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
              disabled={false /* create MPK globalnie; zostawiamy otwarte */}
              title={undefined}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
            >
              + Dodaj
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Klik wiersza edytuje tylko, jeśli {'{role}'} w danym MPK ma prawo „edit”.
              Brak edycji = "{explainOnMpk(mpkRoles, "Q22-OPS", "edit") ?? "OK"}" (przykład dla Q22-OPS).
            </p>
          </div>
        </div>

        <SimpleTable cols={cols} rows={rows} onRowClick={onRowClick} />

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
    </Guard>
  );
}
