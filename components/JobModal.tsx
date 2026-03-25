"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { X } from "lucide-react";

function toLocalDatetimeString(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

type Checklist = {
  siteReady?: boolean;
  materialsOnSite?: boolean;
  cleanupDone?: boolean;
  [key: string]: unknown;
};

type CustomerLite = { id: string; name: string };

type Job = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: string;
  checklist: Checklist;
  customer: CustomerLite;
  shareToken?: string | null;
  queueOrder?: number | null;
  estimatedTimeframe?: string | null;
  progressState?: string | null;
  lastUpdatedBy?: string | null;
  lastUpdatedAt?: string | null;
};

type BaseProps = {
  role: "admin";
  customers: CustomerLite[];
  // Keep job on the shared shape so props.job access remains valid across the component.
  job?: Job;
};

type Props =
  | {
      role: BaseProps["role"];
      customers: BaseProps["customers"];
      job?: BaseProps["job"];
      mode: "create";
      initial: { start: Date; end: Date };
      onSave: (data: {
        title: string;
        description?: string;
        startDate: Date;
        endDate: Date;
        customerId: string;
        status?: string;
        checklist?: Checklist;
        estimatedTimeframe?: string;
        progressState?: string;
      }) => Promise<boolean>;
      onClose: () => void;
    }
  | {
      role: BaseProps["role"];
      customers: BaseProps["customers"];
      job: Job;
      mode: "edit";
      onUpdate: (
        id: string,
        data: Partial<{
          title: string;
          description: string;
          startDate: Date;
          endDate: Date;
          customerId: string;
          status: string;
          checklist: Checklist;
          estimatedTimeframe: string;
          progressState: string;
        }>
      ) => Promise<boolean>;
      onDelete: (id: string) => Promise<boolean>;
      onClose: () => void;
    };

function getBool(checklist: Checklist | undefined, key: keyof Checklist): boolean {
  return Boolean(checklist && checklist[key]);
}

