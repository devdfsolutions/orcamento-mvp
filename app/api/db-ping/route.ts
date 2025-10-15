import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    const r = await prisma.$queryRaw`select 1 as ok`;
    return NextResponse.json({ ok: true, r });
  } catch (e: any) {
    console.error("DB-PING ERROR:", e);
    return NextResponse.json({ ok: false, error: String(e?.message ?? e) }, { status: 500 });
  }
}
