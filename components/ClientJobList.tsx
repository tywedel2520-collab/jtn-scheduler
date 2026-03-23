"use client";

import { format } from "date-fns";
import { Calendar, Clock } from "lucide-react";

type Job = {
  id: string;
  title: string;
  description: string | null;
  startDate: string | Date;
  endDate: string | Date;
  status: string;
};

export default function ClientJobList({ jobs }: { jobs: Job[] }) {
  const statusColors: Record<string, string> = {
    scheduled: "bg-amber-100 text-amber-800",
    "in-progress": "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-stone-100 text-stone-600",
  };

  if (jobs.length === 0) {
    return (
      <p className="mt-6 text-stone-500">No jobs scheduled yet.</p>
    );
  }

  return (
    <ul className="mt-6 space-y-4">
      {jobs.map((job) => {
        const start = job.startDate instanceof Date ? job.startDate : new Date(job.startDate);
        const end = job.endDate instanceof Date ? job.endDate : new Date(job.endDate);
        return (
          <li
            key={job.id}
            className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-stone-800">{job.title}</h3>
                {job.description && (
                  <p className="mt-1 text-sm text-stone-600">{job.description}</p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                  statusColors[job.status] || "bg-stone-100 text-stone-600"
                }`}
              >
                {job.status.replace("-", " ")}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-stone-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={16} />
                {format(start, "MMM d, yyyy")}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={16} />
                {format(start, "h:mm a")} – {format(end, "h:mm a")}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
