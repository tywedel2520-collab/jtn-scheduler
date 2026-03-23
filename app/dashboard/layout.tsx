import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardNav from "@/components/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.role === "client") redirect("/client");
  if (user.role !== "admin") redirect("/");
  return (
    <>
      <DashboardNav role="admin" />
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </>
  );
}
