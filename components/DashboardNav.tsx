"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Calendar, Users, LogOut } from "lucide-react";
import BrandMark from "./BrandMark";

export default function DashboardNav({ role }: { role: "admin" }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="bg-white border-b border-stone-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2">
        <BrandMark href="/dashboard" />
        <div className="flex items-center gap-1 overflow-x-auto">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
              pathname === "/dashboard"
                ? "bg-orange-100 text-orange-900"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <Calendar size={18} />
            Calendar
          </Link>
          {role === "admin" && (
            <Link
              href="/customers"
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                pathname === "/customers"
                  ? "bg-orange-100 text-orange-900"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              <Users size={18} />
              Customers
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:bg-stone-100 transition whitespace-nowrap"
            title="Sign out and switch account"
          >
            <LogOut size={18} />
            Switch Account
          </button>
        </div>
      </div>
    </nav>
  );
}
