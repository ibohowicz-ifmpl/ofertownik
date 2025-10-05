import { NextResponse } from "next/server";
import { MOCK_MPK } from "@/app/admin/_mocks";

export async function GET() {
  return NextResponse.json(MOCK_MPK);
}
