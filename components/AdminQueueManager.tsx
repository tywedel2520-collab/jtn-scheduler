"use client";

import { useEffect, useMemo, useState } from "react";
import { GripVertical, Save } from "lucide-react";

type QueueJob = {
  id: string;
  title: string;
  customer: { name: string };
  status: string;
  queueOrder?: number | null;
};

export default function AdminQueueManager({
  jobs,
  onQueueSaved,
}: {
  jobs: QueueJob[];
  onQueueSaved: () => Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [localOrder, setLocalOrder] = useState<string[]>(
    () =>
      [...jobs]
        .sort((a, b) => (a.queueOrder ?? Number.MAX_SAFE_INTEGER) - (b.queueOrder ?? Number.MAX_SAFE_INTEGER))
        .map((j) => j.id)
  );

  const idToJob = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs]);
  const orderedJobs = localOrder.map((id) => idToJob.get(id)).filter(Boolean) as QueueJob[];

  useEffect(() => {
    setLocalOrder(
      [...jobs]
        .sort((a, b) => (a.queueOrder ?? Number.MAX_SAFE_INTEGER) - (b.queueOrder ?? Number.MAX_SAFE_INTEGER))
        .map((j) => j.id)
    );
  }, [jobs]);

  function moveToPosition(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;
    const next = [...localOrder];
    const from = next.indexOf(sourceId);
    const to = next.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setLocalOrder(next);
  }

  async function saveQueue() {
    setWorking(true);
    setError("");
    try {
      const res = await fetch("/api/jobs/queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedJobIds: localOrder }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to save queue");
        return;
      }
      await onQueueSaved();
    } finally {
      setWorking(false);
    }
  }

  if (jobs.length === 0) return null;

  return (
    <section className="mb-5 rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">Client Queue</h2>
          <p className="text-xs text-stone-500">Reorder jobs to update client line positions.</p>
        </div>
        <button
          type="button"
          onClick={saveQueue}
          disabled={working}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
        >
          <Save size={16} />
          Save Queue
        </button>
      </div>

      <div className="space-y-2">
        {orderedJobs.map((job, index) => (
          <div
            key={job.id}
            draggable
            onDragStart={() => setDraggingId(job.id)}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (!draggingId) return;
              moveToPosition(draggingId, job.id);
              setDraggingId(null);
            }}
            className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${
              draggingId === job.id
                ? "border-amber-300 bg-amber-50"
                : "border-stone-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <GripVertical size={16} className="text-stone-400 shrink-0" />
              <div>
              <p className="text-sm font-medium text-stone-800">
                #{index + 1} {job.title}
              </p>
              <p className="text-xs text-stone-500">
                {job.customer.name} • {job.status.replace("-", " ")}
              </p>
              </div>
            </div>
            <span className="text-xs text-stone-500">Drag to reorder</span>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}
    </section>
  );
}

