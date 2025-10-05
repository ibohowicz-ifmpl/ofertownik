import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { preferDb } from "@/lib/apiMode";
import { MOCK_CONTACTS, type AdminContact } from "@/app/admin/_mocks";
import { createContact } from "./store";
import { readRequestRoles, assertCan } from "@/lib/server/rbac";

function toAdminContact(r: any): AdminContact {
  return {
    id: String(r?.id ?? r?.contactId ?? `p_${Date.now()}`),
    name: String(r?.name ?? r?.fullName ?? r?.displayName ?? ""),
    email: String(r?.email ?? ""),
    client: String(r?.client ?? r?.clientName ?? r?.clientId ?? ""),
  };
}

export async function GET() {
  try {
    const rows = await (prisma as any).contact?.findMany?.({
      orderBy: { name: "asc" },
    });
    if (Array.isArray(rows)) return NextResponse.json(rows.map(toAdminContact));
    return NextResponse.json(MOCK_CONTACTS);
  } catch {
    return NextResponse.json(MOCK_CONTACTS);
  }
}

export async function POST(req: Request) {
  const { role } = readRequestRoles(req);
  assertCan(role, "create", "contacts");
  const b = await req.json();
  if (!b?.name || !b?.email || !b?.client)
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  if (preferDb()) {
    try {
      const row = await (prisma as any).contact.create({
        data: { name: String(b.name), email: String(b.email), client: String(b.client) },
      });
      return NextResponse.json(
        { id: String(row.id), name: String(row.name ?? b.name), email: String(row.email ?? b.email), client: String(row.client ?? b.client) },
        { status: 201 }
      );
    } catch {}
  }
  const created = createContact({
    name: b.name,
    email: b.email,
    client: b.client,
  });
  return NextResponse.json(created, { status: 201 });
}
