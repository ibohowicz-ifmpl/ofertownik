import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { preferDb } from "@/lib/apiMode";
import { updateContact, removeContact } from "../store";
import { readRequestRoles, assertCan } from "@/lib/server/rbac";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { role } = readRequestRoles(req);
  assertCan(role, "edit", "contacts");
  const { id } = await ctx.params;
  const b = await req.json();
  const patch: Partial<{ name: string; email: string; client: string }> = {};
  if (b?.name !== undefined) patch.name = b.name;
  if (b?.email !== undefined) patch.email = b.email;
  if (b?.client !== undefined) patch.client = b.client;
  if (preferDb()) {
    try {
      const data: any = {};
      if (patch.name !== undefined) data.name = String(patch.name);
      if (patch.email !== undefined) data.email = String(patch.email);
      if (patch.client !== undefined) data.client = String(patch.client);
      const row = await (prisma as any).contact.update({ where: { id: (id as any) }, data });
      return NextResponse.json({
        id: String(row.id),
        name: String(row.name ?? patch.name ?? ""),
        email: String(row.email ?? patch.email ?? ""),
        client: String(row.client ?? patch.client ?? "")
      });
    } catch {}
  }
  const updated = updateContact(id, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { role } = readRequestRoles(_req);
  assertCan(role, "delete", "contacts");
  const { id } = await ctx.params;
  if (preferDb()) {
    try {
      await (prisma as any).contact.delete({ where: { id: (id as any) } });
      return NextResponse.json({ ok: true });
    } catch {}
  }
  const ok = removeContact(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
