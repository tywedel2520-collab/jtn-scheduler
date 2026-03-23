export const dynamic = "force-dynamic";

import JobCalendar from "@/components/JobCalendar";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role !== "admin") redirect("/client");

  const [customerCount, jobCount] = await Promise.all([
    prisma.customer.count(),
    prisma.job.count(),
  ]);
  const showEmptyState = customerCount === 0 || jobCount === 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5 shadow-sm flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">JTN Scheduler</h1>
          <p className="text-stone-500 mt-1">
            Manage client queue, progress, customers, and secure client links.
          </p>
        </div>
        <Link
          href="/customers"
          className="px-4 py-2 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 font-medium hover:bg-stone-100 transition"
        >
          Customers
        </Link>
      </div>

      {showEmptyState && (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Welcome to JTN Scheduler</h2>
          <p className="mt-1 text-sm text-stone-600">
            {customerCount === 0 && jobCount === 0
              ? "No customers or jobs yet. Start by adding a customer, then create your first job."
              : customerCount === 0
              ? "No customers yet. Add a customer first, then create jobs from the calendar."
              : "No jobs yet. Create your first job from the calendar or by clicking a day."}
          </p>
          <div className="mt-3 text-sm text-stone-500">
            Current data: {customerCount} customer{customerCount === 1 ? "" : "s"} and {jobCount} job
            {jobCount === 1 ? "" : "s"}.
          </div>
        </div>
      )}

      <JobCalendar />
    </div>
  );
}
