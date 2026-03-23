import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const VALID_STATUSES = new Set(["scheduled", "in-progress", "completed", "cancelled"]);

function normalizeChecklist(raw: unknown) {
  const obj =
    typeof raw === "object" && raw && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.job.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const {
    title,
    description,
    startDate,
    endDate,
    customerId,
    status,
    checklist,
  } = body;

  if (status !== undefined && !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const currentChecklist = parseChecklist(existing.checklist);
  const nextChecklist = {
    ...currentChecklist,
    ...(checklist !== undefined ? normalizeChecklist(checklist) : {}),
    lastUpdatedBy: `${user.role}: ${user.name}`,
    lastUpdatedAt: new Date().toISOString(),
  };

  const updated = await prisma.job.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(startDate !== undefined ? { startDate: new Date(startDate) } : {}),
      ...(endDate !== undefined ? { endDate: new Date(endDate) } : {}),
      ...(customerId !== undefined ? { customerId } : {}),
      ...(status !== undefined && VALID_STATUSES.has(status) ? { status } : {}),
      checklist: JSON.stringify(nextChecklist),
    },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true, address: true } },
    },
  });
  const parsedChecklist = parseChecklist(updated.checklist);
  return NextResponse.json({
    ...updated,
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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  try {
    const job = await prisma.job.delete({ where: { id } });
    return NextResponse.json({ success: true, id: job.id });
  } catch {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
}
