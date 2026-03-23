import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const VALID_STATUSES = new Set(["scheduled", "in-progress", "completed", "cancelled"]);

function normalizeChecklist(raw: unknown) {
  const obj = typeof raw === "object" && raw && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
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
}

function parseChecklist(raw: string) {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return normalizeChecklist(parsed);
  } catch {
    return normalizeChecklist({});
  }
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const jobs = await prisma.job.findMany({
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true, address: true } },
    },
  });

  return NextResponse.json(
    jobs.map((job) => {
      const parsedChecklist = parseChecklist(job.checklist);
      const payload: any = {
        ...job,
        checklist: {
          siteReady: parsedChecklist.siteReady,
          materialsOnSite: parsedChecklist.materialsOnSite,
          cleanupDone: parsedChecklist.cleanupDone,
        },
        queueOrder: parsedChecklist.queueOrder,
        estimatedTimeframe: parsedChecklist.estimatedTimeframe,
        progressState: parsedChecklist.progressState,
        lastUpdatedBy: parsedChecklist.lastUpdatedBy,
        lastUpdatedAt: parsedChecklist.lastUpdatedAt,
      };
      return payload;
    })
  );
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { title, description, startDate, endDate, customerId, status, checklist } = body;

  if (!title || !startDate || !endDate || !customerId) {
    return NextResponse.json(
      { error: "Title, start/end date, and customer are required" },
      { status: 400 }
    );
  }

  if (status !== undefined && !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const existingJobs = await prisma.job.findMany({
    select: { checklist: true },
  });
  const maxQueueOrder = existingJobs.reduce((max, item) => {
    const parsed = parseChecklist(item.checklist);
    const q = typeof parsed.queueOrder === "number" ? parsed.queueOrder : 0;
    return Math.max(max, q);
  }, 0);

  const job = await prisma.job.create({
    data: {
      title,
      description: description || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      customerId,
      status: status || "scheduled",
      checklist: JSON.stringify({
        ...normalizeChecklist(checklist),
        queueOrder: maxQueueOrder + 1,
        lastUpdatedBy: `${user.role}: ${user.name}`,
        lastUpdatedAt: new Date().toISOString(),
      }),
    },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true, address: true } },
    },
  });

  const parsedChecklist = parseChecklist(job.checklist);
  return NextResponse.json({
    ...job,
    checklist: {
      siteReady: parsedChecklist.siteReady,
      materialsOnSite: parsedChecklist.materialsOnSite,
      cleanupDone: parsedChecklist.cleanupDone,
    },
    queueOrder: parsedChecklist.queueOrder,
    estimatedTimeframe: parsedChecklist.estimatedTimeframe,
    progressState: parsedChecklist.progressState,
    lastUpdatedBy: parsedChecklist.lastUpdatedBy,
    lastUpdatedAt: parsedChecklist.lastUpdatedAt,
  });
}
