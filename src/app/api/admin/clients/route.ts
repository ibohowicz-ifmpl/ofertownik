import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { preferDb } from "@/lib/apiMode";
import { MOCK_CLIENTS, type AdminClient } from "@/app/admin/_mocks";
import { createClient } from "./store";
import { readRequestRoles, assertCan } from "@/lib/server/rbac";

function toAdminClient(r: any): AdminClient {
  return {
    id: String(r?.id ?? r?.clientId ?? `c_${Date.now()}`),
    name: String(r?.name ?? r?.label ?? r?.title ?? ""),
    nip: String(r?.nip ?? r?.taxId ?? ""),
  };
}

export async function GET() {
  try {
    const rows = await (prisma as any).client?.findMany?.({
      orderBy: { name: "asc" },
    });
    if (Array.isArray(rows)) return NextResponse.json(rows.map(toAdminClient));
    return NextResponse.json(MOCK_CLIENTS);
  } catch {
    return NextResponse.json(MOCK_CLIENTS);
  }
}

export async function POST(req: Request) {
  const { role } = readRequestRoles(req);
  assertCan(role, "create", "clients");
  const b = await req.json();
  if (!b?.name || !b?.nip) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (preferDb()) {
    try {
      const row = await (prisma as any).client.create({
        data: { name: String(b.name), nip: String(b.nip) },
      });
      return NextResponse.json({ id: String(row.id), name: String(row.name), nip: String(row.nip ?? b.nip) }, { status: 201 });
    } catch {}
  }
  const created = createClient({ name: b.name, nip: b.nip });
  return NextResponse.json(created, { status: 201 });
}
