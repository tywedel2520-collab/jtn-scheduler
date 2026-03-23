export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { format } from "date-fns";

function parseChecklist(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      siteReady: Boolean(parsed.siteReady),
      materialsOnSite: Boolean(parsed.materialsOnSite),
      cleanupDone: Boolean(parsed.cleanupDone),
      queueOrder: typeof parsed.queueOrder === "number" ? parsed.queueOrder : null,
      estimatedTimeframe:
        typeof parsed.estimatedTimeframe === "string" ? parsed.estimatedTimeframe : null,
      progressState: typeof parsed.progressState === "string" ? parsed.progressState : null,
      lastUpdatedAt:
        typeof parsed.lastUpdatedAt === "string" ? parsed.lastUpdatedAt : null,
    };
  } catch {
    return {
      siteReady: false,
      materialsOnSite: false,
      cleanupDone: false,
      queueOrder: null as number | null,
      estimatedTimeframe: null as string | null,
      progressState: null as string | null,
      lastUpdatedAt: null as string | null,
    };
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: string;
      title: string;
      startDate: string;
      endDate: string;
      status: string;
      checklist: string;
      customerName: string;
    }>
  >(
    'SELECT j."id", j."title", j."startDate", j."endDate", j."status", j."checklist", c."name" as "customerName" FROM "Job" j JOIN "Customer" c ON c."id" = j."customerId" WHERE j."shareToken" = ? LIMIT 1',
    token
  );

  const job = rows[0];

  if (!job) {
    return NextResponse.json({ error: "Link expired" }, { status: 404 });
  }

  const checklist = parseChecklist(job.checklist);
  const keys: Array<keyof typeof checklist> = ["siteReady", "materialsOnSite", "cleanupDone"];
  const doneCount = keys.reduce((acc, k) => acc + (checklist[k] ? 1 : 0), 0);
  const percentComplete = Math.round((doneCount / keys.length) * 100);

  const queueRows = await prisma.$queryRawUnsafe<
    Array<{ id: string; status: string; startDate: string; checklist: string }>
  >(
    'SELECT "id", "status", "startDate", "checklist" FROM "Job"'
  );
  const activeQueue = queueRows
    .filter((r) => r.status !== "completed" && r.status !== "cancelled")
    .map((r) => {
      const c = parseChecklist(r.checklist);
      return {
        id: r.id,
        queueOrder: typeof c.queueOrder === "number" ? c.queueOrder : null,
        startDate: new Date(r.startDate).getTime(),
      };
    })
    .sort((a, b) => {
      const aHasManual = typeof a.queueOrder === "number";
      const bHasManual = typeof b.queueOrder === "number";
      if (aHasManual && bHasManual) return (a.queueOrder as number) - (b.queueOrder as number);
      if (aHasManual && !bHasManual) return -1;
      if (!aHasManual && bHasManual) return 1;
      return a.startDate - b.startDate;
    });
  const placeInLine = Math.max(1, activeQueue.findIndex((q) => q.id === job.id) + 1);
  const aheadCount = Math.max(0, placeInLine - 1);

  return NextResponse.json({
    customerName: job.customerName,
    title: job.title,
    placeInLine,
    aheadCount,
    schedule: {
      start: format(new Date(job.startDate), "MMM d, yyyy h:mm a"),
      end: format(new Date(job.endDate), "h:mm a"),
    },
    status: job.status,
    percentComplete,
    progressState: checklist.progressState || `${percentComplete}% complete`,
    checklistProgress: `${doneCount}/${keys.length}`,
    estimatedTimeframe: checklist.estimatedTimeframe,
    lastUpdatedAt: checklist.lastUpdatedAt
      ? format(new Date(checklist.lastUpdatedAt), "MMM d, yyyy h:mm a")
      : null,
  });
}
