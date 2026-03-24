export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

export async function POST() {
  const { deleteSessionFromResponse } = await import("@/lib/auth");
  const res = NextResponse.json({ success: true });
  deleteSessionFromResponse(res);
  return res;
}
