export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST() {
  await (await import("@/lib/auth")).deleteSession();
  return NextResponse.json({ success: true });
}
