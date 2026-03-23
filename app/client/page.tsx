export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { format } from "date-fns";
import BrandMark from "@/components/BrandMark";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import AutoRefresh from "@/components/AutoRefresh";

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
      lastUpdatedAt: typeof parsed.lastUpdatedAt === "string" ? parsed.lastUpdatedAt : null,
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

export default async function ClientPage() {
  const { getCurrentUser } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/db");
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role === "admin") redirect("/dashboard");
  if (!user.customerId) redirect("/");

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
    'SELECT j."id", j."title", j."startDate", j."endDate", j."status", j."checklist", c."name" as "customerName" FROM "Job" j JOIN "Customer" c ON c."id" = j."customerId" WHERE j."customerId" = ? ORDER BY j."startDate" ASC LIMIT 1',
    user.customerId
  );

  const job = rows[0];
  if (!job) {
    return (
      <main className="min-h-screen bg-stone-50 px-4 py-8 sm:py-12">
        <div className="mx-auto w-full max-w-2xl">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <BrandMark compact />
              <SignOutButton
                className="px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 hover:bg-stone-50 transition"
                label="Switch Account"
              />
            </div>
            <h1 className="text-2xl font-semibold text-stone-900 mt-3">Queue item not assigned yet</h1>
            <p className="text-sm text-stone-600 mt-2">
              Thanks for creating your account. Your queue item has not been assigned yet.
              Please check back soon.
            </p>
            <Link
              href="/admin-login"
              className="inline-block mt-4 text-sm text-stone-500 hover:text-stone-700"
            >
              Admin access
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const checklist = parseChecklist(job.checklist);
  const doneCount = [checklist.siteReady, checklist.materialsOnSite, checklist.cleanupDone].filter(Boolean).length;
  const percentComplete = Math.round((doneCount / 3) * 100);

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
  const placeInLine = Math.max(1, activeQueue.findIndex((x) => x.id === job.id) + 1);
  const aheadCount = Math.max(0, placeInLine - 1);
  const aheadMessage =
    aheadCount === 0
      ? "You are next in line."
      : `There ${aheadCount === 1 ? "is" : "are"} ${aheadCount} ${
          aheadCount === 1 ? "job" : "jobs"
        } ahead of you.`;

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 sm:py-12">
      <AutoRefresh intervalMs={30000} />
      <div className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="inline-flex items-center gap-2">
              <BrandMark compact />
            </div>
            <SignOutButton
              className="px-3 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 hover:bg-stone-50 transition"
              label="Switch Account"
            />
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Queue update</p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900 sm:text-3xl">{job.title}</h1>
          <p className="mt-1 text-sm text-stone-600">Customer: {job.customerName}</p>
          <p className="mt-2 text-sm font-medium text-stone-700">{aheadMessage}</p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard label="Current place in line" value={`#${placeInLine}`} />
            <InfoCard label="Ahead of you" value={`${aheadCount}`} />
            <InfoCard
              label="Date & time"
              value={`${format(new Date(job.startDate), "EEE, MMM d, yyyy")} • ${format(
                new Date(job.startDate),
                "h:mm a"
              )} - ${format(new Date(job.endDate), "h:mm a")}`}
            />
            <InfoCard label="Status" value={job.status.replace("-", " ")} />

            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 sm:col-span-2">
              <div className="flex items-end justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Percent complete</p>
                <p className="text-sm font-semibold text-stone-800">{percentComplete}%</p>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-stone-200">
                <div className="h-2 rounded-full bg-orange-600" style={{ width: `${percentComplete}%` }} />
              </div>
            </div>
            <InfoCard
              label="Progress state"
              value={checklist.progressState || `${percentComplete}% complete`}
              full
            />
            <InfoCard
              label="Estimated timeframe"
              value={checklist.estimatedTimeframe || "To be confirmed"}
              full
            />
            <InfoCard
              label="Last updated"
              value={
                checklist.lastUpdatedAt
                  ? format(new Date(checklist.lastUpdatedAt), "MMM d, yyyy h:mm a")
                  : "Recently"
              }
              full
            />
          </div>
          <div className="mt-4">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-sm text-stone-500 hover:text-stone-700"
              >
                Sign In
              </Link>
              <Link
                href="/admin-login"
                className="text-sm text-stone-500 hover:text-stone-700"
              >
                Admin access
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoCard({
  label,
  value,
  full = false,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-stone-50 p-4 ${full ? "sm:col-span-2" : ""}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-stone-800">{value}</p>
    </div>
  );
}

