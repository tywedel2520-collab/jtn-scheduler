"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addHours } from "date-fns";
import { enUS } from "date-fns/locale";
import { Plus } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import JobModal from "./JobModal";
import AdminQueueManager from "./AdminQueueManager";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales: { "en-US": enUS },
});

type Job = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: string;
  checklist: Record<string, unknown>;
  customerId: string;
  shareToken?: string | null;
  queueOrder?: number | null;
  estimatedTimeframe?: string | null;
  progressState?: string | null;
  lastUpdatedBy?: string | null;
  lastUpdatedAt?: string | null;
  customer: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
  };
};

type CustomerLite = {
  id: string;
  name: string;
};

export default function JobCalendar() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    const res = await fetch("/api/jobs");
    if (res.ok) setJobs(await res.json());
  }, []);

  const fetchAdminData = useCallback(async () => {
    const customersRes = await fetch("/api/customers");

    if (customersRes.ok) {
      const data = await customersRes.json();
      setCustomers(
        data.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))
      );
    }
  }, []);

  useEffect(() => {
    async function load() {
      const jobsRes = await fetch("/api/jobs");
      if (jobsRes.ok) setJobs(await jobsRes.json());

      await fetchAdminData();
      setLoading(false);
    }
    load();
  }, [fetchAdminData]);

  const events = useMemo(
    () =>
      jobs.map((j) => ({
        ...j,
        title: `${j.title} — ${j.customer.name}`,
        start: new Date(j.startDate),
        end: new Date(j.endDate),
      })),
    [jobs]
  );

  async function handleSaveJob(data: {
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    customerId: string;
    status?: string;
    checklist?: Record<string, unknown>;
    estimatedTimeframe?: string;
    progressState?: string;
  }) {
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        startDate: data.startDate.toISOString(),
        endDate: data.endDate.toISOString(),
      }),
    });
    if (res.ok) {
      await fetchJobs();
      setSelectedSlot(null);
    }
    return res.ok;
  }

  function openCreateModal(slot?: { start: Date; end: Date }) {
    if (slot) {
      let { start, end } = slot;
      if (end.getTime() <= start.getTime()) end = addHours(start, 1);
      setSelectedSlot({ start, end });
      return;
    }
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
    const end = addHours(start, 1);
    setSelectedSlot({ start, end });
  }

  async function handleUpdateJob(
    id: string,
    data: Partial<{
      title: string;
      description: string;
      startDate: Date;
      endDate: Date;
      status: string;
      customerId: string;
      checklist: Record<string, unknown>;
      estimatedTimeframe: string;
      progressState: string;
    }>
  ) {
    const payload: Record<string, unknown> = { ...data };
    if (data.startDate) payload.startDate = data.startDate.toISOString();
    if (data.endDate) payload.endDate = data.endDate.toISOString();
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      await fetchJobs();
      setSelectedEvent(null);
    }
    return res.ok;
  }

  async function handleDeleteJob(id: string) {
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchJobs();
      setSelectedEvent(null);
    }
    return res.ok;
  }

  if (loading) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="animate-pulse text-stone-500">Loading calendar...</div>
      </div>
    );
  }

  return (
    <>
      <AdminQueueManager jobs={jobs} onQueueSaved={fetchJobs} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
        <p className="text-stone-500">
          Click an event to edit queue, progress, customer, and share link.
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/customers"
            className="px-4 py-2 rounded-xl border border-stone-200 bg-white text-stone-700 font-medium hover:bg-stone-50 transition"
          >
            Manage Customers
          </Link>
          <button
            onClick={() => openCreateModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700 transition"
          >
            <Plus size={18} />
            Add Job
          </button>
        </div>
      </div>
      <div className="h-[600px] w-full max-w-full overflow-x-auto overflow-y-auto box-border rounded-xl border border-stone-200 bg-white p-2 sm:p-4 shadow-sm">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%", width: "100%" }}
          selectable
          onSelectSlot={(slot) => openCreateModal({ start: slot.start, end: slot.end })}
          onSelectEvent={(event) => setSelectedEvent(event as unknown as Job)}
        />
      </div>

      {selectedSlot && (
        <JobModal
          mode="create"
          role="admin"
          initial={{ start: selectedSlot.start, end: selectedSlot.end }}
          customers={customers}
          onSave={handleSaveJob}
          onClose={() => {
            setSelectedSlot(null);
          }}
        />
      )}

      {selectedEvent && (
        <JobModal
          mode="edit"
          role="admin"
          job={selectedEvent}
          customers={customers}
          onUpdate={handleUpdateJob}
          onDelete={handleDeleteJob}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </>
  );
}
