export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";

export default async function CustomersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getCurrentUser } = await import("@/lib/auth");
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") redirect("/dashboard");
  return children;
}

