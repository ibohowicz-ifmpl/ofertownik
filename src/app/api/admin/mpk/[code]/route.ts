import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { preferDb } from "@/lib/apiMode";
import { updateMpk, removeMpk } from "../store";
import type { AdminMpkRole } from "@/app/admin/_mocks";
import { readRequestRoles, assertCanOnMpk } from "@/lib/server/rbac";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const { mpkRoles } = readRequestRoles(req);
  assertCanOnMpk(mpkRoles, code, "edit");
  const b = await req.json();

  const patch: Partial<{ name: string; defaultRole: AdminMpkRole }> = {};
  if (b?.name !== undefined) patch.name = b.name as string;
  if (b?.defaultRole !== undefined) patch.defaultRole = b.defaultRole as AdminMpkRole;

  if (preferDb()) {
    try {
      const dbPatch: any = {};
      if (patch.name !== undefined) dbPatch.name = String(patch.name);
      const row = await (prisma as any).mpk.update({ where: { code: String(code) }, data: dbPatch });
      return NextResponse.json({ code: String(row.code), name: String(row.name), defaultRole: patch.defaultRole ?? "VIEWER" });
    } catch {}
  }

  const updated = updateMpk(code, patch);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const { mpkRoles } = readRequestRoles(_req);
  assertCanOnMpk(mpkRoles, code, "delete");
  if (preferDb()) {
    try {
      await (prisma as any).mpk.delete({ where: { code: String(code) } });
      return NextResponse.json({ ok: true });
    } catch {}
  }
  const ok = removeMpk(code);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
