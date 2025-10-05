import { NextResponse } from "next/server";
import { listUsers, createUser } from "./store";

export async function GET() {
  return NextResponse.json(listUsers());
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, role } = body ?? {};
  if (!name || !email || !role) {
    return NextResponse.json({ error: "Missing fields: name, email, role" }, { status: 400 });
  }
  const created = createUser({ name, email, role });
  return NextResponse.json(created, { status: 201 });
}