function normalizeCustomerName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export default function JobModal(props: Props) {
  const { mode, onClose } = props;
  const role = props.role;
  const isAdmin = role === "admin";

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState(
    mode === "edit" ? props.job.title : ""
  );
  const [description, setDescription] = useState(
    mode === "edit" ? props.job.description || "" : ""
  );

  const [startDate, setStartDate] = useState(
    mode === "edit"
      ? toLocalDatetimeString(new Date(props.job.startDate))
      : toLocalDatetimeString(props.initial.start)
  );
  const [endDate, setEndDate] = useState(
    mode === "edit"
      ? toLocalDatetimeString(new Date(props.job.endDate))
      : toLocalDatetimeString(props.initial.end)
  );

  const [customerId, setCustomerId] = useState(
    mode === "edit" ? props.job.customer.id : props.customers[0]?.id || ""
  );
  const [customerQuery, setCustomerQuery] = useState(
    mode === "edit" ? props.job.customer.name : ""
  );
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");

  const [status, setStatus] = useState(mode === "edit" ? props.job.status : "scheduled");
  const [estimatedTimeframe, setEstimatedTimeframe] = useState(
    mode === "edit" ? props.job.estimatedTimeframe || "" : ""
  );
  const [progressState, setProgressState] = useState(
    mode === "edit" ? props.job.progressState || "" : ""
  );

  const [checklist, setChecklist] = useState<Checklist>(() => {
    const initial =
      mode === "edit"
        ? props.job.checklist
        : {
            siteReady: false,
            materialsOnSite: false,
            cleanupDone: false,
          };
    return {
      siteReady: getBool(initial, "siteReady"),
      materialsOnSite: getBool(initial, "materialsOnSite"),
      cleanupDone: getBool(initial, "cleanupDone"),
    };
  });

  const [shareTokenState, setShareTokenState] = useState<string | null>(() => {
    if (mode === "edit" && isAdmin) return props.job.shareToken ?? null;
    return null;
  });

  useEffect(() => {
    // Even if the current Prisma client doesn't include the new shareToken field (schema sync issues),
    // we can always fetch the active token from the server endpoint.
    if (mode !== "edit" || !isAdmin) return;
    async function loadShareToken() {
      const res = await fetch(`/api/jobs/${props.job?.id}/share`);
      if (!res.ok) return;
      const data = (await res.json().catch(() => ({}))) as { shareToken?: string | null };
      if (data.shareToken !== undefined) setShareTokenState(data.shareToken);
    }
    loadShareToken();
  }, [mode, isAdmin, props]);

  const filteredCustomers = useMemo(() => {
    if (mode !== "create") return props.customers;
    const q = normalizeCustomerName(customerQuery);
    if (!q) return props.customers.slice(0, 8);
    return props.customers
      .filter((c) => normalizeCustomerName(c.name).includes(q))
      .slice(0, 8);
  }, [mode, props.customers, customerQuery]);

  const hasExactCustomerMatch = useMemo(() => {
    const q = normalizeCustomerName(customerQuery);
    if (!q) return false;
    return props.customers.some((c) => normalizeCustomerName(c.name) === q);
  }, [props.customers, customerQuery]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (mode === "create") {
        let resolvedCustomerId = customerId;
        const trimmedQuery = customerQuery.trim();
        if (!resolvedCustomerId && !trimmedQuery) {
          setError("Please select or enter a customer.");
          return;
        }
        if (!resolvedCustomerId && trimmedQuery) {
          const createRes = await fetch("/api/customers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: trimmedQuery,
              email: newCustomerEmail || undefined,
              phone: newCustomerPhone || undefined,
            }),
          });
          const createdCustomer = await createRes.json().catch(() => null);
          if (!createRes.ok || !createdCustomer?.id) {
            setError(
              createdCustomer?.error ||
                "Could not create customer. Please check the customer details."
            );
            return;
          }
          resolvedCustomerId = createdCustomer.id;
        }

        const ok = await props.onSave({
          title,
          description,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          customerId: resolvedCustomerId,
          status: status || "scheduled",
          checklist: {
            ...checklist,
            estimatedTimeframe: estimatedTimeframe || null,
            progressState: progressState || null,
          },
          estimatedTimeframe: estimatedTimeframe || undefined,
          progressState: progressState || undefined,
        });
        if (ok) onClose();
        else setError("Failed to create job. Please try again.");
        return;
      }

      // Edit
      const ok = await props.onUpdate(props.job.id, {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        customerId,
        status,
        checklist: {
          ...checklist,
          estimatedTimeframe: estimatedTimeframe || null,
          progressState: progressState || null,
        },
        estimatedTimeframe,
        progressState,
      });
      if (ok) onClose();
      else setError("Failed to save changes. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (mode !== "edit" || !isAdmin) return;
    if (!confirm("Delete this job?")) return;
    setSaving(true);
    try {
      await props.onDelete(props.job.id);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleShareAction(action: "generate" | "regenerate") {
    if (mode !== "edit" || !isAdmin) return;
    setError("");
    const res = await fetch(`/api/jobs/${props.job.id}/share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to update client link.");
      return;
    }
    setShareTokenState(data.shareToken ?? null);
  }

  async function handleRevokeShare() {
    if (mode !== "edit" || !isAdmin) return;
    if (!confirm("Revoke this client link? The previous link will stop working.")) return;
    setError("");
    const res = await fetch(`/api/jobs/${props.job.id}/share`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || "Failed to revoke client link.");
      return;
    }
    setShareTokenState(null);
  }

  async function handleCopyShareLink() {
    if (!shareTokenState) return;
    const url = `${window.location.origin}/share/${shareTokenState}`;
    await navigator.clipboard.writeText(url);
  }

  const canSubmit =
    !saving &&
    (mode === "edit" || customerQuery.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="w-full max-w-md max-w-full rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "New Job" : "Edit Job"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-stone-100 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-2 sm:p-4 space-y-4">
          {mode === "edit" && isAdmin && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Last updated
              </p>
              <p className="mt-1 text-sm text-stone-700">
                {props.job.lastUpdatedBy || "Unknown"}{" "}
                {props.job.lastUpdatedAt
                  ? `on ${format(new Date(props.job.lastUpdatedAt), "MMM d, yyyy h:mm a")}`
                  : ""}
              </p>
            </div>
          )}

          {isAdmin && (
            <>
              {mode === "create" || mode === "edit" ? (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              ) : null}

              {mode === "edit" && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Customer</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    {props.customers.length === 0 ? (
                      <option value="">No customers available</option>
                    ) : (
                      props.customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {mode === "create" && (
                <div className="rounded-xl border border-stone-200 p-3">
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Customer
                  </label>
                  <input
                    type="text"
                    list="customer-suggestions"
                    value={customerQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCustomerQuery(value);
                      const match = props.customers.find(
                        (c) => normalizeCustomerName(c.name) === normalizeCustomerName(value)
                      );
                      setCustomerId(match?.id || "");
                    }}
                    placeholder="Search or type a new customer name"
                    required
                    className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                  <datalist id="customer-suggestions">
                    {props.customers.map((c) => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>

                  {customerQuery.trim().length > 0 && filteredCustomers.length > 0 && (
                    <div className="mt-2 max-h-36 overflow-auto rounded-lg border border-stone-200 bg-white">
                      {filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setCustomerId(c.id);
                            setCustomerQuery(c.name);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm hover:bg-stone-50 ${
                            customerId === c.id ? "bg-stone-100 font-medium" : ""
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {!hasExactCustomerMatch && customerQuery.trim().length > 0 && (
                    <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
                      <p className="text-xs font-medium text-orange-900">
                        New customer will be created: {customerQuery.trim()}
                      </p>
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="email"
                          value={newCustomerEmail}
                          onChange={(e) => setNewCustomerEmail(e.target.value)}
                          placeholder="Optional email"
                          className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                        <input
                          type="tel"
                          value={newCustomerPhone}
                          onChange={(e) => setNewCustomerPhone(e.target.value)}
                          placeholder="Optional phone"
                          className="w-full px-3 py-2 rounded-lg border border-stone-200 bg-white text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Internal notes (not shown to clients)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Job details, notes, special instructions..."
                  className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Estimated timeframe
                  </label>
                  <input
                    type="text"
                    value={estimatedTimeframe}
                    onChange={(e) => setEstimatedTimeframe(e.target.value)}
                    placeholder="e.g. 1-2 weeks"
                    className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Progress state
                  </label>
                  <input
                    type="text"
                    value={progressState}
                    onChange={(e) => setProgressState(e.target.value)}
                    placeholder="e.g. Waiting on parts"
                    className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Start</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">End</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none"
            >
              <option value="scheduled">Scheduled</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Checklist</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={Boolean(checklist.siteReady)}
                  onChange={(e) =>
                    setChecklist((prev) => ({ ...prev, siteReady: e.target.checked }))
                  }
                />
                Site ready
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={Boolean(checklist.materialsOnSite)}
                  onChange={(e) =>
                    setChecklist((prev) => ({ ...prev, materialsOnSite: e.target.checked }))
                  }
                />
                Materials on site
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={Boolean(checklist.cleanupDone)}
                  onChange={(e) =>
                    setChecklist((prev) => ({ ...prev, cleanupDone: e.target.checked }))
                  }
                />
                Cleanup done
              </label>
            </div>
          </div>

          {mode === "edit" && isAdmin && (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
              <p className="text-sm font-semibold text-stone-800">Client share link</p>
              {shareTokenState ? (
                <>
                  <p className="text-xs text-stone-600 mt-1 break-all">
                    {`${window.location.origin}/share/${shareTokenState}`}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className="flex-1 py-2 rounded-lg border border-stone-200 bg-white text-sm hover:bg-stone-50"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareAction("regenerate")}
                      className="flex-1 py-2 rounded-lg border border-stone-200 bg-white text-sm hover:bg-stone-50"
                    >
                      Regenerate
                    </button>
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={handleRevokeShare}
                      className="w-full py-2 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50"
                    >
                      Revoke link
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-2">
                  <p className="text-xs text-stone-600 mt-1">No active client link yet.</p>
                  <button
                    type="button"
                    onClick={() => handleShareAction("generate")}
                    className="mt-3 w-full py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700"
                  >
                    Generate link
                  </button>
                </div>
              )}
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full sm:flex-1 py-2.5 rounded-lg bg-amber-600 text-white font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : mode === "create" ? "Create" : "Save"}
            </button>

            {mode === "edit" && isAdmin && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-stone-200 hover:bg-stone-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
