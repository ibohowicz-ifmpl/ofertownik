import { NextResponse } from "next/server";
import { preferDb } from "@/lib/apiMode";
import { prisma } from "@/lib/prisma";
import { MOCK_USERS, type AdminUser, type AdminUserRole } from "@/app/admin/_mocks";
import { createUser } from "./store";
import { readRequestRoles, assertCan } from "@/lib/server/rbac";

// DB → AdminUser adapter (ostra, ale bezpieczna konwersja)
function toAdminUser(u: any): AdminUser {
  const nameCandidate =
    (u as any).name ??
    (u as any).fullName ??
    (u as any).displayName ??
    (typeof u.email === "string" ? u.email.split("@")[0] : "");
  return {
    id: String(u.id),
    name: String(nameCandidate ?? ""),
    email: String(u.email ?? ""),
    role: "VIEWER" as AdminUserRole,
  };
}

export async function GET() {
  // feature flag: ?source=mock żeby wymusić mock (opcjonalnie)
  // (Next 15 App Router: query parsuje się po stronie klienta; tutaj trzymamy prosty DB-first fallback)
  try {
    const rows = await prisma.user.findMany({
      select: { id: true, email: true } as const,
      orderBy: { email: "asc" } as const,
    });
    const data = rows.map(toAdminUser);
    return NextResponse.json(data);
  } catch {
    // Fallback na mocki (np. w dev lub gdy schema nie gotowa)
    return NextResponse.json(MOCK_USERS);
  }
}

export async function POST(req: Request) {
  const { role: reqRole } = readRequestRoles(req);
  assertCan(reqRole, "create", "users");
  const body = await req.json();
  const { name, email, role: bodyRole } = body ?? {};
  if (!name || !email || !bodyRole) {
    return NextResponse.json({ error: "Missing fields: name, email, role" }, { status: 400 });
  }
  if (preferDb()) {
    try {
      const row = await (prisma as any).user.create({
        data: { email }, // jeśli w schema jest tylko email — name/role mogą nie istnieć
      });
      return NextResponse.json({
        id: String(row.id),
        name: String(name ?? (email?.split("@")[0] ?? "")),
        email: String(row.email ?? email),
        role: "VIEWER", // dopóki w DB nie ma roli, ustawiamy domyślną
      });
    } catch {}
  }
  const created = createUser({ name, email, role: bodyRole });
  return NextResponse.json(created, { status: 201 });
}
