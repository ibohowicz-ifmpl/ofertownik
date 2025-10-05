"use client";
import { useMemo, useState, useEffect, Suspense } from "react";
import { Modal } from "@/components/admin/Modal";
import { useRouter, useSearchParams } from "next/navigation";
import { SimpleTable, defineCols } from "@/components/admin/SimpleTable";
import { compareBy, type SortDir } from "@/lib/sort";
import { MOCK_USERS, type AdminUser, type AdminUserRole } from "@/app/admin/_mocks";
import { Guard } from "@/components/admin/Guard";
import { useAdminRole } from "@/app/admin/_UserContext";
import { can, explain } from "@/lib/rbac";

type Row = AdminUser;
const BASE_ROWS = MOCK_USERS;

const cols = defineCols<Row>()([
  { key: "id", header: "ID" },
  { key: "name", header: "Imię i nazwisko" },
  { key: "email", header: "Email" },
  { key: "role", header: "Rola" },
] as const);


export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-500">Ładowanie…</div>}>
      <UsersPageInner />
    </Suspense>
  );
}

function UsersPageInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const currentRole = useAdminRole();

  const [q, setQ] = useState(() => sp.get("q") ?? "");
  const [role, setRole] = useState<AdminUserRole | "">(
    (sp.get("role") as AdminUserRole | "") ?? ""
  );
  const [sortKey, setSortKey] = useState<keyof Row>(
    ((sp.get("sortKey") as keyof Row) ?? "name")
  );
  const [sortDir, setSortDir] = useState<SortDir>(
    ((sp.get("sortDir") as SortDir) ?? "asc")
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q);
    if (role) params.set("role", role);
    if (sortKey) params.set("sortKey", String(sortKey));
    if (sortDir) params.set("sortDir", sortDir);

    const url = params.toString()
      ? `/admin/users?${params.toString()}`
      : `/admin/users`;

    const id = setTimeout(() => router.replace(url), 300);
    return () => clearTimeout(id);
  }, [q, role, sortKey, sortDir, router]);

  const rows = useMemo(() => {
    const ql = q.toLowerCase().trim();
    const filtered = BASE_ROWS.filter((r) => {
      const hitRole = !role || String(r.role) === role;
      const hitText =
        !ql ||
        r.name.toLowerCase().includes(ql) ||
        r.email.toLowerCase().includes(ql) ||
        r.id.toLowerCase().includes(ql);
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
    <Guard role={currentRole} resource="users">
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
            onChange={(e) => setRole((e.target.value || "") as AdminUserRole | "")}
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
              disabled={!can(currentRole, "create", "users")}
              title={explain(currentRole, "create", "users") ?? undefined}
              className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + Dodaj użytkownika
            </button>
          </div>
        </div>

        <SimpleTable cols={cols} rows={rows} onRowClick={(r) => onRowClick(r)} />

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
    </Guard>
  );
}
