import { NextRequest, NextResponse } from "next/server";
import { preferDb } from "@/lib/apiMode";
import { prisma } from "@/lib/prisma";
import { updateUser, removeUser } from "../store";
import { readRequestRoles, assertCan } from "@/lib/server/rbac";

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { role: reqRole } = readRequestRoles(req);
  assertCan(reqRole, "edit", "users");
  const { id } = await ctx.params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  if (preferDb()) {
    try {
      const patch: any = {};
      if (body?.email !== undefined) patch.email = String(body.email);
      // jeśli Twoje schema ma 'name' — możesz dodać: patch.name = body.name
      const row = await (prisma as any).user.update({ where: { id: (id as any) }, data: patch });
      return NextResponse.json({
        id: String(row.id),
        name: String(body?.name ?? row.name ?? (row.email?.split("@")[0] ?? "")),
        email: String(row.email ?? ""),
        role: "VIEWER",
      });
    } catch {}
  }

  const updated = updateUser(id, {
    name: body?.name,
    email: body?.email,
    role: body?.role,
  });

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { role: reqRoleDel } = readRequestRoles(_req);
  assertCan(reqRoleDel, "delete", "users");
  const { id } = await ctx.params;
  if (preferDb()) {
    try {
      await (prisma as any).user.delete({ where: { id: (id as any) } });
      return NextResponse.json({ ok: true });
    } catch {}
  }
  const ok = removeUser(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
