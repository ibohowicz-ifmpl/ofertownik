"use client";
import { useState } from "react";
import Link from "next/link";

import { SWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { AdminRoleProvider } from "./_UserContext";
import type { Role } from "@/lib/rbac";

const NAV = [
  { href: "/admin/users", label: "Użytkownicy" },
  { href: "/admin/mpk", label: "MPK" },
  { href: "/admin/clients", label: "Klienci" },
  { href: "/admin/contacts", label: "Kontakty" },
];


export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // DEV: lokalny stan roli i mock ról per MPK
  const [currentRole, setCurrentRole] = useState<Role>("LEADER");
  const [mpkRoles] = useState({ "Q22-OPS": "MANAGER", "PU-TECH": "VIEWER" } as const);

  return (
    <AdminRoleProvider role={currentRole} mpkRoles={mpkRoles}>
      <SWRConfig value={{
        fetcher,
        revalidateOnFocus: false,
        shouldRetryOnError: (_err) => false,
      }}>
        <main className="p-6 max-w-5xl mx-auto">
          <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold">Panel Administratora</h1>

            {/* DEV: szybki przełącznik roli */}
            <label className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Rola:</span>
              <select
                value={currentRole}
                onChange={(e) => setCurrentRole(e.target.value as Role)}
                className="rounded border border-gray-300 px-2 py-1"
              >
                <option value="LEADER">LEADER</option>
                <option value="MANAGER">MANAGER</option>
                <option value="PM">PM</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </label>
          </div>

          <nav className="mb-4 flex gap-2 flex-wrap">
            {NAV.map((x) => (
              <Link
                key={x.href}
                href={x.href}
                className="rounded border border-gray-200 px-3 py-1 hover:bg-gray-50"
              >
                {x.label}
              </Link>
            ))}
          </nav>

          <section className="rounded-lg border border-gray-200 bg-white shadow-sm p-4">
            {children}
          </section>
        </main>
      </SWRConfig>
    </AdminRoleProvider>
  );
}
