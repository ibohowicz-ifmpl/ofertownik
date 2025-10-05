import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { preferDb } from "@/lib/apiMode";
import { updateClient, removeClient } from "../store";
import { readRequestRoles, assertCan } from "@/lib/server/rbac";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { role } = readRequestRoles(req);
  assertCan(role, "edit", "clients");
  const { id } = await ctx.params;
  const b = await req.json();
  const patch: Partial<{ name: string; nip: string }> = {};
  if (b?.name !== undefined) patch.name = b.name;
  if (b?.nip !== undefined) patch.nip = b.nip;
  if (preferDb()) {
    try {
      const data: any = {};
      if (patch.name !== undefined) data.name = String(patch.name);
      if (patch.nip !== undefined) data.nip = String(patch.nip);
      const row = await (prisma as any).client.update({ where: { id: (id as any) }, data });
      return NextResponse.json({ id: String(row.id), name: String(row.name), nip: String(row.nip ?? patch.nip ?? "") });
    } catch {}
  }
  const updated = updateClient(id, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { role } = readRequestRoles(_req);
  assertCan(role, "delete", "clients");
  const { id } = await ctx.params;
  if (preferDb()) {
    try {
      await (prisma as any).client.delete({ where: { id: (id as any) } });
      return NextResponse.json({ ok: true });
    } catch {}
  }
  const ok = removeClient(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
