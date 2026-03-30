export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

function generateShareToken() {
  return randomBytes(32)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function jsonError(status: number, error: string, details?: string) {
  return NextResponse.json(
    { error, ...(details ? { details } : {}) },
    { status }
  );
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db");
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Unauthorized");
    if (user.role !== "admin") return jsonError(403, "Forbidden");

    const { id } = await Promise.resolve(context.params);

    let body: { action?: string };
    try {
      body = await request.json();
    } catch {
      return jsonError(400, "Invalid JSON body");
    }

    const action = body?.action as "generate" | "regenerate" | undefined;
    if (action !== "generate" && action !== "regenerate") {
      return jsonError(400, "Invalid action", 'Use "generate" or "regenerate".');
    }

    const existing = await prisma.job.findUnique({
      where: { id },
      select: { id: true, shareToken: true },
    });

    if (!existing) return jsonError(404, "Job not found");

    const currentToken = existing.shareToken;

    const respondWithToken = (shareToken: string) => {
      const clientPath = `/client/${encodeURIComponent(shareToken)}`;
      return NextResponse.json({
        shareToken,
        clientPath,
        clientUrl: clientPath,
      });
    };

    if (action === "generate" && currentToken) {
      return respondWithToken(currentToken);
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const token = generateShareToken();
      try {
        await prisma.job.update({
          where: { id },
          data: { shareToken: token },
          select: { id: true },
        });
        return respondWithToken(token);
      } catch (err: unknown) {
        const code = typeof err === "object" && err && "code" in err ? (err as { code?: string }).code : undefined;
        if (code === "P2002") continue;
        console.error("JOB SHARE TOKEN UPDATE:", err);
        return jsonError(500, "Could not save share token", errMessage(err));
      }
    }

    return jsonError(500, "Could not generate token", "Unique token collision after retries.");
  } catch (err: unknown) {
    console.error("JOB SHARE POST:", err);
    return jsonError(500, "Share link update failed", errMessage(err));
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db");
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Unauthorized");
    if (user.role !== "admin") return jsonError(403, "Forbidden");

    const { id } = await Promise.resolve(context.params);
    const existing = await prisma.job.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return jsonError(404, "Job not found");

    await prisma.job.update({
      where: { id },
      data: { shareToken: null },
      select: { id: true },
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("JOB SHARE DELETE:", err);
    return jsonError(500, "Could not revoke share link", errMessage(err));
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/db");
    const user = await getCurrentUser();
    if (!user) return jsonError(401, "Unauthorized");
    if (user.role !== "admin") return jsonError(403, "Forbidden");

    const { id } = await Promise.resolve(context.params);
    const job = await prisma.job.findUnique({
      where: { id },
      select: { shareToken: true },
    });
    if (!job) return jsonError(404, "Job not found");

    const shareToken = job.shareToken ?? null;
    const clientPath = shareToken ? `/client/${encodeURIComponent(shareToken)}` : null;
    return NextResponse.json({ shareToken, clientPath, clientUrl: clientPath });
  } catch (err: unknown) {
    console.error("JOB SHARE GET:", err);
    return jsonError(500, "Could not load share link", errMessage(err));
  }
}
