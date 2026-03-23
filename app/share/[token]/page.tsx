import { prisma } from "@/lib/db";
import { format } from "date-fns";

type Props = { params: Promise<{ token: string }> };

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

const CHECKLIST_ORDER: Array<keyof ReturnType<typeof parseChecklist>> = [
  "siteReady",
  "materialsOnSite",
  "cleanupDone",
];

export default async function SharePage({ params }: Props) {
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
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-10 sm:py-14">
        <div className="mx-auto w-full max-w-xl">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
            <h1 className="text-2xl font-semibold text-stone-900">Access denied</h1>
            <p className="mt-2 text-sm text-stone-600">
              This link is invalid or has expired.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const checklist = parseChecklist(job.checklist);
  const doneCount = CHECKLIST_ORDER.reduce((acc, k) => acc + (checklist[k] ? 1 : 0), 0);
  const percentComplete = Math.round((doneCount / CHECKLIST_ORDER.length) * 100);
  const progressLabel = checklist.progressState || `${percentComplete}% complete`;

  const queueRows = await prisma.$queryRawUnsafe<
    Array<{ id: string; status: string; startDate: string; checklist: string }>
  >('SELECT "id", "status", "startDate", "checklist" FROM "Job"');

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

  const placeInLine = Math.max(
    1,
    activeQueue.findIndex((item) => item.id === job.id) + 1
  );
  const aheadCount = Math.max(0, placeInLine - 1);
  const aheadMessage =
    aheadCount === 0
      ? "You are next in line."
      : `There ${aheadCount === 1 ? "is" : "are"} ${aheadCount} ${
          aheadCount === 1 ? "job" : "jobs"
        } ahead of you.`;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-orange-600 text-white text-xs font-bold">
              JTN
            </span>
            <span className="text-sm font-semibold tracking-tight text-stone-900">
              JTN Scheduler
            </span>
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Queue update</p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900 sm:text-3xl">
            {job.title}
          </h1>
          <p className="mt-1 text-sm text-stone-600">Customer: {job.customerName}</p>
          <p className="mt-2 text-sm font-medium text-stone-700">{aheadMessage}</p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Current place in line</p>
              <p className="mt-2 text-sm font-medium text-stone-800">#{placeInLine}</p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Ahead of you</p>
              <p className="mt-2 text-sm font-medium text-stone-800">{aheadCount}</p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Date & time</p>
              <p className="mt-2 text-sm font-medium text-stone-800">
                {format(new Date(job.startDate), "EEE, MMM d, yyyy")}
              </p>
              <p className="text-sm text-stone-600">
                {format(new Date(job.startDate), "h:mm a")} - {format(new Date(job.endDate), "h:mm a")}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Status</p>
              <p className="mt-2 text-sm font-medium text-stone-800">{job.status.replace("-", " ")}</p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 sm:col-span-2">
              <div className="flex items-end justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                  Percent complete
                </p>
                <p className="text-sm font-semibold text-stone-800">{percentComplete}%</p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-200">
                <div className="h-2 rounded-full bg-orange-600" style={{ width: `${percentComplete}%` }} />
              </div>
              <p className="mt-2 text-xs text-stone-600">
                Checklist progress: {doneCount}/{CHECKLIST_ORDER.length}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Progress state</p>
              <p className="mt-2 text-sm font-medium text-stone-800">{progressLabel}</p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Estimated timeframe</p>
              <p className="mt-2 text-sm font-medium text-stone-800">
                {checklist.estimatedTimeframe || "To be confirmed"}
              </p>
            </div>

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Last updated</p>
              <p className="mt-2 text-sm font-medium text-stone-800">
                {checklist.lastUpdatedAt
                  ? format(new Date(checklist.lastUpdatedAt), "MMM d, yyyy h:mm a")
                  : "Recently"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
