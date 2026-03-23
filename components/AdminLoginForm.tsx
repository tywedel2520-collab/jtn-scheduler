"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrandMark from "./BrandMark";
import SignOutButton from "./SignOutButton";

export default function AdminLoginForm({
  currentRole,
}: {
  currentRole?: "client" | "admin" | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      if (data.role !== "admin") {
        setError("Admin credentials are required for this page.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-lg border border-stone-200">
      <div className="mb-4">
        <BrandMark compact />
        <h1 className="text-2xl font-bold text-stone-900 mt-2">Admin Sign In</h1>
        <p className="text-stone-500 text-sm mt-1">Use internal admin credentials</p>
      </div>

      {currentRole === "client" && (
        <div className="mb-4 text-xs text-stone-600 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
          <p>You are currently signed in as a client.</p>
          <p className="mt-1">Sign in below with admin credentials, or switch accounts first.</p>
          <div className="mt-2">
            <SignOutButton
              className="px-3 py-1.5 rounded-md border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 transition"
              label="Switch Account"
            />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-stone-700 mb-1">
            Admin Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition"
          />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-orange-600 text-white font-medium hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in..." : "Sign In as Admin"}
        </button>
        <Link
          href="/"
          className="block w-full text-center py-3 rounded-xl border border-stone-200 text-stone-700 font-medium hover:bg-stone-50 transition"
        >
          Back to Sign In
        </Link>
      </form>
    </div>
  );
}

