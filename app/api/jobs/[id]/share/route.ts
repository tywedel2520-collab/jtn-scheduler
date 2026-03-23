export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

function generateShareToken() {
  // Long random URL-safe token (base64url-ish)
  return randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/db");
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const action = body?.action as "generate" | "regenerate";

  if (action !== "generate" && action !== "regenerate") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const existing = await prisma.$queryRawUnsafe<{ shareToken: string | null }[]>(
    'SELECT "shareToken" as "shareToken" FROM "Job" WHERE "id" = ? LIMIT 1',
    id
  );

  if (!existing[0]) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const currentToken = existing[0].shareToken;

  // Generate: keep existing token if already present.
  if (action === "generate" && currentToken) return NextResponse.json({ shareToken: currentToken });

  // Regenerate: always replace with a new token.
  // Token collision is extremely unlikely, but we retry a few times.
  for (let attempt = 0; attempt < 5; attempt++) {
    const token = generateShareToken();
    try {
      await prisma.$executeRawUnsafe(
        'UPDATE "Job" SET "shareToken" = ? WHERE "id" = ?',
        token,
        id
      );
      return NextResponse.json({ shareToken: token });
    } catch {
      // If collision happens, retry.
    }
  }

  return NextResponse.json({ error: "Could not generate token" }, { status: 500 });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/db");
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    'SELECT "id" FROM "Job" WHERE "id" = ? LIMIT 1',
    id
  );

  if (!existing[0]) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  await prisma.$executeRawUnsafe('UPDATE "Job" SET "shareToken" = NULL WHERE "id" = ?', id);

  return NextResponse.json({ success: true });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/db");
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const rows = await prisma.$queryRawUnsafe<{ shareToken: string | null }[]>(
    'SELECT "shareToken" as "shareToken" FROM "Job" WHERE "id" = ? LIMIT 1',
    id
  );

  if (!rows[0]) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json({ shareToken: rows[0].shareToken ?? null });
}

