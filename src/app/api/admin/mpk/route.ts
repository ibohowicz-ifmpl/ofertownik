import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { preferDb } from "@/lib/apiMode";
import { MOCK_MPK, type AdminMpk, type AdminMpkRole } from "@/app/admin/_mocks";
import { createMpk } from "./store";
import { readRequestRoles, assertCan } from "@/lib/server/rbac";

// adapter odporny na różnice w kolumnach
function toAdminMpk(r: any): AdminMpk {
  const code = String(r?.code ?? r?.id ?? "");
  const name = String(r?.name ?? r?.label ?? r?.title ?? "");
  const defaultRole = (String(r?.defaultRole ?? "VIEWER") as AdminMpkRole);
  return { code, name, defaultRole };
}

export async function GET() {
  try {
    // używamy (prisma as any) żeby nie zrobić błędu typów jeśli model/kolumny inaczej się nazywają
    const rows = await (prisma as any).mpk?.findMany?.({
      orderBy: { name: "asc" },
    });
    if (Array.isArray(rows)) {
      return NextResponse.json(rows.map(toAdminMpk));
    }
    return NextResponse.json(MOCK_MPK);
  } catch {
    return NextResponse.json(MOCK_MPK);
  }
}

export async function POST(req: Request) {
  const { role } = readRequestRoles(req);
  assertCan(role, "create", "mpk");
  const b = await req.json();
  const { code, name, defaultRole } = b ?? {};
  if (!code || !name || !defaultRole) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (preferDb()) {
    try {
      // dopasuj nazwy kolumn do swojej schemy (code/name), zostawiamy bez 'defaultRole' w DB
      const row = await (prisma as any).mpk.create({ data: { code: String(code), name: String(name) } });
      return NextResponse.json({ code: String(row.code), name: String(row.name), defaultRole: String(defaultRole) }, { status: 201 });
    } catch {}
  }
  const created = createMpk({ code, name, defaultRole: defaultRole as AdminMpkRole });
  return NextResponse.json(created, { status: 201 });
}
