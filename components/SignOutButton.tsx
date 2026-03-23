"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignOutButton({
  className,
  redirectTo = "/",
  label = "Sign Out",
}: {
  className?: string;
  redirectTo?: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push(redirectTo);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      className={className}
    >
      {loading ? "Signing out..." : label}
    </button>
  );
}

