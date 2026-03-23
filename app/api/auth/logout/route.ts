export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST() {
  const { deleteSession } = await import("@/lib/auth");
  await deleteSession();
  return NextResponse.json({ success: true });
}
