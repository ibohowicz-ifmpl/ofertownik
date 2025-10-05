"use client";
import { useMemo, useState, useEffect, Suspense } from "react";
import useSWR from "swr";
import { SimpleTable, defineCols } from "@/components/admin/SimpleTable";
import { Modal } from "@/components/admin/Modal";
import { Guard } from "@/components/admin/Guard";
import { useAdminRole } from "@/app/admin/_UserContext";
import { can, explain } from "@/lib/rbac";
import { compareBy, type SortDir } from "@/lib/sort";
import { fetcher } from "@/lib/fetcher";
import { useUrlState } from "@/lib/useUrlState";
import type { AdminUserRole } from "@/app/admin/_mocks";

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="text-sm text-gray-500">Ładowanie…</div>}>
      <UsersPageInner />
    </Suspense>
  );
}

function UsersPageInner() {
  const currentRole = useAdminRole();
  // URL state (DRY)
  const { initial, setUrl } = useUrlState<{
    q: string;
    role: AdminUserRole | "";
    sortKey: keyof Row;
    sortDir: SortDir;
  }>({
    q: "",
    role: "",
    sortKey: "name",
    sortDir: "asc",
  });

  type Row = {
    id: string;
    name: string;
    email: string;
    role: AdminUserRole;
  };

  const cols = defineCols<Row>()([
    { key: "name", header: "Imię i nazwisko" },
    { key: "email", header: "Email" },
    { key: "role", header: "Rola" },
  ] as const);

  // lokalne stany synchronizowane do URL
  const [q, setQ] = useState(initial.q);
  const [role, setRole] = useState<AdminUserRole | "">(initial.role);
  const [sortKey, setSortKey] = useState<keyof Row>(initial.sortKey);
  const [sortDir, setSortDir] = useState<SortDir>(initial.sortDir);

  useEffect(() => {
    setUrl({ q, role, sortKey, sortDir }, "/admin/users");
  }, [q, role, sortKey, sortDir, setUrl]);

  // dane z mock API
  const { data, mutate } = useSWR<Row[]>("/api/admin/users", fetcher);
  const BASE_ROWS: Row[] = data ?? [];

  const rows = useMemo(() => {
    const filtered = BASE_ROWS.filter((r) => {
      const hitRole = role ? r.role === role : true;
      const ql = q.toLowerCase().trim();
      const hitText =
        !ql ||
        r.name.toLowerCase().includes(ql) ||
        r.email.toLowerCase().includes(ql) ||
        r.id.toLowerCase().includes(ql);
      return hitRole && hitText;
    });

    const getter: Record<keyof Row, (x: Row) => string> = {
      id: (x) => x.id,
      name: (x) => x.name,
      email: (x) => x.email,
      role: (x) => x.role,
    };

    return [...filtered].sort(compareBy(getter[sortKey], sortDir));
  }, [BASE_ROWS, q, role, sortKey, sortDir]);

  // Modale / akcje
  const [openAdd, setOpenAdd] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);

  // Formularze (kontrolowane)
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState<AdminUserRole>("VIEWER");

  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<AdminUserRole>("VIEWER");

  const [addErr, setAddErr] = useState<string>("");
  const [editErr, setEditErr] = useState<string>("");
  const [savingAdd, setSavingAdd] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const onRowClick = (row: Row) => {
    if (!can(currentRole, "edit", "users")) return;
    setEditRow(row);
    setEditName(row.name);
    setEditEmail(row.email);
    setEditRole(row.role);
  };

  const toggleSort = (key: keyof Row) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  async function saveAdd() {
    setAddErr(""); setSavingAdd(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addName, email: addEmail, role: addRole }),
    });
    if (res.ok) {
      setOpenAdd(false);
      setAddName(""); setAddEmail(""); setAddRole("VIEWER");
      await mutate();
    } else {
      const j = await res.json().catch(() => ({}));
      setAddErr(j?.error ? String(j.error) : `HTTP ${res.status}`);
    }
    setSavingAdd(false);
  }

  async function saveEdit() {
    if (!editRow) return;
    setEditErr(""); setSavingEdit(true);
    const res = await fetch(`/api/admin/users/${editRow.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, email: editEmail, role: editRole }),
    });
    if (res.ok) {
      setEditRow(null);
      await mutate();
    } else {
      const j = await res.json().catch(() => ({}));
      setEditErr(j?.error ? String(j.error) : `HTTP ${res.status}`);
    }
    setSavingEdit(false);
  }

  async function deleteUser() {
    if (!editRow) return;
    if (!confirm("Na pewno usunąć użytkownika?")) return;
    const res = await fetch(`/api/admin/users/${editRow.id}`, { method: "DELETE" });
    if (res.ok) { setEditRow(null); await mutate(); } else { console.error(await res.json()); }
  }

  return (
    <Guard role={currentRole} resource="users">
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap items-center">
          <input
            className="rounded border border-gray-300 px-3 py-1"
            placeholder="Szukaj użytkownika..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded border border-gray-300 px-3 py-1"
            value={role}
            onChange={(e) => setRole((e.target.value || "") as AdminUserRole | "")}
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
                {k}{sortKey === k ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
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

        <SimpleTable cols={cols} rows={rows} onRowClick={onRowClick} />

        {/* Modal: Dodaj */}
        <Modal
          open={openAdd}
          onClose={() => { setOpenAdd(false); setAddErr(""); }}
          title="Dodaj użytkownika (placeholder)"
          actions={
            <button
              onClick={saveAdd}
              disabled={savingAdd}
              className="rounded border border-blue-600 bg-blue-600 text-white px-3 py-1 hover:bg-blue-700 disabled:opacity-50"
            >
              Zapisz (mock)
            </button>
          }
        >
          {addErr ? <div className="rounded border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">{addErr}</div> : null}
          <form className="grid gap-3">
            <input className="rounded border border-gray-300 px-3 py-1" placeholder="Imię i nazwisko"
              value={addName} onChange={(e) => setAddName(e.target.value)} />
            <input className="rounded border border-gray-300 px-3 py-1" placeholder="Email"
              value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
            <select className="rounded border border-gray-300 px-3 py-1"
              value={addRole} onChange={(e) => setAddRole(e.target.value as AdminUserRole)}>
              <option value="LEADER">LEADER</option>
              <option value="MANAGER">MANAGER</option>
              <option value="PM">PM</option>
              <option value="VIEWER">VIEWER</option>
            </select>
          </form>
        </Modal>

        {/* Modal: Edytuj */}
        <Modal
          open={!!editRow}
          onClose={() => { setEditRow(null); setEditErr(""); }}
          title={`Edytuj użytkownika: ${editRow?.name ?? ""} (placeholder)`}
          actions={
            <>
              <button onClick={deleteUser} className="rounded border border-red-600 bg-red-600 text-white px-3 py-1 hover:bg-red-700 mr-2">
                Usuń
              </button>
              <button onClick={saveEdit} disabled={savingEdit} className="rounded border border-blue-600 bg-blue-600 text-white px-3 py-1 hover:bg-blue-700 disabled:opacity-50">
                Zapisz (mock)
              </button>
            </>
          }
        >
          {editErr ? <div className="rounded border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">{editErr}</div> : null}
          <form className="grid gap-3">
            <input className="rounded border border-gray-300 px-3 py-1"
              value={editName} onChange={(e) => setEditName(e.target.value)} />
            <input className="rounded border border-gray-300 px-3 py-1"
              value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
            <select className="rounded border border-gray-300 px-3 py-1"
              value={editRole} onChange={(e) => setEditRole(e.target.value as AdminUserRole)}>
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
