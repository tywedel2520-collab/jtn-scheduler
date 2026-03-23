export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";

function parseChecklist(raw: string) {
  try {
    const obj = JSON.parse(raw) as Record<string, unknown>;
    return {
      siteReady: Boolean(obj.siteReady),
      materialsOnSite: Boolean(obj.materialsOnSite),
      cleanupDone: Boolean(obj.cleanupDone),
      queueOrder: typeof obj.queueOrder === "number" ? obj.queueOrder : null,
      estimatedTimeframe:
        typeof obj.estimatedTimeframe === "string" ? obj.estimatedTimeframe : null,
      progressState: typeof obj.progressState === "string" ? obj.progressState : null,
      lastUpdatedBy: typeof obj.lastUpdatedBy === "string" ? obj.lastUpdatedBy : null,
      lastUpdatedAt: typeof obj.lastUpdatedAt === "string" ? obj.lastUpdatedAt : null,
    };
  } catch {
    return {
      siteReady: false,
      materialsOnSite: false,
      cleanupDone: false,
      queueOrder: null as number | null,
      estimatedTimeframe: null as string | null,
      progressState: null as string | null,
      lastUpdatedBy: null as string | null,
      lastUpdatedAt: null as string | null,
    };
  }
}

export async function PATCH(request: Request) {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/db");
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const orderedJobIds = Array.isArray(body?.orderedJobIds) ? (body.orderedJobIds as string[]) : [];
  if (orderedJobIds.length === 0) {
    return NextResponse.json({ error: "orderedJobIds required" }, { status: 400 });
  }

  const jobs = await prisma.job.findMany({
    where: { id: { in: orderedJobIds } },
    select: { id: true, checklist: true },
  });
  const byId = new Map(jobs.map((j) => [j.id, j]));

  for (let i = 0; i < orderedJobIds.length; i++) {
    const id = orderedJobIds[i];
    const existing = byId.get(id);
    if (!existing) continue;
    const parsed = parseChecklist(existing.checklist);
    const nextChecklist = {
      ...parsed,
      queueOrder: i + 1,
      lastUpdatedBy: `${user.role}: ${user.name}`,
      lastUpdatedAt: new Date().toISOString(),
    };
    await prisma.job.update({
      where: { id },
      data: { checklist: JSON.stringify(nextChecklist) },
    });
  }

  return NextResponse.json({ success: true });
}

