"use client";

import { useEffect, useState } from "react";
import { Plus, Mail, Phone, MapPin } from "lucide-react";
import CustomerModal from "@/components/CustomerModal";

type Customer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchCustomers() {
    const res = await fetch("/api/customers");
    if (res.ok) setCustomers(await res.json());
  }

  useEffect(() => {
    fetchCustomers().finally(() => setLoading(false));
  }, []);

  async function handleSave(data: { name: string; email?: string; phone?: string; address?: string }) {
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await fetchCustomers();
      setShowModal(false);
    }
    return res.ok;
  }

  async function handleUpdate(
    id: string,
    data: { name: string; email?: string; phone?: string; address?: string }
  ) {
    const res = await fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      await fetchCustomers();
      setEditingCustomer(null);
    }
    return res.ok;
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this customer and their jobs?")) return;
    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    if (res.ok) await fetchCustomers();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-pulse text-stone-500">Loading customers...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Customers</h1>
          <p className="text-stone-500">Manage customer info</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 text-white font-medium hover:bg-amber-700 transition"
        >
          <Plus size={18} />
          Add Customer
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {customers.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-stone-800">{c.name}</h3>
            </div>
            {c.email && (
              <div className="flex items-center gap-2 mt-2 text-sm text-stone-600">
                <Mail size={14} />
                <a href={`mailto:${c.email}`} className="hover:text-amber-600">
                  {c.email}
                </a>
              </div>
            )}
            {c.phone && (
              <div className="flex items-center gap-2 mt-1 text-sm text-stone-600">
                <Phone size={14} />
                <a href={`tel:${c.phone}`} className="hover:text-amber-600">
                  {c.phone}
                </a>
              </div>
            )}
            {c.address && (
              <div className="flex items-center gap-2 mt-1 text-sm text-stone-600">
                <MapPin size={14} />
                <span>{c.address}</span>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setEditingCustomer(c)}
                className="flex-1 py-2 rounded-lg border border-stone-200 text-sm font-medium hover:bg-stone-50"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="py-2 px-4 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {customers.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-stone-200 p-12 text-center">
          <p className="text-stone-500 mb-4">No customers yet</p>
          <button
            onClick={() => setShowModal(true)}
            className="text-amber-600 font-medium hover:underline"
          >
            Add your first customer
          </button>
        </div>
      )}

      {showModal && (
        <CustomerModal
          mode="create"
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}

      {editingCustomer && (
        <CustomerModal
          mode="edit"
          customer={editingCustomer}
          onUpdate={handleUpdate}
          onClose={() => setEditingCustomer(null)}
        />
      )}
    </div>
  );
}
