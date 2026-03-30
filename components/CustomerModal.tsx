"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useEffect } from "react";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type Props =
  | {
      mode: "create";
      onSave: (data: {
        name: string;
        email?: string;
        phone?: string;
        address?: string;
      }) => Promise<boolean>;
      onClose: () => void;
    }
  | {
      mode: "edit";
      customer: Customer;
      onUpdate: (
        id: string,
        data: { name: string; email?: string; phone?: string; address?: string }
      ) => Promise<boolean>;
      onClose: () => void;
    };

export default function CustomerModal(props: Props) {
  const { mode, onClose } = props;
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(mode === "edit" ? props.customer.name : "");
  const [email, setEmail] = useState(
    mode === "edit" ? props.customer.email || "" : ""
  );
  const [phone, setPhone] = useState(
    mode === "edit" ? props.customer.phone || "" : ""
  );
  const [address, setAddress] = useState(
    mode === "edit" ? props.customer.address || "" : ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    let ok = false;
    if (mode === "create") {
      ok = await props.onSave({ name, email: email || undefined, phone: phone || undefined, address: address || undefined });
    } else {
      ok = await props.onUpdate(props.customer.id, {
        name,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
      });
    }
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 p-2 sm:p-4">
      <div className="mx-auto h-[calc(100dvh-1rem)] sm:h-auto sm:max-h-[calc(100dvh-2rem)] w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col overflow-hidden">
        <div className="sticky top-0 z-10 bg-white border-b border-stone-200">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-lg font-semibold">
              {mode === "create" ? "Add Customer" : "Edit Customer"}
            </h2>
            <button
              onClick={onClose}
              className="p-3 -mr-2 rounded-xl hover:bg-stone-100 transition"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 rounded-lg border border-stone-200 focus:ring-2 focus:ring-amber-500 outline-none"
            />
          </div>
          <div className="sticky bottom-0 bg-white border-t border-stone-200 px-3 sm:px-4 py-3">
            <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:flex-1 py-3 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : mode === "create" ? "Create" : "Save"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-3 rounded-xl border border-stone-200 hover:bg-stone-50"
            >
              Cancel
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
