import { NextResponse } from "next/server";
import { MOCK_CONTACTS } from "@/app/admin/_mocks";

export async function GET() {
  return NextResponse.json(MOCK_CONTACTS);
}
